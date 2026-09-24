"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getTodayDateString, formatNotebookDate } from "@/lib/daily/streak";
import { DoodleTabs } from "@/components/doodle/DoodleTabs";
import { DoodleEmptyState } from "@/components/doodle/DoodleEmptyState";
import { DoodleBadge } from "@/components/doodle/DoodleBadge";
import { DoodleIcon } from "@/components/doodle/DoodleIcon";

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

  const scopeTabs = [
    { id: "global", label: "global" },
    { id: "friends", label: "friends" },
  ];

  const typeTabs = [
    { id: "daily", label: "daily" },
    { id: "weekly-xp", label: "weekly xp" },
    { id: "all-time-xp", label: "all-time xp" },
    { id: "streak", label: "streak" },
  ];

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "var(--page-reading, 520px)",
        margin: "12px auto",
        padding: "16px 20px",
        boxSizing: "border-box",
        fontFamily: "var(--font-doodle)",
      }}
    >
      <h1
        style={{
          fontSize: "24px",
          fontWeight: 600,
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
          marginBottom: "12px",
        }}
      >
        <DoodleTabs
          tabs={scopeTabs}
          activeTab={activeScope}
          size="sm"
          onChange={(id) => setActiveScope(id as LeaderboardScope)}
        />
      </div>

      {/* Main Leaderboard Tabs */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "16px",
        }}
      >
        <DoodleTabs
          tabs={typeTabs}
          activeTab={activeTab}
          size="sm"
          onChange={(id) => setActiveTab(id as LeaderboardType)}
        />
      </div>

      {/* Subheader for Daily */}
      {activeTab === "daily" && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: "12px",
            fontSize: "13px",
            color: "var(--ink-secondary)",
          }}
        >
          <span>
            {selectedDate === todayStr ? "today" : formatNotebookDate(selectedDate)} · hard
          </span>
          <span style={{ fontSize: "12px" }}>
            no-hint solves only
          </span>
        </div>
      )}

      {/* Pinned User Position if available */}
      {data?.userEntry && (
        <div
          style={{
            padding: "8px 12px",
            marginBottom: "14px",
            backgroundColor: "var(--highlight-cell)",
            borderStyle: "solid",
            borderWidth: "10px",
            borderImage: "url(/doodle/button.svg) 10 10 10 10 stretch stretch",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "14px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", width: "32px" }}>
              #{data.userEntry.rank}
            </span>
            <span style={{ fontWeight: 600 }}>you ({data.userEntry.displayName})</span>
          </div>

          <div style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            {activeTab === "daily" && data.userEntry.elapsedSeconds !== undefined && (
              <span>
                {formatTime(data.userEntry.elapsedSeconds)}
                {data.userEntry.mistakes !== undefined && data.userEntry.mistakes > 0 && (
                  <span style={{ fontSize: "12px", color: "var(--error-ink)", marginLeft: "4px" }}>
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
        <div style={{ textAlign: "center", padding: "36px", color: "var(--ink-secondary)" }}>
          <span style={{ fontSize: "15px" }}>fetching notebook records...</span>
        </div>
      ) : !data || data.entries.length === 0 ? (
        <DoodleEmptyState
          icon={activeScope === "friends" ? "friends" : "leaderboard"}
          title={activeScope === "friends" ? "no friend records yet" : "no rankings recorded yet"}
          description={
            activeScope === "friends"
              ? "add friends to compare your times and scores in the notebook."
              : activeTab === "daily"
              ? "be the first to solve today's puzzle!"
              : "play puzzles to earn XP and appear on the board."
          }
          actionLabel={activeScope === "friends" ? "find friends →" : activeTab === "daily" ? "solve today's sudoku →" : "play now →"}
          actionHref={activeScope === "friends" ? "/friends" : activeTab === "daily" ? "/daily" : "/play"}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
          {/* Table Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "36px 1fr auto",
              padding: "6px 8px",
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--ink-secondary)",
              borderBottom: "1.5px solid var(--ink-primary)",
              letterSpacing: "0.3px",
            }}
          >
            <span>#</span>
            <span>player</span>
            <span style={{ textAlign: "right" }}>
              {activeTab === "daily"
                ? "time"
                : activeTab === "weekly-xp"
                ? "weekly xp"
                : activeTab === "all-time-xp"
                ? "total xp"
                : "streak"}
            </span>
          </div>

          {/* Table Rows */}
          {data.entries.map((entry) => {
            const isTop3 = entry.rank <= 3;
            return (
              <div
                key={entry.userId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "36px 1fr auto",
                  alignItems: "center",
                  padding: "8px",
                  borderBottom: "1px dashed var(--border-subtle)",
                  backgroundColor: entry.isCurrentUser
                    ? "var(--highlight-cell)"
                    : "transparent",
                  fontSize: "14px",
                  transition: "background-color 0.1s ease",
                }}
              >
                {/* Rank */}
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span
                    style={{
                      fontWeight: isTop3 ? 700 : 500,
                      fontVariantNumeric: "tabular-nums",
                      color: isTop3 ? "var(--ink-primary)" : "var(--ink-secondary)",
                    }}
                  >
                    {entry.rank}
                  </span>
                  {entry.rank === 1 && (
                    <DoodleIcon name="star" size={12} color="var(--ink-primary)" />
                  )}
                </div>

                {/* Player Name */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, paddingRight: "8px" }}>
                  {entry.username ? (
                    <Link
                      href={`/u/${entry.username}`}
                      style={{
                        textDecoration: "none",
                        color: "var(--ink-primary)",
                        fontWeight: entry.isCurrentUser ? 700 : 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {entry.displayName}
                    </Link>
                  ) : (
                    <span
                      style={{
                        color: "var(--ink-primary)",
                        fontWeight: entry.isCurrentUser ? 700 : 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {entry.displayName}
                    </span>
                  )}
                  <DoodleBadge variant="muted" size="sm">
                    Lv. {entry.level}
                  </DoodleBadge>
                  {entry.isCurrentUser && (
                    <DoodleBadge variant="highlight" size="sm">
                      you
                    </DoodleBadge>
                  )}
                </div>

                {/* Score / Time Column */}
                <div
                  style={{
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 600,
                    color: "var(--ink-primary)",
                  }}
                >
                  {activeTab === "daily" && "elapsedSeconds" in entry && (
                    <span>
                      {formatTime(entry.elapsedSeconds)}
                      {entry.mistakes > 0 && (
                        <span style={{ fontSize: "11px", color: "var(--error-ink)", marginLeft: "4px" }}>
                          ({entry.mistakes} err)
                        </span>
                      )}
                    </span>
                  )}
                  {activeTab === "weekly-xp" && "weeklyXP" in entry && (
                    <span>+{entry.weeklyXP} xp</span>
                  )}
                  {activeTab === "all-time-xp" && "xp" in entry && (
                    <span>{entry.xp} xp</span>
                  )}
                  {activeTab === "streak" && "currentStreak" in entry && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                      <DoodleIcon name="streak" size={13} />
                      {entry.currentStreak}d
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
