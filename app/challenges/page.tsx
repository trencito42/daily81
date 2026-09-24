"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DoodleTabs } from "@/components/doodle/DoodleTabs";
import { DoodleButton } from "@/components/doodle/DoodleButton";
import { DoodleInput } from "@/components/doodle/DoodleInput";
import { DoodleSelect } from "@/components/doodle/DoodleSelect";
import { DoodleBadge } from "@/components/doodle/DoodleBadge";
import { DoodleNotice } from "@/components/doodle/DoodleNotice";
import { DoodleEmptyState } from "@/components/doodle/DoodleEmptyState";
import { DoodleIcon } from "@/components/doodle/DoodleIcon";

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
          maxWidth: "var(--page-reading, 520px)",
          margin: "40px auto",
          padding: "0 16px",
          boxSizing: "border-box",
        }}
      >
        <DoodleEmptyState
          icon="swords"
          title="challenges"
          description="Sign in to challenge friends to asynchronous duels, sprints, and live time attacks."
          actionLabel="sign in to notebook →"
          actionHref="/login"
        />
      </div>
    );
  }

  const challengeTabs = [
    {
      id: "incoming",
      label: "invites",
      count: incomingChallenges.length > 0 ? incomingChallenges.length : undefined,
    },
    { id: "active", label: "active", count: activeChallenges.length },
    { id: "history", label: "history" },
    { id: "new", label: "+ new challenge" },
  ];

  const modeTabs = [
    { id: "duel", label: "duel" },
    { id: "best_of_3", label: "best of 3" },
    { id: "time_attack", label: "time attack" },
    { id: "sprint", label: "sprint" },
  ];

  const diffTabs = [
    { id: "easy", label: "easy" },
    { id: "medium", label: "medium" },
    { id: "hard", label: "hard" },
    { id: "expert", label: "expert" },
  ];

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
          style={{
            fontSize: "24px",
            fontWeight: 600,
            color: "var(--ink-primary)",
            margin: 0,
          }}
        >
          challenges
        </h1>
        <Link
          href="/friends"
          style={{
            fontSize: "13px",
            color: "var(--ink-secondary)",
            textDecoration: "none",
            borderBottom: "1px dashed var(--border-subtle)",
          }}
        >
          ← friends
        </Link>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: "16px" }}>
        <DoodleTabs
          tabs={challengeTabs}
          activeTab={activeTab}
          size="sm"
          onChange={(id) => {
            setActiveTab(id as any);
            setFeedback(null);
          }}
        />
      </div>

      {feedback && (
        <div style={{ marginBottom: "14px" }}>
          <DoodleNotice variant="info" onClose={() => setFeedback(null)}>
            {feedback}
          </DoodleNotice>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--ink-secondary)" }}>
          <span style={{ fontSize: "15px" }}>opening arena records...</span>
        </div>
      ) : activeTab === "incoming" ? (
        /* TAB 1: INCOMING INVITES */
        <div>
          {incomingChallenges.length === 0 ? (
            <DoodleEmptyState
              icon="swords"
              title="no pending challenge invites"
              description="Invite a friend to a duel or create a new challenge!"
              actionLabel="new challenge →"
              onAction={() => setActiveTab("new")}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {incomingChallenges.map((c) => {
                const opponent = c.challenger;
                return (
                  <div
                    key={c.id}
                    style={{
                      padding: "12px 4px",
                      borderBottom: "1px dashed var(--border-subtle)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontWeight: 600, fontSize: "15px" }}>
                        {opponent.displayName} challenged you
                      </span>
                      <DoodleBadge variant="highlight" size="sm">
                        {c.difficulty}
                      </DoodleBadge>
                    </div>

                    <div style={{ fontSize: "13px", color: "var(--ink-secondary)" }}>
                      mode: <strong>{c.mode.replace(/_/g, " ")}</strong>
                      {c.mode === "time_attack" && ` (${c.timeLimitMinutes || 15}m)`}
                      {c.mode === "sprint" && ` (${c.sprintCount || 3} puzzles)`}
                      {c.note && ` · "${c.note}"`}
                    </div>

                    <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                      <DoodleButton
                        size="sm"
                        variant="primary"
                        onClick={() => handleRespond(c.id, "accept")}
                      >
                        accept & play
                      </DoodleButton>
                      <DoodleButton
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRespond(c.id, "decline")}
                      >
                        decline
                      </DoodleButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === "active" ? (
        /* TAB 2: ACTIVE / ONGOING */
        <div>
          {activeChallenges.length === 0 ? (
            <DoodleEmptyState
              icon="swords"
              title="no active challenges"
              description="Start a match against a friend or invite someone to play."
              actionLabel="create challenge →"
              onAction={() => setActiveTab("new")}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {activeChallenges.map((c) => {
                const isMyTurn = true;
                const otherPlayer = c.challengerId === currentUserId ? c.opponent : c.challenger;
                const isSender = c.challengerId === currentUserId;

                return (
                  <div
                    key={c.id}
                    style={{
                      padding: "12px 4px",
                      borderBottom: "1px dashed var(--border-subtle)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "15px" }}>
                        vs {otherPlayer.displayName}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--ink-secondary)", marginTop: "2px" }}>
                        {c.mode.replace(/_/g, " ")} · {c.difficulty}
                        {c.status === "pending" && isSender && " · waiting for acceptance"}
                      </div>
                    </div>

                    <div>
                      <DoodleButton
                        size="sm"
                        variant="primary"
                        href={`/challenges/${c.id}`}
                      >
                        {c.status === "pending" ? "view" : "play match →"}
                      </DoodleButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === "history" ? (
        /* TAB 3: HISTORY */
        <div>
          {historyChallenges.length === 0 ? (
            <DoodleEmptyState
              icon="trophy"
              title="no completed challenges yet"
              description="Past duels, sprints, and completed challenge scores will be recorded here."
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {historyChallenges.map((c) => {
                const otherPlayer = c.challengerId === currentUserId ? c.opponent : c.challenger;
                const won = c.winnerId === currentUserId;
                const isTie = c.isTie;

                return (
                  <div
                    key={c.id}
                    style={{
                      padding: "10px 4px",
                      borderBottom: "1px dashed var(--border-subtle)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontWeight: 600, fontSize: "15px" }}>
                          vs {otherPlayer.displayName}
                        </span>
                        {c.status === "completed" ? (
                          <DoodleBadge
                            variant={won ? "highlight" : isTie ? "default" : "muted"}
                            size="sm"
                          >
                            {won ? "victory" : isTie ? "tie" : "defeat"}
                          </DoodleBadge>
                        ) : (
                          <DoodleBadge variant="muted" size="sm">
                            {c.status}
                          </DoodleBadge>
                        )}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--ink-secondary)", marginTop: "2px" }}>
                        {c.mode.replace(/_/g, " ")} · {c.difficulty}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "6px" }}>
                      <DoodleButton
                        size="sm"
                        variant="ghost"
                        href={`/challenges/${c.id}`}
                      >
                        details
                      </DoodleButton>
                      <DoodleButton
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRematch(otherPlayer.username, c.mode, c.difficulty)}
                        icon="refresh"
                      >
                        rematch
                      </DoodleButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* TAB 4: NEW CHALLENGE FORM */
        <form onSubmit={handleCreateChallenge} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Opponent Selection */}
          <div>
            <label
              style={{
                fontFamily: "var(--font-doodle)",
                fontSize: "14px",
                color: "var(--ink-secondary)",
                fontWeight: 500,
                display: "block",
                marginBottom: "4px",
              }}
            >
              opponent
            </label>
            {friends.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <DoodleSelect
                  value={targetUsername}
                  onChange={(e) => setTargetUsername(e.target.value)}
                >
                  <option value="">-- select from friends list --</option>
                  {friends.map((f) => (
                    <option key={f.id} value={f.username}>
                      {f.displayName} (@{f.username}) - Lv. {f.level}
                    </option>
                  ))}
                </DoodleSelect>
                <div style={{ fontSize: "12px", color: "var(--ink-secondary)", textAlign: "center" }}>
                  — or enter any username below —
                </div>
                <DoodleInput
                  placeholder="type username directly..."
                  value={targetUsername}
                  onChange={(e) => setTargetUsername(e.target.value)}
                />
              </div>
            ) : (
              <DoodleInput
                placeholder="enter opponent username..."
                value={targetUsername}
                onChange={(e) => setTargetUsername(e.target.value)}
              />
            )}
          </div>

          {/* Mode Selection */}
          <div>
            <label
              style={{
                fontFamily: "var(--font-doodle)",
                fontSize: "14px",
                color: "var(--ink-secondary)",
                fontWeight: 500,
                display: "block",
                marginBottom: "6px",
              }}
            >
              game mode
            </label>
            <DoodleTabs
              tabs={modeTabs}
              activeTab={selectedMode}
              size="sm"
              onChange={(id) => setSelectedMode(id as any)}
            />
          </div>

          {/* Difficulty */}
          <div>
            <label
              style={{
                fontFamily: "var(--font-doodle)",
                fontSize: "14px",
                color: "var(--ink-secondary)",
                fontWeight: 500,
                display: "block",
                marginBottom: "6px",
              }}
            >
              difficulty
            </label>
            <DoodleTabs
              tabs={diffTabs}
              activeTab={selectedDifficulty}
              size="sm"
              onChange={(id) => setSelectedDifficulty(id as any)}
            />
          </div>

          {/* Mode-specific settings */}
          {selectedMode === "time_attack" && (
            <div>
              <label
                style={{
                  fontFamily: "var(--font-doodle)",
                  fontSize: "14px",
                  color: "var(--ink-secondary)",
                  fontWeight: 500,
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                time limit (minutes)
              </label>
              <DoodleSelect
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
              >
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={20}>20 minutes</option>
              </DoodleSelect>
            </div>
          )}

          {selectedMode === "sprint" && (
            <div>
              <label
                style={{
                  fontFamily: "var(--font-doodle)",
                  fontSize: "14px",
                  color: "var(--ink-secondary)",
                  fontWeight: 500,
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                number of puzzles in sprint
              </label>
              <DoodleSelect
                value={sprintCount}
                onChange={(e) => setSprintCount(Number(e.target.value))}
              >
                <option value={2}>2 puzzles</option>
                <option value={3}>3 puzzles</option>
                <option value={5}>5 puzzles</option>
              </DoodleSelect>
            </div>
          )}

          {/* Note */}
          <div>
            <DoodleInput
              label="note for opponent (optional)"
              placeholder="e.g. race you on hard mode!"
              value={challengeNote}
              onChange={(e) => setChallengeNote(e.target.value)}
              maxLength={120}
            />
          </div>

          <div style={{ marginTop: "8px" }}>
            <DoodleButton
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={submitting || !targetUsername.trim()}
              icon="swords"
            >
              {submitting ? "sending challenge..." : "send challenge"}
            </DoodleButton>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ChallengesPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: "center", padding: "40px", color: "var(--ink-secondary)", fontFamily: "var(--font-doodle)" }}>
          opening challenges...
        </div>
      }
    >
      <ChallengesContent />
    </Suspense>
  );
}
