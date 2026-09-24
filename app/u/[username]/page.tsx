"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DoodlePanel } from "@/components/doodle/DoodlePanel";
import { DoodleButton } from "@/components/doodle/DoodleButton";
import { DoodleBadge } from "@/components/doodle/DoodleBadge";
import { DoodleNotice } from "@/components/doodle/DoodleNotice";
import { DoodleEmptyState } from "@/components/doodle/DoodleEmptyState";
import { DoodleDivider } from "@/components/doodle/DoodleDivider";
import { DoodleIcon } from "@/components/doodle/DoodleIcon";

interface ProfileData {
  user: {
    id: string;
    username: string;
    displayName: string;
    level: number;
    xp: number;
    currentStreak: number;
    longestStreak: number;
    createdAt: string;
    statsVisibility: string;
    allowChallengesFrom: string;
    xpRank: number;
    streakRank: number;
  };
  stats?: {
    totalSolved: number;
    averageTimeSeconds: number;
    bestTimeSeconds: number;
    difficultyCounts: {
      easy: number;
      medium: number;
      hard: number;
      expert: number;
    };
    dailyPuzzlesCompleted: number;
  } | null;
  relationship: {
    isSelf: boolean;
    isFriend: boolean;
    pendingRequest: "incoming" | "outgoing" | null;
    headToHead?: {
      totalMatches: number;
      user1Wins: number;
      user2Wins: number;
      ties: number;
      avgTime1: number;
      avgTime2: number;
    } | null;
  };
}

