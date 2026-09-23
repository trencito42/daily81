"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
          maxWidth: "480px",
          margin: "40px auto",
          padding: "24px 20px",
          textAlign: "center",
          border: "1.5px solid var(--ink-primary)",
          borderRadius: "255px 12px 225px 12px/12px 225px 12px 255px",
          backgroundColor: "var(--bg-paper)",
        }}
      >
        <h1 className="font-doodle" style={{ fontSize: "22px", marginBottom: "12px" }}>
          friends & challenges
        </h1>
        <p style={{ color: "var(--ink-secondary)", fontSize: "14px", lineHeight: "1.6", marginBottom: "20px" }}>
          Sign in or create a free account to challenge friends, compare solving times, and climb friend leaderboards.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <Link href="/login" className="doodle-button doodle-button-sm active" style={{ textDecoration: "none" }}>
            sign in
          </Link>
          <Link href="/register" className="doodle-button doodle-button-sm" style={{ textDecoration: "none" }}>
            register
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "520px",
        margin: "12px auto",
        padding: "16px 20px 48px",
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
          className="font-doodle"
          style={{
            fontSize: "24px",
            fontWeight: 400,
            color: "var(--ink-primary)",
          }}
        >
          friends
        </h1>
        <Link
          href="/challenges"
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--ink-secondary)",
            textDecoration: "none",
            borderBottom: "1px dashed var(--border-subtle)",
          }}
        >
          challenges →
        </Link>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          marginBottom: "20px",
          borderBottom: "1.5px solid var(--border-subtle)",
          paddingBottom: "8px",
          overflowX: "auto",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("friends")}
          className={`doodle-button doodle-button-sm ${activeTab === "friends" ? "active" : ""}`}
          style={{ fontSize: "13px", padding: "3px 10px" }}
        >
          friends ({friends.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("requests")}
          className={`doodle-button doodle-button-sm ${activeTab === "requests" ? "active" : ""}`}
          style={{ fontSize: "13px", padding: "3px 10px", position: "relative" }}
        >
          requests
          {incomingRequests.length > 0 && (
            <span
              style={{
                marginLeft: "6px",
                backgroundColor: "var(--error-ink)",
                color: "#fff",
                borderRadius: "50%",
                padding: "1px 5px",
                fontSize: "10px",
                fontWeight: 700,
              }}
            >
              {incomingRequests.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("find")}
          className={`doodle-button doodle-button-sm ${activeTab === "find" ? "active" : ""}`}
          style={{ fontSize: "13px", padding: "3px 10px" }}
        >
          find someone
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("activity")}
          className={`doodle-button doodle-button-sm ${activeTab === "activity" ? "active" : ""}`}
          style={{ fontSize: "13px", padding: "3px 10px" }}
        >
          activity
        </button>
      </div>

      {/* Feedback message */}
      {actionFeedback && (
        <div
          style={{
            padding: "8px 12px",
            backgroundColor: "var(--highlight-cell)",
            borderRadius: "6px",
            fontSize: "13px",
            marginBottom: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{actionFeedback}</span>
          <button
            onClick={() => setActionFeedback(null)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px" }}
          >
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "36px", color: "var(--ink-secondary)" }}>
          <span className="font-doodle">opening notebook...</span>
        </div>
      ) : (
        <>
          {/* TAB 1: FRIENDS LIST */}
          {activeTab === "friends" && (
            <div>
              {friends.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "36px 16px",
                    border: "1px dashed var(--border-subtle)",
                    borderRadius: "10px",
                    color: "var(--ink-secondary)",
                  }}
                >
                  <p style={{ fontSize: "14px", marginBottom: "12px" }}>
                    no friends added yet.
                  </p>
                  <button
                    onClick={() => setActiveTab("find")}
                    className="doodle-button doodle-button-sm active"
                  >
                    find someone...
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {friends.map((item) => {
                    const u = item.user;
                    return (
                      <div
                        key={item.friendshipId}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 12px",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "255px 8px 225px 8px/8px 225px 8px 255px",
                          backgroundColor: "var(--bg-paper)",
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                            <Link
                              href={`/u/${u.username}`}
                              style={{
                                textDecoration: "none",
                                fontWeight: 600,
                                color: "var(--ink-primary)",
                                fontSize: "15px",
                              }}
                              className="hover-underline"
                            >
                              {u.displayName}
                            </Link>
                            <span
                              style={{
                                fontSize: "12px",
                                color: "var(--ink-secondary)",
                                fontFamily: "var(--font-mono)",
                              }}
                            >
                              Lv. {u.level}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: "12px",
                              color: "var(--ink-secondary)",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            @{u.username}
                            {u.currentStreak > 0 && ` · ${u.currentStreak}d streak`}
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Link
                            href={`/challenges?opponent=${encodeURIComponent(u.username)}`}
                            className="doodle-button doodle-button-sm active"
                            style={{
                              textDecoration: "none",
                              fontSize: "12px",
                              padding: "3px 8px",
                            }}
                          >
                            challenge
                          </Link>

                          <Link
                            href={`/u/${u.username}`}
                            style={{
                              fontSize: "12px",
                              color: "var(--ink-secondary)",
                              textDecoration: "none",
                              padding: "3px 6px",
                            }}
                          >
                            profile
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleRemoveFriend(u.id, u.displayName)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--ink-secondary)",
                              fontSize: "12px",
                              padding: "3px 6px",
                            }}
                            title="Remove friend"
                          >
                            remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: REQUESTS */}
          {activeTab === "requests" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Incoming */}
              <div>
                <h2
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "var(--ink-secondary)",
                    marginBottom: "10px",
                  }}
                >
                  incoming requests ({incomingRequests.length})
                </h2>

                {incomingRequests.length === 0 ? (
                  <p style={{ fontSize: "13px", color: "var(--ink-secondary)", fontStyle: "italic" }}>
                    no incoming friend requests.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {incomingRequests.map((req) => {
                      const s = req.sender;
                      if (!s) return null;
                      return (
                        <div
                          key={req.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "10px 12px",
                            border: "1.5px solid var(--ink-primary)",
                            borderRadius: "255px 8px 225px 8px/8px 225px 8px 255px",
                            backgroundColor: "var(--highlight-cell)",
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "14px" }}>
                              <Link
                                href={`/u/${s.username}`}
                                style={{ color: "var(--ink-primary)", textDecoration: "none" }}
                              >
                                {s.displayName}
                              </Link>{" "}
                              <span style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>
                                (Lv. {s.level})
                              </span>
                            </div>
                            <div style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>
                              @{s.username} · {formatRelativeTime(req.createdAt)}
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              type="button"
                              onClick={() => handleRespond(req.id, "accept")}
                              className="doodle-button doodle-button-sm active"
                              style={{ fontSize: "12px", padding: "3px 10px" }}
                            >
                              accept
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRespond(req.id, "decline")}
                              className="doodle-button doodle-button-sm"
                              style={{ fontSize: "12px", padding: "3px 10px" }}
                            >
                              decline
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Outgoing */}
              {outgoingRequests.length > 0 && (
                <div>
                  <h2
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      color: "var(--ink-secondary)",
                      marginBottom: "10px",
                    }}
                  >
                    pending outgoing ({outgoingRequests.length})
                  </h2>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {outgoingRequests.map((req) => {
                      const r = req.receiver;
                      if (!r) return null;
                      return (
                        <div
                          key={req.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "8px 12px",
                            border: "1px dashed var(--border-subtle)",
                            borderRadius: "6px",
                            fontSize: "13px",
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 500 }}>{r.displayName}</span>{" "}
                            <span style={{ color: "var(--ink-secondary)", fontSize: "12px" }}>
                              (@{r.username})
                            </span>
                          </div>
                          <span style={{ color: "var(--ink-secondary)", fontSize: "12px" }}>pending...</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FIND SOMEONE */}
          {activeTab === "find" && (
            <div>
              <div style={{ marginBottom: "16px" }}>
                <input
                  type="text"
                  placeholder="search username or display name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    fontSize: "14px",
                    border: "1.5px solid var(--ink-primary)",
                    borderRadius: "255px 8px 225px 8px/8px 225px 8px 255px",
                    backgroundColor: "var(--bg-paper)",
                    color: "var(--ink-primary)",
                    outline: "none",
                  }}
                />
              </div>

              {searchFeedback && (
                <div
                  style={{
                    padding: "8px 12px",
                    backgroundColor: "var(--highlight-cell)",
                    borderRadius: "6px",
                    fontSize: "13px",
                    marginBottom: "14px",
                  }}
                >
                  {searchFeedback}
                </div>
              )}

              {searching && (
                <div style={{ textAlign: "center", padding: "16px", color: "var(--ink-secondary)", fontSize: "13px" }}>
                  searching notebooks...
                </div>
              )}

              {!searching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "24px 16px",
                    color: "var(--ink-secondary)",
                    fontSize: "13px",
                  }}
                >
                  no player found matching &quot;{searchQuery}&quot;.
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {searchResults.map((u) => (
                  <div
                    key={u.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 12px",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "255px 8px 225px 8px/8px 225px 8px 255px",
                      backgroundColor: "var(--bg-paper)",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "14px" }}>
                        <Link
                          href={`/u/${u.username}`}
                          style={{ color: "var(--ink-primary)", textDecoration: "none" }}
                          className="hover-underline"
                        >
                          {u.displayName}
                        </Link>{" "}
                        <span style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>
                          (Lv. {u.level})
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>
                        @{u.username}
                      </div>
                    </div>

                    <div>
                      {u.isFriend ? (
                        <span style={{ fontSize: "12px", color: "var(--ink-secondary)", fontStyle: "italic" }}>
                          already friends
                        </span>
                      ) : u.hasPendingRequest ? (
                        <span style={{ fontSize: "12px", color: "var(--ink-secondary)", fontStyle: "italic" }}>
                          request pending
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSendRequest(u.username)}
                          className="doodle-button doodle-button-sm active"
                          style={{ fontSize: "12px", padding: "3px 10px" }}
                        >
                          add friend
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: ACTIVITY FEED */}
          {activeTab === "activity" && (
            <div>
              {activities.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "36px 16px",
                    border: "1px dashed var(--border-subtle)",
                    borderRadius: "10px",
                    color: "var(--ink-secondary)",
                  }}
                >
                  <p style={{ fontSize: "13px" }}>no recent friend activity.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {activities.map((act) => {
                    let desc = "had activity";
                    if (act.type === "daily_solved") {
                      const mins = act.metadata?.elapsedSeconds
                        ? `${Math.floor(act.metadata.elapsedSeconds / 60)}m`
                        : "";
                      desc = `solved today's ${act.metadata?.difficulty || "hard"}${mins ? ` · ${mins}` : ""}`;
                    } else if (act.type === "level_up") {
                      desc = `reached level ${act.metadata?.newLevel || act.user.level}`;
                    } else if (act.type === "streak_milestone") {
                      desc = `reached ${act.metadata?.streakDays || 7} day streak`;
                    } else if (act.type === "challenge_won") {
                      desc = `won a sudoku challenge`;
                    }

                    return (
                      <div
                        key={act.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                          padding: "8px 10px",
                          borderBottom: "1px solid var(--border-subtle)",
                          fontSize: "13px",
                        }}
                      >
                        <div>
                          <Link
                            href={`/u/${act.user.username}`}
                            style={{
                              fontWeight: 600,
                              color: "var(--ink-primary)",
                              textDecoration: "none",
                              marginRight: "6px",
                            }}
                            className="hover-underline"
                          >
                            {act.user.displayName}
                          </Link>
                          <span style={{ color: "var(--ink-secondary)" }}>{desc}</span>
                        </div>
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--ink-secondary)",
                            fontFamily: "var(--font-mono)",
                            whiteSpace: "nowrap",
                            marginLeft: "10px",
                          }}
                        >
                          {formatRelativeTime(act.createdAt)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
