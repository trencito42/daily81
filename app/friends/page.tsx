"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DoodleTabs } from "@/components/doodle/DoodleTabs";
import { DoodleButton } from "@/components/doodle/DoodleButton";
import { DoodleInput } from "@/components/doodle/DoodleInput";
import { DoodleBadge } from "@/components/doodle/DoodleBadge";
import { DoodleNotice } from "@/components/doodle/DoodleNotice";
import { DoodleEmptyState } from "@/components/doodle/DoodleEmptyState";
import { DoodleIcon } from "@/components/doodle/DoodleIcon";

interface FriendUser {
  id: string;
  username: string;
  displayName: string;
  level: number;
  xp: number;
  currentStreak: number;
  longestStreak: number;
  lastDailyDate: string | null;
}

interface FriendshipItem {
  friendshipId: string;
  createdAt: string;
  user: FriendUser;
}

interface FriendRequestItem {
  id: string;
  senderId: string;
  receiverId: string;
  status: string;
  createdAt: string;
  sender?: {
    id: string;
    username: string;
    displayName: string;
    level: number;
    xp: number;
    currentStreak: number;
  };
  receiver?: {
    id: string;
    username: string;
    displayName: string;
    level: number;
  };
}

interface ActivityItem {
  id: string;
  type: string;
  createdAt: string;
  user: {
    username: string;
    displayName: string;
    level: number;
  };
  metadata?: {
    difficulty?: string;
    elapsedSeconds?: number;
    newLevel?: number;
    streakDays?: number;
  };
}

interface SearchUserResult {
  id: string;
  username: string;
  displayName: string;
  level: number;
  currentStreak: number;
  isFriend: boolean;
  hasPendingRequest: boolean;
}

