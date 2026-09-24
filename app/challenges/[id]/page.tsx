"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SudokuBoard } from "@/components/game/SudokuBoard";
import { CellState } from "@/lib/sudoku/types";
import { parseGridString, stringifyGrid, isGridCompleteAndValid } from "@/lib/sudoku/validate";
import { DoodleButton } from "@/components/doodle/DoodleButton";
import { DoodlePanel } from "@/components/doodle/DoodlePanel";
import { DoodleBadge } from "@/components/doodle/DoodleBadge";
import { DoodleNotice } from "@/components/doodle/DoodleNotice";
import { DoodleEmptyState } from "@/components/doodle/DoodleEmptyState";
import { DoodleDivider } from "@/components/doodle/DoodleDivider";
import { DoodleIcon } from "@/components/doodle/DoodleIcon";

interface ChallengeDetails {
  challenge: {
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
    rounds: {
      id: string;
      roundNumber: number;
      puzzleKey: string;
      initialGrid: string;
    }[];
    attempts: {
      id: string;
      userId: string;
      roundNumber: number;
      elapsedSeconds: number;
      puzzlesSolved: number;
      mistakes: number;
      hintsUsed: number;
      isCompleted: boolean;
    }[];
  };
  isParticipant: boolean;
  currentUserId: string | null;
}

