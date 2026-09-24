"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadGuestProfile } from "@/lib/client/storage";
import { DoodleInput } from "@/components/doodle/DoodleInput";
import { DoodleButton } from "@/components/doodle/DoodleButton";
import { DoodleNotice } from "@/components/doodle/DoodleNotice";

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const guestProfile = loadGuestProfile();

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          email,
          password,
          guestProfile: guestProfile.xp > 0 ? guestProfile : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      router.push("/profile");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "var(--page-reading, 520px)",
        margin: "24px auto",
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
          marginBottom: "4px",
          textAlign: "center",
        }}
      >
        create account
      </h1>

      <p style={{ textAlign: "center", fontSize: "14px", color: "var(--ink-secondary)", marginBottom: "20px" }}>
        sync your daily puzzles & streaks across devices
      </p>

      {error && (
        <div style={{ marginBottom: "16px" }}>
          <DoodleNotice variant="error" onClose={() => setError(null)}>
            {error}
          </DoodleNotice>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <DoodleInput
          label="display name"
          type="text"
          required
          placeholder="e.g. Steve"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          autoComplete="name"
        />

        <DoodleInput
          label="email"
          type="email"
          required
          placeholder="your.email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />

        <DoodleInput
          label="password"
          type="password"
          required
          minLength={6}
          placeholder="at least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />

        <div style={{ marginTop: "8px" }}>
          <DoodleButton
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={loading}
          >
            {loading ? "creating account..." : "create account"}
          </DoodleButton>
        </div>
      </form>

      <div style={{ textAlign: "center", marginTop: "24px", fontSize: "14px", color: "var(--ink-secondary)" }}>
        already have an account?{" "}
        <Link href="/login" style={{ color: "var(--ink-primary)", fontWeight: 600, textDecoration: "underline" }}>
          log in
        </Link>
      </div>
    </div>
  );
}