export default function FriendsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"friends" | "requests" | "find" | "activity">("friends");
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(true);

  const [friends, setFriends] = useState<FriendshipItem[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestItem[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequestItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // Search tab state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);

  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/friends");
      if (res.status === 401) {
        setAuthenticated(false);
        setLoading(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends || []);
        setIncomingRequests(data.incomingRequests || []);
        setOutgoingRequests(data.outgoingRequests || []);
        setActivities(data.activity || []);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Search users debounce
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/friends/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const json = await res.json();
          setSearchResults(json.users || []);
        }
      } catch {
        // Fallback
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSendRequest = async (targetUsernameOrId: string) => {
    setSearchFeedback(null);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: targetUsernameOrId }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.acceptedImmediately) {
          setSearchFeedback("You are now mutual friends!");
        } else {
          setSearchFeedback("Friend request sent.");
        }
        loadData();
      } else {
        setSearchFeedback(data.error || "Could not send request.");
      }
    } catch {
      setSearchFeedback("Network error. Try again.");
    }
  };

  const handleRespond = async (requestId: string, action: "accept" | "decline") => {
    try {
      const res = await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      if (res.ok) {
        setActionFeedback(action === "accept" ? "Friend request accepted." : "Friend request declined.");
        loadData();
      }
    } catch {
      setActionFeedback("Failed to update request.");
    }
  };

  const handleRemoveFriend = async (friendId: string, name: string) => {
    if (!confirm(`Remove ${name} from your friends?`)) return;
    try {
      const res = await fetch("/api/friends/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: friendId }),
      });
      if (res.ok) {
        setActionFeedback(`${name} removed.`);
        loadData();
      }
    } catch {
      setActionFeedback("Could not remove friend.");
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 172800) return "yesterday";
    return `${Math.floor(diff / 86400)}d ago`;
  };

  if (!authenticated) {
    return (
      <div
        style={{
          width: "100%",
          maxWidth: "var(--page-reading, 520px)",
          margin: "40px auto",
          padding: "0 16px",
          boxSizing: "border-box",
        }}
      >
        <DoodleEmptyState
          icon="friends"
          title="friends & challenges"
          description="Sign in or create a free account to challenge friends, compare solving times, and climb friend leaderboards."
          actionLabel="sign in to notebook →"
          actionHref="/login"
        />
      </div>
    );
  }

  const friendTabs = [
    { id: "friends", label: "friends", count: friends.length },
    {
      id: "requests",
      label: "requests",
      count: incomingRequests.length > 0 ? incomingRequests.length : undefined,
    },
    { id: "find", label: "find friends" },
    { id: "activity", label: "activity" },
  ];

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "var(--page-reading, 520px)",
        margin: "12px auto",
        padding: "16px 20px 48px",
        boxSizing: "border-box",
        fontFamily: "var(--font-doodle)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "16px",
        }}
      >
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 600,
            color: "var(--ink-primary)",
            margin: 0,
          }}
        >
          friends
        </h1>
        <Link
          href="/challenges"
          style={{
            fontSize: "13px",
            color: "var(--ink-secondary)",
            textDecoration: "none",
            borderBottom: "1px dashed var(--border-subtle)",
          }}
        >
          challenges →
        </Link>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: "16px" }}>
        <DoodleTabs
          tabs={friendTabs}
          activeTab={activeTab}
          size="sm"
          onChange={(id) => {
            setActiveTab(id as any);
            setActionFeedback(null);
          }}
        />
      </div>

      {/* Action feedback */}
      {actionFeedback && (
        <div style={{ marginBottom: "14px" }}>
          <DoodleNotice variant="info" onClose={() => setActionFeedback(null)}>
            {actionFeedback}
          </DoodleNotice>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--ink-secondary)" }}>
          <span style={{ fontSize: "15px" }}>opening friends notebook...</span>
        </div>
      ) : activeTab === "friends" ? (
        /* FRIENDS LIST */
        <div>
          {friends.length === 0 ? (
            <DoodleEmptyState
              icon="friends"
              title="no friends added yet"
              description="Connect with other solvers to share streaks, compare solving times, and send direct Sudoku challenges."
              actionLabel="find friends →"
              onAction={() => setActiveTab("find")}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {friends.map((item) => (
                <div
                  key={item.friendshipId}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 4px",
                    borderBottom: "1px dashed var(--border-subtle)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                    <Link
                      href={`/u/${item.user.username}`}
                      style={{
                        textDecoration: "none",
                        color: "var(--ink-primary)",
                        fontWeight: 600,
                        fontSize: "15px",
                      }}
                    >
                      {item.user.displayName}
                    </Link>
                    <DoodleBadge variant="muted" size="sm">
                      Lv. {item.user.level}
                    </DoodleBadge>
                    {item.user.currentStreak > 0 && (
                      <span
                        style={{
                          fontSize: "12px",
                          color: "var(--ink-secondary)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "2px",
                        }}
                      >
                        <DoodleIcon name="streak" size={12} />
                        {item.user.currentStreak}d
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <DoodleButton
                      size="sm"
                      variant="primary"
                      href={`/challenges?to=${encodeURIComponent(item.user.username)}`}
                      icon="swords"
                    >
                      challenge
                    </DoodleButton>
                    <DoodleButton
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveFriend(item.user.id, item.user.displayName)}
                      title="Remove friend"
                    >
                      ✕
                    </DoodleButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "requests" ? (
        /* REQUESTS TAB */
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Incoming */}
          <div>
            <h3
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--ink-secondary)",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              incoming ({incomingRequests.length})
            </h3>
            {incomingRequests.length === 0 ? (
              <p style={{ fontSize: "14px", color: "var(--ink-muted)", fontStyle: "italic" }}>
                no pending incoming requests.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {incomingRequests.map((req) => (
                  <div
                    key={req.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 4px",
                      borderBottom: "1px dashed var(--border-subtle)",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "15px" }}>
                        {req.sender?.displayName || "Player"}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>
                        Lv. {req.sender?.level} · {formatRelativeTime(req.createdAt)}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <DoodleButton
                        size="sm"
                        variant="primary"
                        onClick={() => handleRespond(req.id, "accept")}
                      >
                        accept
                      </DoodleButton>
                      <DoodleButton
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRespond(req.id, "decline")}
                      >
                        decline
                      </DoodleButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outgoing */}
          {outgoingRequests.length > 0 && (
            <div style={{ marginTop: "12px" }}>
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--ink-secondary)",
                  marginBottom: "8px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                sent ({outgoingRequests.length})
              </h3>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {outgoingRequests.map((req) => (
                  <div
                    key={req.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 4px",
                      borderBottom: "1px dashed var(--border-subtle)",
                      fontSize: "14px",
                    }}
                  >
                    <span>{req.receiver?.displayName || "Player"}</span>
                    <span style={{ fontSize: "12px", color: "var(--ink-muted)" }}>pending...</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : activeTab === "find" ? (
        /* FIND FRIENDS */
        <div>
          <DoodleInput
            placeholder="search by username or player name..."
            icon="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {searchFeedback && (
            <div style={{ marginTop: "10px" }}>
              <DoodleNotice variant="info">{searchFeedback}</DoodleNotice>
            </div>
          )}

          {searching ? (
            <div style={{ textAlign: "center", padding: "24px", color: "var(--ink-secondary)", fontSize: "14px" }}>
              searching notebook records...
            </div>
          ) : searchResults.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", marginTop: "12px" }}>
              {searchResults.map((u) => (
                <div
                  key={u.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 4px",
                    borderBottom: "1px dashed var(--border-subtle)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "15px" }}>{u.displayName}</div>
                    <div style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>
                      @{u.username} · Lv. {u.level}
                    </div>
                  </div>

                  <div>
                    {u.isFriend ? (
                      <DoodleBadge variant="success">friends</DoodleBadge>
                    ) : u.hasPendingRequest ? (
                      <DoodleBadge variant="muted">request sent</DoodleBadge>
                    ) : (
                      <DoodleButton
                        size="sm"
                        variant="primary"
                        onClick={() => handleSendRequest(u.username)}
                      >
                        add friend
                      </DoodleButton>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery.trim().length >= 2 ? (
            <p style={{ textAlign: "center", padding: "24px", color: "var(--ink-secondary)", fontSize: "14px" }}>
              no players found matching &ldquo;{searchQuery}&rdquo;.
            </p>
          ) : null}
        </div>
      ) : (
        /* ACTIVITY FEED */
        <div>
          {activities.length === 0 ? (
            <DoodleEmptyState
              icon="clock"
              title="no recent activity"
              description="When your friends solve daily puzzles, level up, or complete challenges, their notes will appear here."
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {activities.map((act) => (
                <div
                  key={act.id}
                  style={{
                    padding: "10px 4px",
                    borderBottom: "1px dashed var(--border-subtle)",
                    fontSize: "14px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <Link
                      href={`/u/${act.user.username}`}
                      style={{
                        textDecoration: "none",
                        color: "var(--ink-primary)",
                        fontWeight: 600,
                      }}
                    >
                      {act.user.displayName}
                    </Link>
                    <span style={{ fontSize: "11px", color: "var(--ink-secondary)" }}>
                      {formatRelativeTime(act.createdAt)}
                    </span>
                  </div>
                  <div style={{ color: "var(--ink-secondary)", marginTop: "2px", fontSize: "13px" }}>
                    {act.type === "daily_completed" && (
                      <span>
                        solved daily Sudoku in {act.metadata?.elapsedSeconds ? `${Math.floor(act.metadata.elapsedSeconds / 60)}m ${act.metadata.elapsedSeconds % 60}s` : "good time"}
                      </span>
                    )}
                    {act.type === "level_up" && (
                      <span style={{ color: "var(--ink-primary)", fontWeight: 600 }}>
                        reached Level {act.metadata?.newLevel}!
                      </span>
                    )}
                    {act.type === "streak_milestone" && (
                      <span>
                        reached a {act.metadata?.streakDays}-day streak milestone!
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
