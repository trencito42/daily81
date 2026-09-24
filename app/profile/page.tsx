"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { XPBar } from "@/components/doodle/XPBar";
import { loadGuestProfile } from "@/lib/client/storage";
import { DoodleButton } from "@/components/doodle/DoodleButton";
import { DoodleBadge } from "@/components/doodle/DoodleBadge";
import { DoodleDivider } from "@/components/doodle/DoodleDivider";
import { DoodleIcon } from "@/components/doodle/DoodleIcon";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<{
    id: string;
    email: string;
    username: string;
    displayName: string;
    xp: number;
    level: number;
    currentStreak: number;
    longestStreak: number;
    solvedCount: number;
  } | null>(null);

  const [guestProfile, setGuestProfile] = useState(() => loadGuestProfile());
  const [loading, setLoading] = useState<boolean>(true);

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

  const currentXP = user ? user.xp : guestProfile.xp;
  const currentStreak = user ? user.currentStreak : guestProfile.currentStreak;
  const solvedCount = user ? (user.solvedCount || 0) : (guestProfile.stats?.totalSolved || 0);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "var(--page-reading, 520px)",
        margin: "12px auto",
        padding: "16px 20px 48px",
        textAlign: "center",
        boxSizing: "border-box",
        fontFamily: "var(--font-doodle)",
      }}
    >
      <h1
        style={{
          fontSize: "24px",
          fontWeight: 600,
          color: "var(--ink-primary)",
          marginBottom: "2px",
        }}
      >
        {user ? user.displayName : "notebook player"}
      </h1>

      {user ? (
        <div style={{ fontSize: "14px", color: "var(--ink-secondary)", marginBottom: "16px" }}>
          @{user.username || "player"}
        </div>
      ) : (
        <div style={{ fontSize: "13px", color: "var(--ink-muted)", marginBottom: "16px" }}>
          guest solver · local storage
        </div>
      )}

      {/* XP & Level Section */}
      <div style={{ margin: "20px 0" }}>
        <XPBar xp={currentXP} />
      </div>

      {/* Summary stats flat notebook row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          padding: "14px 0",
          borderTop: "1px dashed var(--border-subtle)",
          borderBottom: "1px dashed var(--border-subtle)",
          margin: "20px 0",
        }}
      >
        <div>
          <div style={{ fontSize: "20px", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{solvedCount}</div>
          <div style={{ fontSize: "13px", color: "var(--ink-secondary)" }}>solved</div>
        </div>
        <div>
          <div style={{ fontSize: "20px", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{currentStreak}</div>
          <div style={{ fontSize: "13px", color: "var(--ink-secondary)" }}>day streak</div>
        </div>
      </div>

      {/* Competitive summary link */}
      <div style={{ marginBottom: "24px" }}>
        <DoodleButton
          size="sm"
          variant="secondary"
          href="/leaderboard"
          icon="leaderboard"
        >
          view leaderboard rankings
        </DoodleButton>
      </div>

      <DoodleDivider spacing="md" />

      {/* Auth actions */}
      {user ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
          <div
            style={{
              padding: "8px 14px",
              fontSize: "13px",
              color: "var(--ink-secondary)",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            <div style={{ fontWeight: 600, color: "var(--ink-primary)" }}>account email</div>
            <div>{user.email}</div>
          </div>

          <DoodleButton
            size="sm"
            variant="danger"
            onClick={handleLogout}
          >
            log out
          </DoodleButton>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
          <p style={{ fontSize: "14px", color: "var(--ink-secondary)", maxWidth: "340px", lineHeight: 1.4 }}>
            create an account or log in to sync your puzzles and streaks across all your devices.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "4px" }}>
            <DoodleButton size="sm" variant="default" href="/login">
              log in
            </DoodleButton>
            <DoodleButton size="sm" variant="primary" href="/register">
              create account
            </DoodleButton>
          </div>
        </div>
      )}
    </div>
  );
}
