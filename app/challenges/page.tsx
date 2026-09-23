"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

interface ChallengeItem {
  id: string;
  mode: string;
  difficulty: string;
  timeLimitMinutes?: number | null;
  sprintCount?: number | null;
  note?: string | null;
  status: string;
  winnerId?: string | null;
  isTie: boolean;
  createdAt: string;
  expiresAt: string;
  challengerId: string;
  opponentId: string;
  challenger: {
    id: string;
    username: string;
    displayName: string;
    level: number;
  };
  opponent: {
    id: string;
    username: string;
    displayName: string;
    level: number;
  };
  attempts: {
    id: string;
    userId: string;
    roundNumber: number;
    elapsedSeconds: number;
    puzzlesSolved: number;
    isCompleted: boolean;
  }[];
}

interface FriendOption {
  id: string;
  username: string;
  displayName: string;
  level: number;
}

function ChallengesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const opponentParam = searchParams.get("opponent") || "";

  const [activeTab, setActiveTab] = useState<"incoming" | "active" | "history" | "new">("incoming");
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(true);

  const [challenges, setChallenges] = useState<ChallengeItem[]>([]);
  const [friends, setFriends] = useState<FriendOption[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // New Challenge Form State
  const [targetUsername, setTargetUsername] = useState(opponentParam);
  const [selectedMode, setSelectedMode] = useState<"duel" | "best_of_3" | "time_attack" | "sprint" | "daily_duel">("duel");
  const [selectedDifficulty, setSelectedDifficulty] = useState<"easy" | "medium" | "hard" | "expert">("hard");
  const [timeLimit, setTimeLimit] = useState<number>(15);
  const [sprintCount, setSprintCount] = useState<number>(3);
  const [challengeNote, setChallengeNote] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadChallenges = useCallback(async () => {
    try {
      setLoading(true);
      const [resC, resF] = await Promise.all([
        fetch("/api/challenges"),
        fetch("/api/friends"),
      ]);

      if (resC.status === 401) {
        setAuthenticated(false);
        setLoading(false);
        return;
      }

      if (resC.ok) {
        const json = await resC.json();
        setChallenges(json.challenges || []);
        setCurrentUserId(json.currentUserId);
      }

      if (resF.ok) {
        const jsonF = await resF.json();
        setFriends(jsonF.friends?.map((f: { user: FriendOption }) => f.user) || []);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  useEffect(() => {
    if (opponentParam) {
      setTargetUsername(opponentParam);
      setActiveTab("new");
    }
  }, [opponentParam]);

  const handleRespond = async (challengeId: string, action: "accept" | "decline" | "cancel") => {
    try {
      const res = await fetch(`/api/challenges/${challengeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "respond", responseAction: action }),
      });
      if (res.ok) {
        setFeedback(action === "accept" ? "Challenge accepted! Launching puzzle..." : "Challenge updated.");
        if (action === "accept") {
          router.push(`/challenges/${challengeId}`);
        } else {
          loadChallenges();
        }
      }
    } catch {
      setFeedback("Failed to update challenge.");
    }
  };

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUsername.trim()) {
      setFeedback("Please choose an opponent.");
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUsername: targetUsername.trim(),
          mode: selectedMode,
          difficulty: selectedDifficulty,
          timeLimitMinutes: timeLimit,
          sprintCount,
          note: challengeNote.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback("Challenge sent!");
        router.push(`/challenges/${data.challengeId}`);
      } else {
        setFeedback(data.error || "Could not send challenge.");
      }
    } catch {
      setFeedback("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRematch = async (opponentUsername: string, mode: string, difficulty: string) => {
    setTargetUsername(opponentUsername);
    setSelectedMode(mode as "duel" | "best_of_3" | "time_attack" | "sprint" | "daily_duel");
    setSelectedDifficulty(difficulty as "easy" | "medium" | "hard" | "expert");
    setActiveTab("new");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const incomingChallenges = challenges.filter(
    (c) => c.status === "pending" && c.opponentId === currentUserId
  );
  const activeChallenges = challenges.filter(
    (c) => c.status === "active" || (c.status === "pending" && c.challengerId === currentUserId)
  );
  const historyChallenges = challenges.filter(
    (c) => c.status === "completed" || c.status === "declined" || c.status === "expired"
  );

  if (!authenticated) {
    return (
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          margin: "40px auto",
          padding: "24px 20px",
          textAlign: "center",
          border: "1.5px solid var(--ink-primary)",
          borderRadius: "255px 12px 225px 12px/12px 225px 12px 255px",
          backgroundColor: "var(--bg-paper)",
        }}
      >
        <h1 className="font-doodle" style={{ fontSize: "22px", marginBottom: "12px" }}>
          challenges
        </h1>
        <p style={{ color: "var(--ink-secondary)", fontSize: "14px", lineHeight: "1.6", marginBottom: "20px" }}>
          Sign in to challenge friends to asynchronous duels, sprints, and live time attacks.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <Link href="/login" className="doodle-button doodle-button-sm active" style={{ textDecoration: "none" }}>
            sign in
          </Link>
          <Link href="/register" className="doodle-button doodle-button-sm" style={{ textDecoration: "none" }}>
            register
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "520px",
        margin: "12px auto",
        padding: "16px 20px 48px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "16px",
        }}
      >
        <h1
          className="font-doodle"
          style={{
            fontSize: "24px",
            fontWeight: 400,
            color: "var(--ink-primary)",
          }}
        >
          challenges
        </h1>
        <Link
          href="/friends"
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--ink-secondary)",
            textDecoration: "none",
            borderBottom: "1px dashed var(--border-subtle)",
          }}
        >
          ← friends
        </Link>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          marginBottom: "20px",
          borderBottom: "1.5px solid var(--border-subtle)",
          paddingBottom: "8px",
          overflowX: "auto",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("incoming")}
          className={`doodle-button doodle-button-sm ${activeTab === "incoming" ? "active" : ""}`}
          style={{ fontSize: "13px", padding: "3px 10px", position: "relative" }}
        >
          invites
          {incomingChallenges.length > 0 && (
            <span
              style={{
                marginLeft: "6px",
                backgroundColor: "var(--error-ink)",
                color: "#fff",
                borderRadius: "50%",
                padding: "1px 5px",
                fontSize: "10px",
                fontWeight: 700,
              }}
            >
              {incomingChallenges.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("active")}
          className={`doodle-button doodle-button-sm ${activeTab === "active" ? "active" : ""}`}
          style={{ fontSize: "13px", padding: "3px 10px" }}
        >
          active ({activeChallenges.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`doodle-button doodle-button-sm ${activeTab === "history" ? "active" : ""}`}
          style={{ fontSize: "13px", padding: "3px 10px" }}
        >
          history
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("new")}
          className={`doodle-button doodle-button-sm ${activeTab === "new" ? "active" : ""}`}
          style={{ fontSize: "13px", padding: "3px 10px" }}
        >
          + new challenge
        </button>
      </div>

      {feedback && (
        <div
          style={{
            padding: "8px 12px",
            backgroundColor: "var(--highlight-cell)",
            borderRadius: "6px",
            fontSize: "13px",
            marginBottom: "16px",
          }}
        >
          {feedback}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "36px", color: "var(--ink-secondary)" }}>
          <span className="font-doodle">fetching notebook challenges...</span>
        </div>
      ) : (
        <>
          {/* TAB 1: INCOMING INVITES */}
          {activeTab === "incoming" && (
            <div>
              {incomingChallenges.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "36px 16px",
                    border: "1px dashed var(--border-subtle)",
                    borderRadius: "10px",
                    color: "var(--ink-secondary)",
                  }}
                >
                  <p style={{ fontSize: "14px", marginBottom: "12px" }}>no pending challenge invites.</p>
                  <button
                    onClick={() => setActiveTab("new")}
                    className="doodle-button doodle-button-sm active"
                  >
                    challenge a friend
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {incomingChallenges.map((c) => {
                    const opponent = c.challenger;
                    return (
                      <div
                        key={c.id}
                        style={{
                          padding: "14px 16px",
                          border: "1.5px solid var(--ink-primary)",
                          borderRadius: "255px 10px 225px 10px/10px 225px 10px 255px",
                          backgroundColor: "var(--highlight-cell)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <span style={{ fontWeight: 600, fontSize: "15px" }}>
                            {opponent.displayName} challenged you
                          </span>
                          <span style={{ fontSize: "12px", color: "var(--ink-secondary)", fontFamily: "var(--font-mono)" }}>
                            {c.difficulty}
                          </span>
                        </div>

                        <div style={{ fontSize: "13px", color: "var(--ink-secondary)" }}>
                          mode: <strong>{c.mode.replace(/_/g, " ")}</strong>
                          {c.mode === "time_attack" && ` (${c.timeLimitMinutes || 15}m)`}
                          {c.mode === "sprint" && ` (${c.sprintCount || 3} puzzles)`}
                          {c.note && ` · "${c.note}"`}
                        </div>

                        <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                          <button
                            type="button"
                            onClick={() => handleRespond(c.id, "accept")}
                            className="doodle-button doodle-button-sm active"
                            style={{ fontSize: "13px", padding: "4px 14px" }}
                          >
                            accept & play
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRespond(c.id, "decline")}
                            className="doodle-button doodle-button-sm"
                            style={{ fontSize: "13px", padding: "4px 12px" }}
                          >
                            decline
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ACTIVE / ONGOING */}
          {activeTab === "active" && (
            <div>
              {activeChallenges.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "36px 16px",
                    border: "1px dashed var(--border-subtle)",
                    borderRadius: "10px",
                    color: "var(--ink-secondary)",
                  }}
                >
                  <p style={{ fontSize: "14px", marginBottom: "12px" }}>no active challenges.</p>
                  <button
                    onClick={() => setActiveTab("new")}
                    className="doodle-button doodle-button-sm active"
                  >
                    start a challenge
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {activeChallenges.map((c) => {
                    const isSender = c.challengerId === currentUserId;
                    const peer = isSender ? c.opponent : c.challenger;
                    const myAttempt = c.attempts.find((a) => a.userId === currentUserId && a.isCompleted);

                    return (
                      <div
                        key={c.id}
                        style={{
                          padding: "12px 14px",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "255px 8px 225px 8px/8px 225px 8px 255px",
                          backgroundColor: "var(--bg-paper)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "14px" }}>
                            vs {peer.displayName}{" "}
                            <span style={{ fontSize: "12px", color: "var(--ink-secondary)", fontWeight: 400 }}>
                              ({c.difficulty} · {c.mode.replace(/_/g, " ")})
                            </span>
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--ink-secondary)", marginTop: "2px" }}>
                            {c.status === "pending"
                              ? "waiting for opponent to accept..."
                              : myAttempt
                              ? "you finished · awaiting opponent"
                              : "in progress"}
                          </div>
                        </div>

                        <div>
                          <Link
                            href={`/challenges/${c.id}`}
                            className="doodle-button doodle-button-sm active"
                            style={{ textDecoration: "none", fontSize: "12px", padding: "3px 10px" }}
                          >
                            {myAttempt ? "view" : "solve"}
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: HISTORY */}
          {activeTab === "history" && (
            <div>
              {historyChallenges.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "36px 16px",
                    border: "1px dashed var(--border-subtle)",
                    borderRadius: "10px",
                    color: "var(--ink-secondary)",
                  }}
                >
                  <p style={{ fontSize: "14px" }}>no challenge history yet.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {historyChallenges.map((c) => {
                    const isSender = c.challengerId === currentUserId;
                    const peer = isSender ? c.opponent : c.challenger;
                    const isWon = c.winnerId === currentUserId;
                    const isTie = c.isTie;
                    const resultText = isTie ? "tie" : isWon ? "won" : "lost";

                    const myAttempt = c.attempts.find((a) => a.userId === currentUserId && a.isCompleted);
                    const peerAttempt = c.attempts.find((a) => a.userId === peer.id && a.isCompleted);

                    return (
                      <div
                        key={c.id}
                        style={{
                          padding: "10px 12px",
                          borderBottom: "1px solid var(--border-subtle)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "14px",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            vs {peer.displayName}
                            <span
                              style={{
                                marginLeft: "8px",
                                fontSize: "12px",
                                fontWeight: 700,
                                color: isWon ? "var(--ink-primary)" : isTie ? "var(--ink-secondary)" : "var(--error-ink)",
                              }}
                            >
                              [{resultText}]
                            </span>
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--ink-secondary)", fontFamily: "var(--font-mono)" }}>
                            {c.difficulty} · {c.mode.replace(/_/g, " ")}
                            {myAttempt && peerAttempt && c.mode === "duel" && (
                              <span> · {formatTime(myAttempt.elapsedSeconds)} vs {formatTime(peerAttempt.elapsedSeconds)}</span>
                            )}
                            {myAttempt && peerAttempt && c.mode === "time_attack" && (
                              <span> · {myAttempt.puzzlesSolved} vs {peerAttempt.puzzlesSolved} solved</span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => handleRematch(peer.username, c.mode, c.difficulty)}
                            className="doodle-button doodle-button-sm"
                            style={{ fontSize: "12px", padding: "2px 8px" }}
                          >
                            rematch
                          </button>
                          <Link
                            href={`/challenges/${c.id}`}
                            style={{ fontSize: "12px", color: "var(--ink-secondary)", padding: "2px 6px", textDecoration: "none" }}
                          >
                            details
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: NEW CHALLENGE CREATOR */}
          {activeTab === "new" && (
            <form onSubmit={handleCreateChallenge} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Opponent Selection */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                  opponent
                </label>
                {friends.length > 0 && (
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                    {friends.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setTargetUsername(f.username)}
                        style={{
                          background: targetUsername === f.username ? "var(--ink-primary)" : "transparent",
                          color: targetUsername === f.username ? "var(--bg-paper)" : "var(--ink-primary)",
                          border: "1px solid var(--ink-primary)",
                          borderRadius: "255px 6px 225px 6px/6px 225px 6px 255px",
                          padding: "3px 8px",
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        {f.displayName} (@{f.username})
                      </button>
                    ))}
                  </div>
                )}
                <input
                  type="text"
                  placeholder="enter username..."
                  value={targetUsername}
                  onChange={(e) => setTargetUsername(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1.5px solid var(--ink-primary)",
                    borderRadius: "255px 8px 225px 8px/8px 225px 8px 255px",
                    backgroundColor: "var(--bg-paper)",
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
              </div>

              {/* Mode Selection */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                  challenge mode
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                  {[
                    { id: "duel", label: "same puzzle duel", desc: "1 puzzle · best time wins" },
                    { id: "best_of_3", label: "best of 3", desc: "3 rounds sequence" },
                    { id: "time_attack", label: "time attack", desc: "solve most in time limit" },
                    { id: "sprint", label: "sprint", desc: "combined lowest time" },
                    { id: "daily_duel", label: "daily duel", desc: "today's daily puzzle" },
                  ].map((m) => {
                    const isSel = selectedMode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMode(m.id as any)}
                        style={{
                          textAlign: "left",
                          padding: "8px 10px",
                          border: isSel ? "1.5px solid var(--ink-primary)" : "1px solid var(--border-subtle)",
                          borderRadius: "6px",
                          backgroundColor: isSel ? "var(--highlight-cell)" : "var(--bg-paper)",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ fontSize: "13px", fontWeight: 600 }}>{m.label}</div>
                        <div style={{ fontSize: "11px", color: "var(--ink-secondary)" }}>{m.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Difficulty Selection */}
              {selectedMode !== "daily_duel" && (
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                    difficulty
                  </label>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {(["easy", "medium", "hard", "expert"] as const).map((diff) => {
                      const isSel = selectedDifficulty === diff;
                      return (
                        <button
                          key={diff}
                          type="button"
                          onClick={() => setSelectedDifficulty(diff)}
                          className={`doodle-button doodle-button-sm ${isSel ? "active" : ""}`}
                          style={{ fontSize: "12px", padding: "3px 12px", flex: 1 }}
                        >
                          {diff}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Specific Mode Configs */}
              {selectedMode === "time_attack" && (
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                    time window
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {[15, 30, 60].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setTimeLimit(mins)}
                        className={`doodle-button doodle-button-sm ${timeLimit === mins ? "active" : ""}`}
                        style={{ fontSize: "12px", padding: "3px 12px" }}
                      >
                        {mins} minutes
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedMode === "sprint" && (
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                    sprint length
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {[3, 5].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setSprintCount(count)}
                        className={`doodle-button doodle-button-sm ${sprintCount === count ? "active" : ""}`}
                        style={{ fontSize: "12px", padding: "3px 12px" }}
                      >
                        {count} puzzles
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Friendly Note */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                  note (optional)
                </label>
                <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
                  {["good luck ✏", "your turn!", "rematch?"].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setChallengeNote(n)}
                      style={{
                        background: "none",
                        border: "1px dashed var(--border-subtle)",
                        borderRadius: "4px",
                        fontSize: "11px",
                        padding: "2px 6px",
                        cursor: "pointer",
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="leave a quick note..."
                  value={challengeNote}
                  maxLength={100}
                  onChange={(e) => setChallengeNote(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "6px",
                    backgroundColor: "var(--bg-paper)",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="doodle-button doodle-button-sm active"
                style={{
                  fontSize: "14px",
                  padding: "8px 16px",
                  marginTop: "8px",
                  alignSelf: "flex-start",
                }}
              >
                {submitting ? "sending challenge..." : "[ send challenge ]"}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

export default function ChallengesPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--ink-secondary)" }}>
          <span className="font-doodle">opening challenges...</span>
        </div>
      }
    >
      <ChallengesContent />
    </Suspense>
  );
}
