"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
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
          marginBottom: "20px",
          textAlign: "center",
        }}
      >
        log in
      </h1>

      {error && (
        <div
          style={{
            padding: "8px 12px",
            backgroundColor: "var(--error-bg)",
            color: "var(--error-ink)",
            borderRadius: "6px",
            fontSize: "13px",
            marginBottom: "16px",
            fontFamily: "var(--font-sans)",
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="doodle-input"
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="doodle-button active"
          style={{ width: "100%", marginTop: "8px", padding: "10px" }}
        >
          {loading ? "signing in..." : "sign in"}
        </button>
      </form>

      <div style={{ textAlign: "center", marginTop: "24px", fontSize: "13px", color: "var(--ink-secondary)" }}>
        no account yet?{" "}
        <Link href="/register" style={{ color: "var(--ink-primary)", fontWeight: 600, textDecoration: "underline" }}>
          create one
        </Link>
      </div>
    </div>
  );
}
