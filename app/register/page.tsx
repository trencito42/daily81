"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadGuestProfile } from "@/lib/client/storage";

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
        maxWidth: "380px",
        margin: "32px auto",
        padding: "24px 20px",
      }}
    >
      <h1
        className="font-doodle"
        style={{
          fontSize: "24px",
          fontWeight: 400,
          color: "var(--ink-primary)",
          marginBottom: "6px",
          textAlign: "center",
        }}
      >
        create account
      </h1>

      <p style={{ textAlign: "center", fontSize: "13px", color: "var(--ink-secondary)", marginBottom: "20px" }}>
        sync your daily puzzles & stats across devices
      </p>

      {error && (
        <div
          style={{
            padding: "8px 12px",
            backgroundColor: "var(--error-bg)",
            color: "var(--error-ink)",
            borderRadius: "6px",
            fontSize: "13px",
            marginBottom: "16px",
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div>
          <label style={{ display: "block", fontSize: "13px", marginBottom: "4px", color: "var(--ink-secondary)" }}>
            display name
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Steve"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="doodle-input"
            autoComplete="name"
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "13px", marginBottom: "4px", color: "var(--ink-secondary)" }}>
            email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="doodle-input"
            autoComplete="email"
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "13px", marginBottom: "4px", color: "var(--ink-secondary)" }}>
            password
          </label>
          <input
            type="password"
            required
            minLength={6}
            placeholder="at least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="doodle-input"
            autoComplete="new-password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="doodle-button active"
          style={{ width: "100%", marginTop: "8px", padding: "10px" }}
        >
          {loading ? "creating account..." : "create account"}
        </button>
      </form>

      <div style={{ textAlign: "center", marginTop: "24px", fontSize: "13px", color: "var(--ink-secondary)" }}>
        already have an account?{" "}
        <Link href="/login" style={{ color: "var(--ink-primary)", fontWeight: 600, textDecoration: "underline" }}>
          log in
        </Link>
      </div>
    </div>
  );
}
