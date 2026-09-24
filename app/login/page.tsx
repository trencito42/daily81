"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DoodleInput } from "@/components/doodle/DoodleInput";
import { DoodleButton } from "@/components/doodle/DoodleButton";
import { DoodleNotice } from "@/components/doodle/DoodleNotice";

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
          marginBottom: "20px",
          textAlign: "center",
        }}
      >
        log in
      </h1>

      {error && (
        <div style={{ marginBottom: "16px" }}>
          <DoodleNotice variant="error" onClose={() => setError(null)}>
            {error}
          </DoodleNotice>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <DoodleInput
          label="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="your.email@example.com"
        />

        <DoodleInput
          label="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="••••••••"
        />

        <div style={{ marginTop: "8px" }}>
          <DoodleButton
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={loading}
          >
            {loading ? "signing in..." : "sign in"}
          </DoodleButton>
        </div>
      </form>

      <div style={{ textAlign: "center", marginTop: "24px", fontSize: "14px", color: "var(--ink-secondary)" }}>
        no account yet?{" "}
        <Link href="/register" style={{ color: "var(--ink-primary)", fontWeight: 600, textDecoration: "underline" }}>
          create one
        </Link>
      </div>
    </div>
  );
}