export default function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const resolvedParams = use(params);
  const username = resolvedParams.username;
  const router = useRouter();

  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}`);
      if (res.status === 404) {
        setError("Player not found.");
        return;
      }
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError("Failed to load profile.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const handleSendFriendRequest = async () => {
    if (!data) return;
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: data.user.username }),
      });
      const resData = await res.json();
      if (res.ok) {
        setActionFeedback(resData.acceptedImmediately ? "You are now friends!" : "Friend request sent.");
        fetchProfile();
      } else {
        setActionFeedback(resData.error || "Failed to send request.");
      }
    } catch {
      setActionFeedback("Network error.");
    }
  };

  const handleRemoveFriend = async () => {
    if (!data || !confirm(`Remove ${data.user.displayName} from your friends?`)) return;
    try {
      const res = await fetch("/api/friends/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: data.user.id }),
      });
      if (res.ok) {
        setActionFeedback("Friend removed.");
        fetchProfile();
      } else {
        setActionFeedback("Failed to remove friend.");
      }
    } catch {
      setActionFeedback("Failed to remove friend.");
    }
  };

  const handleBlockUser = async () => {
    if (!data || !confirm(`Block ${data.user.displayName}? They won't be able to challenge you or interact.`)) return;
    try {
      const res = await fetch("/api/friends/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: data.user.id, action: "block" }),
      });
      if (res.ok) {
        router.push("/friends");
      }
    } catch {
      setActionFeedback("Failed to block user.");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--ink-secondary)", fontFamily: "var(--font-doodle)" }}>
        <span>opening player notebook...</span>
      </div>
    );
  }

  if (error || !data) {
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
          icon="user"
          title={error || "Player not found"}
          actionLabel="← back to friends"
          actionHref="/friends"
        />
      </div>
    );
  }

  const { user, stats, relationship } = data;
  const h2h = relationship.headToHead;

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
      {/* Top breadcrumb */}
      <div style={{ marginBottom: "16px" }}>
        <Link
          href="/friends"
          style={{
            fontSize: "13px",
            color: "var(--ink-secondary)",
            textDecoration: "none",
          }}
        >
          ← friends
        </Link>
      </div>

      {actionFeedback && (
        <div style={{ marginBottom: "14px" }}>
          <DoodleNotice variant="info" onClose={() => setActionFeedback(null)}>
            {actionFeedback}
          </DoodleNotice>
        </div>
      )}

      {/* Main Profile Header */}
      <DoodlePanel
        variant="default"
        padding="md"
        style={{ marginBottom: "20px" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1
              style={{
                fontSize: "24px",
                fontWeight: 600,
                color: "var(--ink-primary)",
                lineHeight: 1.1,
                marginBottom: "2px",
              }}
            >
              {user.displayName}
            </h1>
            <div style={{ fontSize: "14px", color: "var(--ink-secondary)" }}>
              @{user.username}
            </div>
          </div>

          <DoodleBadge variant="highlight" size="md">
            Lv. {user.level}
          </DoodleBadge>
        </div>

        {/* Level progress info */}
        <div style={{ marginTop: "14px", fontSize: "13px", color: "var(--ink-secondary)" }}>
          <span style={{ fontWeight: 600, color: "var(--ink-primary)", fontVariantNumeric: "tabular-nums" }}>
            {user.xp} XP
          </span>{" "}
          earned · member since {new Date(user.createdAt).getFullYear()}
        </div>

        {/* Action buttons */}
        {!relationship.isSelf && (
          <div style={{ display: "flex", gap: "8px", marginTop: "16px", flexWrap: "wrap" }}>
            <DoodleButton
              size="sm"
              variant="primary"
              href={`/challenges?opponent=${encodeURIComponent(user.username)}`}
              icon="swords"
            >
              challenge
            </DoodleButton>

            {relationship.isFriend ? (
              <DoodleButton
                size="sm"
                variant="secondary"
                onClick={handleRemoveFriend}
                icon="check"
              >
                friends
              </DoodleButton>
            ) : relationship.pendingRequest === "outgoing" ? (
              <DoodleButton
                size="sm"
                variant="default"
                disabled
              >
                request pending
              </DoodleButton>
            ) : relationship.pendingRequest === "incoming" ? (
              <DoodleButton
                size="sm"
                variant="primary"
                href="/friends"
              >
                respond to request
              </DoodleButton>
            ) : (
              <DoodleButton
                size="sm"
                variant="default"
                onClick={handleSendFriendRequest}
              >
                + add friend
              </DoodleButton>
            )}

            <DoodleButton
              size="sm"
              variant="ghost"
              onClick={handleBlockUser}
              title="Block user"
            >
              block
            </DoodleButton>
          </div>
        )}
      </DoodlePanel>

      {/* Head to Head record if available */}
      {h2h && h2h.totalMatches > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <h2 style={{ fontSize: "17px", fontWeight: 600, marginBottom: "8px" }}>
            head-to-head record
          </h2>
          <div
            style={{
              padding: "10px 14px",
              backgroundColor: "var(--bg-paper-alt)",
              borderStyle: "solid",
              borderWidth: "10px",
              borderImage: "url(/doodle/button.svg) 10 10 10 10 stretch stretch",
              display: "flex",
              justifyContent: "space-around",
              textAlign: "center",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--success-ink)" }}>{h2h.user1Wins}</div>
              <div style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>your wins</div>
            </div>
            <div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--ink-secondary)" }}>{h2h.ties}</div>
              <div style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>ties</div>
            </div>
            <div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--error-ink)" }}>{h2h.user2Wins}</div>
              <div style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>{user.displayName} wins</div>
            </div>
          </div>
        </div>
      )}

      {/* Public Stats or Private notice */}
      {stats ? (
        <div>
          <h2 style={{ fontSize: "17px", fontWeight: 600, marginBottom: "8px" }}>
            solving statistics
          </h2>
          <div style={{ display: "flex", flexDirection: "column", fontVariantNumeric: "tabular-nums" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px dashed var(--border-subtle)", fontSize: "14px" }}>
              <span>Σ solved puzzles</span>
              <span style={{ fontWeight: 600 }}>{stats.totalSolved}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px dashed var(--border-subtle)", fontSize: "14px" }}>
              <span>μ average solve time</span>
              <span>{formatTime(stats.averageTimeSeconds)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px dashed var(--border-subtle)", fontSize: "14px" }}>
              <span>best recorded time</span>
              <span>{formatTime(stats.bestTimeSeconds)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px dashed var(--border-subtle)", fontSize: "14px" }}>
              <span>daily puzzles solved</span>
              <span>{stats.dailyPuzzlesCompleted}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px dashed var(--border-subtle)", fontSize: "14px" }}>
              <span>current streak</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                <DoodleIcon name="streak" size={13} />
                {user.currentStreak} days
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: "16px 0", textAlign: "center", color: "var(--ink-secondary)", fontSize: "14px", fontStyle: "italic" }}>
          this player&apos;s stats are private.
        </div>
      )}
    </div>
  );
}
