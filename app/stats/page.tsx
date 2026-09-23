"use client";

import React, { useState, useEffect } from "react";
import { UserStats } from "@/lib/sudoku/types";
import { loadGuestProfile } from "@/lib/client/storage";

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
      <div style={{ textAlign: "center", padding: "40px", color: "var(--ink-secondary)" }}>
        <span className="font-doodle">fetching your numbers...</span>
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
        maxWidth: "460px",
        margin: "12px auto",
        padding: "16px 20px",
      }}
    >
      <h1
        className="font-doodle"
        style={{
          fontSize: "22px",
          fontWeight: 400,
          color: "var(--ink-primary)",
          marginBottom: "16px",
        }}
      >
        your numbers
      </h1>

      {/* Main mathematical stats table */}
      <div
        style={{
          borderBottom: "1px solid var(--ink-primary)",
          paddingBottom: "16px",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "15px" }}>
          <span><span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>Σ</span> solved</span>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{stats.totalSolved}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "15px" }}>
          <span><span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>μ</span> time</span>
          <span style={{ fontFamily: "var(--font-mono)" }}>{formatTime(stats.averageTimeSeconds)}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "15px" }}>
          <span>best time</span>
          <span style={{ fontFamily: "var(--font-mono)" }}>{formatTime(stats.bestTimeSeconds)}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "15px" }}>
          <span>accuracy</span>
          <span style={{ fontFamily: "var(--font-mono)" }}>{stats.accuracyRate}%</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "15px" }}>
          <span>current streak</span>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{stats.currentStreak} {stats.currentStreak === 1 ? "day" : "days"}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "15px" }}>
          <span>longest streak</span>
          <span style={{ fontFamily: "var(--font-mono)" }}>{stats.longestStreak} days</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "15px" }}>
          <span>daily completed</span>
          <span style={{ fontFamily: "var(--font-mono)" }}>{stats.dailyPuzzlesCompleted}</span>
        </div>
      </div>

      {/* Difficulty Breakdown */}
      <h2
        className="font-doodle"
        style={{
          fontSize: "18px",
          fontWeight: 400,
          color: "var(--ink-primary)",
          marginBottom: "12px",
        }}
      >
        difficulty breakdown
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {(["easy", "medium", "hard", "expert"] as const).map((diff) => {
          const count = stats.difficultyCounts[diff] || 0;
          const percentage = Math.round((count / maxDifficultyCount) * 100);

          return (
            <div key={diff} style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "14px" }}>
              <span style={{ width: "60px", textTransform: "lowercase", color: "var(--ink-secondary)" }}>
                {diff}
              </span>
              <div
                style={{
                  flex: 1,
                  height: "8px",
                  border: "1px solid var(--ink-primary)",
                  borderRadius: "255px 4px 225px 4px/4px 225px 4px 255px",
                  backgroundColor: "var(--bg-paper)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${count > 0 ? percentage : 0}%`,
                    height: "100%",
                    backgroundColor: "var(--ink-primary)",
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
              <span style={{ width: "32px", textAlign: "right", fontFamily: "var(--font-mono)" }}>
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
