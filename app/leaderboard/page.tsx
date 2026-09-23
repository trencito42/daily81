"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getTodayDateString, formatNotebookDate } from "@/lib/daily/streak";

type LeaderboardType = "daily" | "weekly-xp" | "all-time-xp" | "streak";
type LeaderboardScope = "global" | "friends";

interface DailyEntry {
  rank: number;
  userId: string;
  username?: string | null;
  displayName: string;
  level: number;
  elapsedSeconds: number;
  mistakes: number;
  isCurrentUser: boolean;
}

interface WeeklyXPEntry {
  rank: number;
  userId: string;
  username?: string | null;
  displayName: string;
  level: number;
  weeklyXP: number;
  isCurrentUser: boolean;
}

interface AllTimeXPEntry {
  rank: number;
  userId: string;
  username?: string | null;
  displayName: string;
  level: number;
  xp: number;
  isCurrentUser: boolean;
}

interface StreakEntry {
  rank: number;
  userId: string;
  username?: string | null;
  displayName: string;
  level: number;
  currentStreak: number;
  longestStreak: number;
  isCurrentUser: boolean;
}

export default function LeaderboardPage() {
  const todayStr = getTodayDateString();
  const [activeTab, setActiveTab] = useState<LeaderboardType>("daily");
  const [activeScope, setActiveScope] = useState<LeaderboardScope>("global");
  const [selectedDate] = useState<string>(todayStr);
  const [data, setData] = useState<{
    entries: (DailyEntry | WeeklyXPEntry | AllTimeXPEntry | StreakEntry)[];
    userEntry?: {
      rank: number;
      displayName: string;
      level: number;
      elapsedSeconds?: number;
      mistakes?: number;
      weeklyXP?: number;
      xp?: number;
      currentStreak?: number;
      longestStreak?: number;
    } | null;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    const fetchLeaderboard = async () => {
      try {
        const baseUrl =
          activeTab === "daily"
            ? `/api/leaderboard?type=daily&date=${selectedDate}&scope=${activeScope}`
            : `/api/leaderboard?type=${activeTab}&scope=${activeScope}`;
        const res = await fetch(baseUrl);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [activeTab, activeScope, selectedDate]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const tabs: { id: LeaderboardType; label: string }[] = [
    { id: "daily", label: "daily" },
    { id: "weekly-xp", label: "weekly xp" },
    { id: "all-time-xp", label: "all-time xp" },
    { id: "streak", label: "streak" },
  ];

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "540px",
        margin: "12px auto",
        padding: "16px 20px",
      }}
    >
      <h1
        className="font-doodle"
        style={{
          fontSize: "24px",
          fontWeight: 400,
          color: "var(--ink-primary)",
          marginBottom: "14px",
          textAlign: "center",
        }}
      >
        rankings
      </h1>

      {/* Scope Selector: global | friends */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "4px",
          marginBottom: "14px",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveScope("global")}
          style={{
            background: activeScope === "global" ? "var(--ink-primary)" : "transparent",
            color: activeScope === "global" ? "var(--bg-paper)" : "var(--ink-secondary)",
            border: "1px solid var(--ink-primary)",
            borderRadius: "255px 6px 225px 6px/6px 225px 6px 255px",
            padding: "3px 12px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          global
        </button>
        <button
          type="button"
          onClick={() => setActiveScope("friends")}
          style={{
            background: activeScope === "friends" ? "var(--ink-primary)" : "transparent",
            color: activeScope === "friends" ? "var(--bg-paper)" : "var(--ink-secondary)",
            border: "1px solid var(--ink-primary)",
            borderRadius: "255px 6px 225px 6px/6px 225px 6px 255px",
            padding: "3px 12px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          friends
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "6px",
          flexWrap: "wrap",
          marginBottom: "18px",
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`doodle-button doodle-button-sm ${isActive ? "active" : ""}`}
              style={{ fontSize: "13px", padding: "4px 12px" }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Subheader for Daily */}
      {activeTab === "daily" && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: "14px",
            fontSize: "13px",
            color: "var(--ink-secondary)",
          }}
        >
          <span>
            {selectedDate === todayStr ? "today" : formatNotebookDate(selectedDate)} • hard
          </span>
          <span style={{ fontSize: "11px", fontFamily: "var(--font-doodle)" }}>
            no-hint runs only
          </span>
        </div>
      )}

      {/* Pinned User Position if available */}
      {data?.userEntry && (
        <div
          style={{
            border: "1.5px solid var(--ink-primary)",
            borderRadius: "255px 10px 225px 10px/10px 225px 10px 255px",
            padding: "10px 14px",
            marginBottom: "16px",
            backgroundColor: "var(--highlight-cell)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)", width: "28px" }}>
              #{data.userEntry.rank}
            </span>
            <span style={{ fontWeight: 600 }}>you ({data.userEntry.displayName})</span>
          </div>

          <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
            {activeTab === "daily" && data.userEntry.elapsedSeconds !== undefined && (
              <span>
                {formatTime(data.userEntry.elapsedSeconds)}
                {data.userEntry.mistakes !== undefined && data.userEntry.mistakes > 0 && (
                  <span style={{ fontSize: "12px", color: "var(--error-ink)", marginLeft: "6px" }}>
                    ({data.userEntry.mistakes} err)
                  </span>
                )}
              </span>
            )}
            {activeTab === "weekly-xp" && <span>+{data.userEntry.weeklyXP} xp</span>}
            {activeTab === "all-time-xp" && <span>{data.userEntry.xp} xp</span>}
            {activeTab === "streak" && <span>{data.userEntry.currentStreak} days</span>}
          </div>
        </div>
      )}

      {/* Content Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "32px", color: "var(--ink-secondary)" }}>
          <span className="font-doodle">fetching notebook records...</span>
        </div>
      ) : !data || data.entries.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "36px 16px",
            border: "1px dashed var(--border-subtle)",
            borderRadius: "12px",
            color: "var(--ink-secondary)",
          }}
        >
          <p style={{ marginBottom: "8px" }}>
            {activeScope === "friends"
              ? "no friend records yet. invite or add friends to compare notes!"
              : "no rankings recorded yet."}
          </p>
          {activeScope === "friends" ? (
            <Link
              href="/friends"
              className="doodle-button doodle-button-sm active"
              style={{ textDecoration: "none", marginTop: "8px", display: "inline-block" }}
            >
              find friends
            </Link>
          ) : (
            activeTab === "daily" && (
              <Link
                href="/daily"
                className="doodle-button doodle-button-sm active"
                style={{ textDecoration: "none", marginTop: "8px", display: "inline-block" }}
              >
                be the first to solve today
              </Link>
            )
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* Table Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                activeTab === "daily"
                  ? "36px 1fr 80px"
                  : activeTab === "streak"
                  ? "36px 1fr 70px 70px"
                  : "36px 1fr 60px 80px",
              padding: "6px 8px",
              borderBottom: "1.5px solid var(--ink-primary)",
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--ink-secondary)",
              fontFamily: "var(--font-sans)",
            }}
          >
            <span>#</span>
            <span>player</span>
            {activeTab === "daily" && <span style={{ textAlign: "right" }}>time</span>}
            {activeTab === "weekly-xp" && <span style={{ textAlign: "right" }}>lv.</span>}
            {activeTab === "weekly-xp" && <span style={{ textAlign: "right" }}>weekly xp</span>}
            {activeTab === "all-time-xp" && <span style={{ textAlign: "right" }}>lv.</span>}
            {activeTab === "all-time-xp" && <span style={{ textAlign: "right" }}>total xp</span>}
            {activeTab === "streak" && <span style={{ textAlign: "right" }}>streak</span>}
            {activeTab === "streak" && <span style={{ textAlign: "right" }}>best</span>}
          </div>

          {/* Table Rows */}
          {data.entries.map((entry) => {
            const isUser = entry.isCurrentUser;

            return (
              <div
                key={`${entry.rank}-${entry.userId}`}
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    activeTab === "daily"
                      ? "36px 1fr 80px"
                      : activeTab === "streak"
                      ? "36px 1fr 70px 70px"
                      : "36px 1fr 60px 80px",
                  padding: "8px 8px",
                  borderBottom: "1px solid var(--border-subtle)",
                  fontSize: "14px",
                  backgroundColor: isUser ? "var(--highlight-peer)" : "transparent",
                  alignItems: "center",
                }}
              >
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--ink-secondary)" }}>
                  {entry.rank}
                </span>

                <div style={{ display: "flex", alignItems: "baseline", gap: "6px", overflow: "hidden" }}>
                  {entry.username ? (
                    <Link
                      href={`/u/${entry.username}`}
                      style={{
                        textDecoration: "none",
                        fontWeight: isUser ? 700 : 500,
                        color: "var(--ink-primary)",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                      }}
                      className="hover-underline"
                    >
                      {entry.displayName}
                    </Link>
                  ) : (
                    <span
                      style={{
                        fontWeight: isUser ? 700 : 500,
                        color: "var(--ink-primary)",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                      }}
                    >
                      {entry.displayName}
                    </span>
                  )}
                  {isUser && (
                    <span style={{ fontSize: "11px", color: "var(--ink-secondary)", fontFamily: "var(--font-doodle)" }}>
                      (you)
                    </span>
                  )}
                </div>

                {activeTab === "daily" && "elapsedSeconds" in entry && (
                  <div style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>
                    <span>{formatTime(entry.elapsedSeconds)}</span>
                    {entry.mistakes > 0 && (
                      <span style={{ fontSize: "11px", color: "var(--error-ink)", display: "block" }}>
                        {entry.mistakes} err
                      </span>
                    )}
                  </div>
                )}

                {activeTab === "weekly-xp" && "weeklyXP" in entry && (
                  <>
                    <span style={{ textAlign: "right", color: "var(--ink-secondary)", fontSize: "13px" }}>
                      Lv.{entry.level}
                    </span>
                    <span style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                      +{entry.weeklyXP}
                    </span>
                  </>
                )}

                {activeTab === "all-time-xp" && "xp" in entry && (
                  <>
                    <span style={{ textAlign: "right", color: "var(--ink-secondary)", fontSize: "13px" }}>
                      Lv.{entry.level}
                    </span>
                    <span style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                      {entry.xp}
                    </span>
                  </>
                )}

                {activeTab === "streak" && "currentStreak" in entry && (
                  <>
                    <span style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                      {entry.currentStreak}d
                    </span>
                    <span style={{ textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--ink-secondary)" }}>
                      {entry.longestStreak}d
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
