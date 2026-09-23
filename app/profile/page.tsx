"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { XPBar } from "@/components/doodle/XPBar";
import { loadGuestProfile } from "@/lib/client/storage";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<{
    id: string;
    email: string;
    displayName: string;
    xp: number;
    level: number;
    currentStreak: number;
    longestStreak: number;
  } | null>(null);

  const [guestProfile, setGuestProfile] = useState(() => loadGuestProfile());
  const [loading, setLoading] = useState<boolean>(true);
  const [mergeMessage, setMergeMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
          }
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.refresh();
    } catch {
      // Ignore
    }
  };

  const handleMergeGuest = async () => {
    try {
      const res = await fetch("/api/auth/merge-guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestProfile }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setMergeMessage("local progress successfully merged!");
      }
    } catch {
      setMergeMessage("failed to merge progress.");
    }
  };

  const currentXP = user ? user.xp : guestProfile.xp;
  const currentStreak = user ? user.currentStreak : guestProfile.currentStreak;
  const solvedCount = user ? (guestProfile.stats?.totalSolved || 0) : guestProfile.stats.totalSolved;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "440px",
        margin: "16px auto",
        padding: "20px",
        textAlign: "center",
      }}
    >
      <h1
        className="font-doodle"
        style={{
          fontSize: "24px",
          fontWeight: 400,
          color: "var(--ink-primary)",
          marginBottom: "4px",
        }}
      >
        {user ? user.displayName : "notebook player"}
      </h1>

      {user && (
        <div style={{ fontSize: "13px", color: "var(--ink-secondary)", marginBottom: "16px" }}>
          {user.email}
        </div>
      )}

      {/* XP & Level Section */}
      <div style={{ margin: "24px 0" }}>
        <XPBar xp={currentXP} />
      </div>

      {/* Summary stats */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          padding: "16px 0",
          borderTop: "1px solid var(--border-subtle)",
          borderBottom: "1px solid var(--border-subtle)",
          marginBottom: "20px",
          fontFamily: "var(--font-mono)",
        }}
      >
        <div>
          <div style={{ fontSize: "18px", fontWeight: 700 }}>{solvedCount}</div>
          <div style={{ fontSize: "12px", color: "var(--ink-secondary)", fontFamily: "var(--font-sans)" }}>solved</div>
        </div>
        <div>
          <div style={{ fontSize: "18px", fontWeight: 700 }}>{currentStreak}</div>
          <div style={{ fontSize: "12px", color: "var(--ink-secondary)", fontFamily: "var(--font-sans)" }}>day streak</div>
        </div>
      </div>

      {/* Competitive summary link */}
      <div style={{ marginBottom: "24px" }}>
        <Link
          href="/leaderboard"
          className="doodle-button doodle-button-sm"
          style={{ textDecoration: "none", fontSize: "13px" }}
        >
          view leaderboard rankings →
        </Link>
      </div>

      {/* Auth actions */}
      {user ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {guestProfile.xp > 0 && (
            <button
              type="button"
              onClick={handleMergeGuest}
              className="doodle-button"
              style={{ fontSize: "13px" }}
            >
              merge local guest xp (+{guestProfile.xp} xp)
            </button>
          )}

          {mergeMessage && (
            <div style={{ fontSize: "13px", color: "var(--success-ink)", fontFamily: "var(--font-doodle)" }}>
              {mergeMessage}
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="doodle-button doodle-button-ghost"
            style={{ fontSize: "13px" }}
          >
            log out
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <p style={{ fontSize: "13px", color: "var(--ink-secondary)", marginBottom: "4px" }}>
            create an account or log in to sync your puzzles across devices.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
            <Link href="/login" className="doodle-button" style={{ textDecoration: "none", fontSize: "13px" }}>
              log in
            </Link>
            <Link
              href="/register"
              className="doodle-button active"
              style={{ textDecoration: "none", fontSize: "13px" }}
            >
              create account
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
