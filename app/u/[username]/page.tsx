"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
      <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--ink-secondary)" }}>
        <span className="font-doodle">opening player notebook...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          margin: "40px auto",
          padding: "24px 20px",
          textAlign: "center",
          border: "1px dashed var(--border-subtle)",
          borderRadius: "10px",
        }}
      >
        <p style={{ color: "var(--ink-secondary)", marginBottom: "16px" }}>{error || "Player not found."}</p>
        <Link href="/friends" className="doodle-button doodle-button-sm">
          ← back to friends
        </Link>
      </div>
    );
  }

  const { user, stats, relationship } = data;
  const h2h = relationship.headToHead;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "480px",
        margin: "12px auto",
        padding: "16px 20px 48px",
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
        <div
          style={{
            padding: "8px 12px",
            backgroundColor: "var(--highlight-cell)",
            borderRadius: "6px",
            fontSize: "13px",
            marginBottom: "16px",
          }}
        >
          {actionFeedback}
        </div>
      )}

      {/* Main Profile Header */}
      <div
        style={{
          border: "1.5px solid var(--ink-primary)",
          borderRadius: "255px 12px 225px 12px/12px 225px 12px 255px",
          padding: "20px",
          backgroundColor: "var(--bg-paper)",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1
              className="font-doodle"
              style={{
                fontSize: "26px",
                fontWeight: 600,
                color: "var(--ink-primary)",
                lineHeight: 1.1,
                marginBottom: "4px",
              }}
            >
              {user.displayName}
            </h1>
            <div style={{ fontSize: "13px", color: "var(--ink-secondary)", fontFamily: "var(--font-mono)" }}>
              @{user.username}
            </div>
          </div>

          <div
            style={{
              padding: "4px 10px",
              border: "1px solid var(--ink-primary)",
              borderRadius: "255px 6px 225px 6px/6px 225px 6px 255px",
              fontWeight: 700,
              fontSize: "14px",
              fontFamily: "var(--font-mono)",
            }}
          >
            Lv. {user.level}
          </div>
        </div>

        {/* Level progress info */}
        <div style={{ marginTop: "16px", fontSize: "13px", color: "var(--ink-secondary)" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--ink-primary)" }}>
            {user.xp} XP
          </span>{" "}
          earned · member since {new Date(user.createdAt).getFullYear()}
        </div>

        {/* Action buttons */}
        {!relationship.isSelf && (
          <div style={{ display: "flex", gap: "8px", marginTop: "16px", flexWrap: "wrap" }}>
            <Link
              href={`/challenges?opponent=${encodeURIComponent(user.username)}`}
              className="doodle-button doodle-button-sm active"
              style={{ textDecoration: "none", fontSize: "13px", padding: "4px 14px" }}
            >
              challenge
            </Link>

            {relationship.isFriend ? (
              <button
                type="button"
                onClick={handleRemoveFriend}
                className="doodle-button doodle-button-sm"
                style={{ fontSize: "13px", padding: "4px 12px" }}
              >
                friends ✓
              </button>
            ) : relationship.pendingRequest === "outgoing" ? (
              <button
                type="button"
                disabled
                className="doodle-button doodle-button-sm"
                style={{ fontSize: "13px", padding: "4px 12px", opacity: 0.7 }}
              >
                request pending
              </button>
            ) : relationship.pendingRequest === "incoming" ? (
              <Link
                href="/friends"
                className="doodle-button doodle-button-sm active"
                style={{ textDecoration: "none", fontSize: "13px", padding: "4px 12px" }}
              >
                respond to request
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleSendFriendRequest}
                className="doodle-button doodle-button-sm"
                style={{ fontSize: "13px", padding: "4px 12px" }}
              >
                + add friend
              </button>
            )}

            <button
              type="button"
              onClick={handleBlockUser}
              style={{
                background: "none",
                border: "none",
                color: "var(--ink-secondary)",
                fontSize: "12px",
                cursor: "pointer",
                padding: "4px 8px",
                marginLeft: "auto",
              }}
            >
              block
            </button>
          </div>
        )}
      </div>

      {/* Head-to-Head rivalry stats (if viewer is signed in and not self) */}
      {!relationship.isSelf && h2h && h2h.totalMatches > 0 && (
        <div
          style={{
            border: "1px solid var(--border-subtle)",
            borderRadius: "255px 10px 225px 10px/10px 225px 10px 255px",
            padding: "16px",
            marginBottom: "20px",
            backgroundColor: "var(--highlight-cell)",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "var(--ink-secondary)",
              marginBottom: "8px",
            }}
          >
            head-to-head rivalry
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "18px",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              margin: "6px 0 10px",
            }}
          >
            <span>you {h2h.user1Wins}</span>
            <span style={{ color: "var(--ink-secondary)", fontWeight: 400, fontSize: "14px" }}>
              {h2h.totalMatches} matches {h2h.ties > 0 && `(${h2h.ties} ties)`}
            </span>
            <span>{user.displayName} {h2h.user2Wins}</span>
          </div>

          {(h2h.avgTime1 > 0 || h2h.avgTime2 > 0) && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "12px",
                color: "var(--ink-secondary)",
                fontFamily: "var(--font-mono)",
                borderTop: "1px dashed var(--border-subtle)",
                paddingTop: "8px",
              }}
            >
              <span>avg time: {formatTime(h2h.avgTime1)}</span>
              <span>avg time: {formatTime(h2h.avgTime2)}</span>
            </div>
          )}
        </div>
      )}

      {/* Ranks & Streaks */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            border: "1px solid var(--border-subtle)",
            borderRadius: "8px",
            padding: "12px",
            backgroundColor: "var(--bg-paper)",
          }}
        >
          <div style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>current streak</div>
          <div style={{ fontSize: "20px", fontFamily: "var(--font-mono)", fontWeight: 700, marginTop: "2px" }}>
            {user.currentStreak} <span style={{ fontSize: "12px", fontWeight: 400 }}>days</span>
          </div>
          <div style={{ fontSize: "11px", color: "var(--ink-secondary)", marginTop: "4px" }}>
            longest: {user.longestStreak} days
          </div>
        </div>

        <div
          style={{
            border: "1px solid var(--border-subtle)",
            borderRadius: "8px",
            padding: "12px",
            backgroundColor: "var(--bg-paper)",
          }}
        >
          <div style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>rankings</div>
          <div style={{ fontSize: "14px", fontFamily: "var(--font-mono)", fontWeight: 600, marginTop: "4px" }}>
            xp: #{user.xpRank}
          </div>
          <div style={{ fontSize: "14px", fontFamily: "var(--font-mono)", fontWeight: 600, marginTop: "2px" }}>
            streak: #{user.streakRank}
          </div>
        </div>
      </div>

      {/* Solving Stats */}
      {stats ? (
        <div
          style={{
            border: "1px solid var(--border-subtle)",
            borderRadius: "255px 10px 225px 10px/10px 225px 10px 255px",
            padding: "16px",
            backgroundColor: "var(--bg-paper)",
          }}
        >
          <h2
            style={{
              fontSize: "13px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "var(--ink-secondary)",
              marginBottom: "12px",
            }}
          >
            solving records
          </h2>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px" }}>
            <span style={{ color: "var(--ink-secondary)" }}>total solved</span>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{stats.totalSolved}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px" }}>
            <span style={{ color: "var(--ink-secondary)" }}>daily puzzles</span>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{stats.dailyPuzzlesCompleted}</span>
          </div>

          {stats.bestTimeSeconds > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px" }}>
              <span style={{ color: "var(--ink-secondary)" }}>best solve time</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                {formatTime(stats.bestTimeSeconds)}
              </span>
            </div>
          )}

          {stats.averageTimeSeconds > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
              <span style={{ color: "var(--ink-secondary)" }}>average time</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                {formatTime(stats.averageTimeSeconds)}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "24px 16px",
            border: "1px dashed var(--border-subtle)",
            borderRadius: "8px",
            color: "var(--ink-secondary)",
            fontSize: "13px",
          }}
        >
          detailed solving statistics are private.
        </div>
      )}
    </div>
  );
}