export default function ChallengeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const challengeId = resolvedParams.id;
  const router = useRouter();

  const [data, setData] = useState<ChallengeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Game State for current participant
  const [currentRoundIndex, setCurrentRoundIndex] = useState<number>(0);
  const [cells, setCells] = useState<CellState[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [pencilMode, setPencilMode] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [mistakes, setMistakes] = useState<number>(0);
  const [history, setHistory] = useState<{ index: number; prevVal: number; newVal: number }[]>([]);

  // Time Attack state
  const [timeAttackRemaining, setTimeAttackRemaining] = useState<number>(0);
  const [timeAttackSolvedCount, setTimeAttackSolvedCount] = useState<number>(0);
  const [timeAttackTotalElapsed, setTimeAttackTotalElapsed] = useState<number>(0);

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchChallenge = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/challenges/${challengeId}`);
      if (res.status === 404) {
        setError("Challenge not found.");
        return;
      }
      if (res.ok) {
        const json = await res.json();
        setData(json);

        // Initial setup for current round puzzle
        const c = json.challenge;
        const uid = json.currentUserId;
        const myAttempts = c.attempts.filter((a: { userId: string; isCompleted: boolean }) => a.userId === uid && a.isCompleted);

        if (c.mode === "time_attack") {
          const myTimeAttackAttempt = c.attempts.find((a: { userId: string; roundNumber: number }) => a.userId === uid && a.roundNumber === 0);
          if (myTimeAttackAttempt?.isCompleted) {
            setTimeAttackSolvedCount(myTimeAttackAttempt.puzzlesSolved);
          } else {
            const limitSecs = (c.timeLimitMinutes || 15) * 60;
            setTimeAttackRemaining(limitSecs);
          }
        }

        // Determine which round to load
        const nextRoundNum = myAttempts.length + 1;
        const currentRound = c.rounds.find((r: { roundNumber: number }) => r.roundNumber === nextRoundNum) || c.rounds[0];

        if (currentRound && (!myAttempts.some((a: { roundNumber: number }) => a.roundNumber === currentRound.roundNumber))) {
          setCurrentRoundIndex(currentRound.roundNumber - 1);
          setCells(parseGridString(currentRound.initialGrid));
        }
      } else {
        setError("Failed to load challenge.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [challengeId]);

  useEffect(() => {
    fetchChallenge();
  }, [fetchChallenge]);

  // Solver Timer (Elapsed or Countdown for Time Attack)
  useEffect(() => {
    if (!data || data.challenge.status !== "active") return;
    const c = data.challenge;
    const uid = data.currentUserId;
    const myAttempts = c.attempts.filter((a) => a.userId === uid && a.isCompleted);

    const isFinished = c.mode === "time_attack"
      ? Boolean(c.attempts.find((a) => a.userId === uid && a.roundNumber === 0)?.isCompleted)
      : myAttempts.length >= (c.mode === "best_of_3" ? 3 : c.mode === "sprint" ? c.sprintCount || 3 : 1);

    if (isFinished) return;

    const timer = setInterval(() => {
      if (c.mode === "time_attack") {
        setTimeAttackRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleTimeAttackExpire();
            return 0;
          }
          return prev - 1;
        });
        setTimeAttackTotalElapsed((prev) => prev + 1);
      } else {
        setElapsedSeconds((prev) => prev + 1);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [data]);

  const handleTimeAttackExpire = async () => {
    if (!data || submitting) return;
    setSubmitting(true);
    try {
      await fetch(`/api/challenges/${challengeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete_time_attack",
          puzzlesSolved: timeAttackSolvedCount,
          elapsedSeconds: (data.challenge.timeLimitMinutes || 15) * 60,
        }),
      });
      fetchChallenge();
    } catch {
      // Fallback
    } finally {
      setSubmitting(false);
    }
  };

  const handleNumberInput = (num: number) => {
    if (selectedIndex === null || cells.length !== 81) return;
    const cell = cells[selectedIndex];
    if (cell.given) return;

    if (pencilMode) {
      const currentNotes = cell.notes || [];
      const updatedNotes = currentNotes.includes(num)
        ? currentNotes.filter((n) => n !== num)
        : [...currentNotes, num].sort((a, b) => a - b);

      setCells((prev) =>
        prev.map((c, idx) => (idx === selectedIndex ? { ...c, notes: updatedNotes } : c))
      );
      return;
    }

    const prevVal = cell.value;
    const newVal = prevVal === num ? 0 : num;

    setHistory((prev) => [...prev, { index: selectedIndex, prevVal, newVal }]);

    const nextCells = cells.map((c, idx) =>
      idx === selectedIndex ? { ...c, value: newVal, notes: [] } : c
    );
    setCells(nextCells);

    // Check completion
    const gridStr = stringifyGrid(nextCells);
    if (isGridCompleteAndValid(gridStr)) {
      handleRoundCompleted(nextCells);
    }
  };

  const handleErase = () => {
    if (selectedIndex === null || cells.length !== 81) return;
    const cell = cells[selectedIndex];
    if (cell.given || cell.value === 0) return;

    setHistory((prev) => [...prev, { index: selectedIndex, prevVal: cell.value, newVal: 0 }]);
    setCells((prev) =>
      prev.map((c, idx) => (idx === selectedIndex ? { ...c, value: 0 } : c))
    );
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setCells((prev) =>
      prev.map((c, idx) => (idx === last.index ? { ...c, value: last.prevVal } : c))
    );
  };

  const handleRoundCompleted = async (solvedCells: CellState[]) => {
    if (!data || submitting) return;
    setSubmitting(true);
    const c = data.challenge;
    const roundNumber = currentRoundIndex + 1;

    try {
      if (c.mode === "time_attack") {
        const nextSolved = timeAttackSolvedCount + 1;
        setTimeAttackSolvedCount(nextSolved);

        // Load next round puzzle in time attack sequence
        const nextRound = c.rounds[roundNumber];
        if (nextRound) {
          setCurrentRoundIndex(roundNumber);
          setCells(parseGridString(nextRound.initialGrid));
          setSelectedIndex(null);
          setHistory([]);
          setSubmitting(false);
          return;
        }
      }

      const res = await fetch(`/api/challenges/${challengeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_round",
          roundNumber,
          elapsedSeconds,
          mistakes,
        }),
      });

      if (res.ok) {
        setElapsedSeconds(0);
        setMistakes(0);
        setHistory([]);
        fetchChallenge();
      }
    } catch {
      // Fallback
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--ink-secondary)", fontFamily: "var(--font-doodle)" }}>
        <span>loading challenge arena...</span>
      </div>
    );
  }

  if (error || !data) {
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
          icon="warning"
          title={error || "Challenge not found"}
          actionLabel="← back to challenges"
          actionHref="/challenges"
        />
      </div>
    );
  }

  const { challenge, currentUserId } = data;
  const isChallenger = currentUserId === challenge.challengerId;
  const opponent = isChallenger ? challenge.opponent : challenge.challenger;

  const myAttempts = challenge.attempts.filter((a) => a.userId === currentUserId && a.isCompleted);
  const peerAttempts = challenge.attempts.filter((a) => a.userId === opponent.id && a.isCompleted);

  const totalRoundsExpected =
    challenge.mode === "best_of_3"
      ? 3
      : challenge.mode === "sprint"
      ? challenge.sprintCount || 3
      : 1;

  const myFinished = challenge.mode === "time_attack"
    ? Boolean(challenge.attempts.find((a) => a.userId === currentUserId && a.roundNumber === 0)?.isCompleted)
    : myAttempts.length >= totalRoundsExpected;

  const isCompleted = challenge.status === "completed";

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
      {/* Top Breadcrumb */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "12px" }}>
        <Link href="/challenges" style={{ fontSize: "13px", color: "var(--ink-secondary)", textDecoration: "none" }}>
          ← challenges
        </Link>
        <span style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>
          {challenge.difficulty} · {challenge.mode.replace(/_/g, " ")}
        </span>
      </div>

      {feedback && (
        <div style={{ marginBottom: "14px" }}>
          <DoodleNotice variant="info" onClose={() => setFeedback(null)}>
            {feedback}
          </DoodleNotice>
        </div>
      )}

      {/* Header Info: You vs Opponent */}
      <DoodlePanel
        variant="subtle"
        padding="sm"
        style={{
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: "15px", fontWeight: 600 }}>
            you vs {opponent.displayName}
          </div>
          <div style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>
            @{opponent.username} · Lv. {opponent.level}
            {challenge.note && ` · "${challenge.note}"`}
          </div>
        </div>

        <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
          {challenge.mode === "time_attack" ? (
            <div>
              <span style={{ fontSize: "18px", fontWeight: 700, color: timeAttackRemaining < 60 ? "var(--error-ink)" : "var(--ink-primary)" }}>
                {formatTime(timeAttackRemaining)}
              </span>
              <div style={{ fontSize: "11px", color: "var(--ink-secondary)" }}>
                {timeAttackSolvedCount} solved
              </div>
            </div>
          ) : (
            <div>
              <span style={{ fontSize: "16px", fontWeight: 600 }}>{formatTime(elapsedSeconds)}</span>
              {totalRoundsExpected > 1 && (
                <div style={{ fontSize: "11px", color: "var(--ink-secondary)" }}>
                  round {currentRoundIndex + 1}/{totalRoundsExpected}
                </div>
              )}
            </div>
          )}
        </div>
      </DoodlePanel>

      {/* STATUS 1: COMPLETED RESULTS CARD */}
      {isCompleted && (
        <DoodlePanel
          variant="highlight"
          tape="yellow"
          padding="lg"
          style={{ marginBottom: "20px" }}
        >
          <div style={{ textAlign: "center", marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "6px" }}>
              <DoodleIcon name="trophy" size={32} />
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: 600, margin: 0 }}>
              {challenge.isTie
                ? "duel ended in a tie"
                : challenge.winnerId === currentUserId
                ? "you won the challenge!"
                : `${opponent.displayName} won the challenge.`}
            </h2>
            <div style={{ fontSize: "13px", color: "var(--ink-secondary)", marginTop: "4px" }}>
              {challenge.winnerId === currentUserId ? "+20 XP awarded" : "+10 XP completion bonus"}
            </div>
          </div>

          <DoodleDivider spacing="sm" />

          {/* Results Summary Table */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontVariantNumeric: "tabular-nums" }}>
            {challenge.mode === "duel" || challenge.mode === "daily_duel" ? (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span>you: {formatTime(myAttempts[0]?.elapsedSeconds || 0)}</span>
                <span>{opponent.displayName}: {formatTime(peerAttempts[0]?.elapsedSeconds || 0)}</span>
              </div>
            ) : challenge.mode === "best_of_3" ? (
              [1, 2, 3].map((r) => {
                const a1 = myAttempts.find((a) => a.roundNumber === r);
                const a2 = peerAttempts.find((a) => a.roundNumber === r);
                return (
                  <div key={r} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                    <span>round {r}: you {formatTime(a1?.elapsedSeconds || 0)}</span>
                    <span>{opponent.displayName} {formatTime(a2?.elapsedSeconds || 0)}</span>
                  </div>
                );
              })
            ) : challenge.mode === "time_attack" ? (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span>you: {myAttempts[0]?.puzzlesSolved || 0} solved</span>
                <span>{opponent.displayName}: {peerAttempts[0]?.puzzlesSolved || 0} solved</span>
              </div>
            ) : (
              // Sprint
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span>you total: {formatTime(myAttempts.reduce((acc, a) => acc + a.elapsedSeconds, 0))}</span>
                <span>{opponent.displayName} total: {formatTime(peerAttempts.reduce((acc, a) => acc + a.elapsedSeconds, 0))}</span>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginTop: "16px" }}>
            <DoodleButton
              size="sm"
              variant="primary"
              href={`/challenges?opponent=${encodeURIComponent(opponent.username)}`}
              icon="swords"
            >
              rematch
            </DoodleButton>
            <DoodleButton
              size="sm"
              variant="secondary"
              href="/challenges"
            >
              challenges list
            </DoodleButton>
          </div>
        </DoodlePanel>
      )}

      {/* STATUS 2: WAITING FOR OPPONENT */}
      {!isCompleted && myFinished && (
        <DoodleEmptyState
          icon="check"
          title="puzzle solved!"
          description={`Your result is recorded. You will be notified as soon as ${opponent.displayName} finishes their run.`}
          actionLabel="← back to challenges"
          actionHref="/challenges"
        />
      )}

      {/* STATUS 3: ACTIVE PLAYING BOARD */}
      {!isCompleted && !myFinished && cells.length === 81 && (
        <div>
          {/* Sudoku 9x9 Board */}
          <SudokuBoard
            cells={cells}
            selectedIndex={selectedIndex}
            onSelectCell={(idx) => setSelectedIndex(idx)}
            highlightMatching={true}
            highlightRelated={true}
          />

          {/* Keypad */}
          <div style={{ width: "100%", maxWidth: "var(--page-game, 500px)", margin: "12px auto 0", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: "4px", width: "100%" }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  className="numpad-btn"
                  onClick={() => handleNumberInput(num)}
                  aria-label={`Enter number ${num}`}
                >
                  <span>{num}</span>
                </button>
              ))}
            </div>

            {/* Action buttons: Pencil, Undo, Erase (Hints disabled for competitive integrity) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
              <DoodleButton
                size="sm"
                variant={pencilMode ? "primary" : "default"}
                onClick={() => setPencilMode(!pencilMode)}
                icon="pencil"
              >
                notes {pencilMode ? "on" : "off"}
              </DoodleButton>

              <DoodleButton
                size="sm"
                variant="default"
                disabled={history.length === 0}
                onClick={handleUndo}
                icon="undo"
                style={{ opacity: history.length === 0 ? 0.4 : 1 }}
              >
                undo
              </DoodleButton>

              <DoodleButton
                size="sm"
                variant="default"
                onClick={handleErase}
                icon="erase"
              >
                erase
              </DoodleButton>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: "12px", fontSize: "12px", color: "var(--ink-secondary)" }}>
            competitive run · hints disabled
          </div>
        </div>
      )}
    </div>
  );
}
