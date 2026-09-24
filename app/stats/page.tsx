"use client";

import React, { useState, useEffect } from "react";
import { UserStats } from "@/lib/sudoku/types";
import { loadGuestProfile } from "@/lib/client/storage";
import { DoodleDivider } from "@/components/doodle/DoodleDivider";
import { DoodleProgress } from "@/components/doodle/DoodleProgress";

export default function StatsPage() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // 1. Load local guest stats immediately
    const guestProfile = loadGuestProfile();
    setStats(guestProfile.stats);

    // 2. Fetch server stats if logged in
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.stats) {
            setStats(data.stats);
          }
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  if (!stats) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: "var(--ink-secondary)", fontFamily: "var(--font-doodle)" }}>
        <span style={{ fontSize: "15px" }}>fetching your numbers...</span>
      </div>
    );
  }

  const maxDifficultyCount = Math.max(
    1,
    stats.difficultyCounts.easy,
    stats.difficultyCounts.medium,
    stats.difficultyCounts.hard,
    stats.difficultyCounts.expert
  );

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
      <h1
        style={{
          fontSize: "24px",
          fontWeight: 600,
          color: "var(--ink-primary)",
          marginBottom: "16px",
          textAlign: "center",
        }}
      >
        your numbers
      </h1>

      {/* Main mathematical stats table */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px dashed var(--border-subtle)", fontSize: "15px" }}>
          <span>Σ solved</span>
          <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{stats.totalSolved}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px dashed var(--border-subtle)", fontSize: "15px" }}>
          <span>μ time</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatTime(stats.averageTimeSeconds)}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px dashed var(--border-subtle)", fontSize: "15px" }}>
          <span>best time</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatTime(stats.bestTimeSeconds)}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px dashed var(--border-subtle)", fontSize: "15px" }}>
          <span>accuracy</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{stats.accuracyRate}%</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px dashed var(--border-subtle)", fontSize: "15px" }}>
          <span>current streak</span>
          <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{stats.currentStreak} {stats.currentStreak === 1 ? "day" : "days"}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px dashed var(--border-subtle)", fontSize: "15px" }}>
          <span>longest streak</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{stats.longestStreak} days</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px dashed var(--border-subtle)", fontSize: "15px" }}>
          <span>daily completed</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{stats.dailyPuzzlesCompleted}</span>
        </div>
      </div>

      <DoodleDivider spacing="md" />

      {/* Difficulty Breakdown */}
      <h2
        style={{
          fontSize: "18px",
          fontWeight: 600,
          color: "var(--ink-primary)",
          marginBottom: "14px",
        }}
      >
        difficulty breakdown
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {(["easy", "medium", "hard", "expert"] as const).map((diff) => {
          const count = stats.difficultyCounts[diff] || 0;

          return (
            <div key={diff} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ width: "65px", textTransform: "lowercase", color: "var(--ink-secondary)", fontSize: "14px" }}>
                {diff}
              </span>
              <div style={{ flex: 1 }}>
                <DoodleProgress
                  value={count}
                  max={maxDifficultyCount}
                  size="sm"
                  variant="ink"
                />
              </div>
              <span style={{ width: "32px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: "14px" }}>
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
