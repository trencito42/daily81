"use client";

import React, { useState, useEffect, useCallback, use, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SudokuBoard } from "@/components/game/SudokuBoard";
import { CellState } from "@/lib/sudoku/types";
import { parseGridString, stringifyGrid, isGridCompleteAndValid, getRow, getCol } from "@/lib/sudoku/validate";
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
      startedAt?: string;
      completedAt?: string;
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

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const startedRoundRef = useRef<number | null>(null);

  const cellsRef = useRef<CellState[]>([]);
  cellsRef.current = cells;

  const selectedIndexRef = useRef<number | null>(null);
  selectedIndexRef.current = selectedIndex;

  const pencilModeRef = useRef<boolean>(false);
  pencilModeRef.current = pencilMode;

  const submittingRef = useRef<boolean>(false);
  submittingRef.current = submitting;

  const dataRef = useRef<ChallengeDetails | null>(null);
  dataRef.current = data;

  const currentRoundIndexRef = useRef<number>(0);
  currentRoundIndexRef.current = currentRoundIndex;

  const timeAttackRemainingRef = useRef<number>(0);
  timeAttackRemainingRef.current = timeAttackRemaining;

  const timeAttackSolvedCountRef = useRef<number>(0);
  timeAttackSolvedCountRef.current = timeAttackSolvedCount;

  const fetchChallenge = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/challenges/${challengeId}`);
      if (res.status === 404) {
        setError("Challenge not found.");
        return;
      }
      if (res.status === 403) {
        setError("Access denied. This is a private challenge between other players.");
        return;
      }
      if (res.ok) {
        const json = await res.json();
        setData(json);

        const c = json.challenge;
        const uid = json.currentUserId;
        const myAttempts = c.attempts.filter((a: { userId: string; isCompleted: boolean }) => a.userId === uid && a.isCompleted);

        if (c.mode === "time_attack") {
          const myCompletedAttack = c.attempts.find((a: { userId: string; roundNumber: number }) => a.userId === uid && a.roundNumber === 0);
          if (myCompletedAttack?.isCompleted) {
            setTimeAttackSolvedCount(myCompletedAttack.puzzlesSolved);
          } else {
            const firstAttempt = c.attempts.find((a: { userId: string; roundNumber: number }) => a.userId === uid && a.roundNumber === 1);
            const limitSecs = (c.timeLimitMinutes || 15) * 60;
            if (firstAttempt?.startedAt) {
              const elapsedSinceStart = Math.floor((Date.now() - new Date(firstAttempt.startedAt).getTime()) / 1000);
              setTimeAttackRemaining(Math.max(0, limitSecs - elapsedSinceStart));
            } else {
              setTimeAttackRemaining(limitSecs);
            }
          }
        }

        // Determine which round to load
        const nextRoundNum = myAttempts.length + 1;
        const currentRound = c.rounds.find((r: { roundNumber: number }) => r.roundNumber === nextRoundNum) || c.rounds[0];

        if (currentRound && (!myAttempts.some((a: { roundNumber: number }) => a.roundNumber === currentRound.roundNumber))) {
          setCurrentRoundIndex(currentRound.roundNumber - 1);
          setCells(parseGridString(currentRound.initialGrid));

          // Set elapsed seconds from server start time if available
          const existingAttempt = c.attempts.find((a: { userId: string; roundNumber: number }) => a.userId === uid && a.roundNumber === currentRound.roundNumber);
          if (existingAttempt?.startedAt) {
            const serverElapsed = Math.max(0, Math.floor((Date.now() - new Date(existingAttempt.startedAt).getTime()) / 1000));
            setElapsedSeconds(serverElapsed);
          }
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

  // Ensure round is server-started when active
  useEffect(() => {
    if (!data || data.challenge.status !== "active") return;
    const c = data.challenge;
    const uid = data.currentUserId;
    const roundNumber = currentRoundIndex + 1;

    const myAttempt = c.attempts.find((a) => a.userId === uid && a.roundNumber === roundNumber);
    if (!myAttempt && startedRoundRef.current !== roundNumber) {
      startedRoundRef.current = roundNumber;
      fetch(`/api/challenges/${challengeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start_round", roundNumber }),
      }).then(async (res) => {
        if (res.ok) {
          const json = await res.json();
          if (json.startedAt) {
            const serverElapsed = Math.max(0, Math.floor((Date.now() - new Date(json.startedAt).getTime()) / 1000));
            setElapsedSeconds(serverElapsed);
          }
        }
      }).catch(() => {});
    }
  }, [data, currentRoundIndex, challengeId]);

  const handleTimeAttackFinish = useCallback(async () => {
    if (!dataRef.current || submittingRef.current) return;
    setSubmitting(true);
    try {
      await fetch(`/api/challenges/${challengeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "time_attack_finish" }),
      });
      fetchChallenge();
    } catch {
      // Fallback
    } finally {
      setSubmitting(false);
    }
  }, [challengeId, fetchChallenge]);

  // Timer Tick
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
            handleTimeAttackFinish();
            return 0;
          }
          return prev - 1;
        });
      } else {
        setElapsedSeconds((prev) => prev + 1);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [data, handleTimeAttackFinish]);

  const handleRespond = async (action: "accept" | "decline" | "cancel") => {
    try {
      const res = await fetch(`/api/challenges/${challengeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "respond", responseAction: action }),
      });
      if (res.ok) {
        if (action === "decline" || action === "cancel") {
          router.push("/challenges");
        } else {
          fetchChallenge();
        }
      } else {
        const err = await res.json();
        setFeedback(err.error || "Failed to respond to challenge.");
      }
    } catch {
      setFeedback("Network error.");
    }
  };

  const handleRoundCompleted = useCallback(async (solvedCells: CellState[]) => {
    if (!dataRef.current || submittingRef.current) return;
    setSubmitting(true);
    const c = dataRef.current.challenge;
    const roundNumber = currentRoundIndexRef.current + 1;
    const finalGrid = stringifyGrid(solvedCells);

    try {
      const res = await fetch(`/api/challenges/${challengeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_attempt",
          roundNumber,
          finalGrid,
          mistakes: 0,
          hintsUsed: 0,
        }),
      });

      if (res.ok) {
        if (c.mode === "time_attack") {
          const nextSolved = timeAttackSolvedCountRef.current + 1;
          setTimeAttackSolvedCount(nextSolved);

          const nextRound = c.rounds[roundNumber];
          if (nextRound && timeAttackRemainingRef.current > 0) {
            setCurrentRoundIndex(roundNumber);
            setCells(parseGridString(nextRound.initialGrid));
            setSelectedIndex(null);
            setHistory([]);
            startedRoundRef.current = null;
            setSubmitting(false);
            return;
          } else {
            // End of pre-generated rounds or time expired
            await handleTimeAttackFinish();
            return;
          }
        }

        setElapsedSeconds(0);
        setMistakes(0);
        setHistory([]);
        startedRoundRef.current = null;
        fetchChallenge();
      } else {
        const json = await res.json();
        setFeedback(json.error || "Attempt submission failed.");
      }
    } catch {
      setFeedback("Network error. Could not submit attempt.");
    } finally {
      setSubmitting(false);
    }
  }, [challengeId, fetchChallenge, handleTimeAttackFinish]);

  const handleNumberInput = useCallback((num: number) => {
    const selected = selectedIndexRef.current;
    const currentCells = cellsRef.current;
    if (selected === null || currentCells.length !== 81 || submittingRef.current) return;
    const cell = currentCells[selected];
    if (!cell || cell.given) return;

    if (pencilModeRef.current) {
      const currentNotes = cell.notes || [];
      const updatedNotes = currentNotes.includes(num)
        ? currentNotes.filter((n) => n !== num)
        : [...currentNotes, num].sort((a, b) => a - b);

      setCells((prev) =>
        prev.map((c, idx) => (idx === selected ? { ...c, notes: updatedNotes } : c))
      );
      return;
    }

    const prevVal = cell.value;
    const newVal = prevVal === num ? 0 : num;

    setHistory((prev) => [...prev, { index: selected, prevVal, newVal }]);

    const nextCells = currentCells.map((c, idx) =>
      idx === selected ? { ...c, value: newVal, notes: [] } : c
    );
    setCells(nextCells);

    // Check completion
    const gridStr = stringifyGrid(nextCells);
    if (!gridStr.includes("0") && isGridCompleteAndValid(gridStr)) {
      handleRoundCompleted(nextCells);
    }
  }, [handleRoundCompleted]);

  const handleErase = useCallback(() => {
    const selected = selectedIndexRef.current;
    const currentCells = cellsRef.current;
    if (selected === null || currentCells.length !== 81 || submittingRef.current) return;
    const cell = currentCells[selected];
    if (!cell || cell.given || cell.value === 0) return;

    setHistory((prev) => [...prev, { index: selected, prevVal: cell.value, newVal: 0 }]);
    setCells((prev) =>
      prev.map((c, idx) => (idx === selected ? { ...c, value: 0 } : c))
    );
  }, []);

  const handleUndo = useCallback(() => {
    if (submittingRef.current) return;
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setCells((currentCells) =>
        currentCells.map((c, idx) => (idx === last.index ? { ...c, value: last.prevVal } : c))
      );
      return prev.slice(0, -1);
    });
  }, []);

  // Keyboard navigation and shortcuts with e.repeat guard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        (document.activeElement.tagName === "INPUT" ||
          document.activeElement.tagName === "TEXTAREA" ||
          document.activeElement.tagName === "SELECT")
      ) {
        return;
      }

      if (!dataRef.current || dataRef.current.challenge.status !== "active") return;
      if (e.repeat) return;

      // Digits 1-9
      if (e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        handleNumberInput(parseInt(e.key, 10));
        return;
      }

      // Erase (Backspace, Delete, 0)
      if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
        e.preventDefault();
        handleErase();
        return;
      }

      // Pencil / Notes toggle (M or P)
      if (e.key.toLowerCase() === "m" || e.key.toLowerCase() === "p") {
        e.preventDefault();
        setPencilMode((prev) => !prev);
        return;
      }

      // Undo (Ctrl+Z or Cmd+Z)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Arrow Key Navigation
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        setSelectedIndex((curr) => {
          if (curr === null) return 0;
          const r = getRow(curr);
          const c = getCol(curr);

          if (e.key === "ArrowUp") return r > 0 ? (r - 1) * 9 + c : curr;
          if (e.key === "ArrowDown") return r < 8 ? (r + 1) * 9 + c : curr;
          if (e.key === "ArrowLeft") return c > 0 ? r * 9 + (c - 1) : curr;
          if (e.key === "ArrowRight") return c < 8 ? r * 9 + (c + 1) : curr;
          return curr;
        });
        return;
      }

      // Escape to deselect
      if (e.key === "Escape") {
        setSelectedIndex(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNumberInput, handleErase, handleUndo]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--ink-secondary)", fontFamily: "var(--font-doodle)" }}>
        <span>opening challenge arena...</span>
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
  const isPending = challenge.status === "pending";

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
          {challenge.status === "active" && (
            challenge.mode === "time_attack" ? (
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
            )
          )}
          {isPending && (
            <DoodleBadge variant="muted" size="sm">
              pending invite
            </DoodleBadge>
          )}
        </div>
      </DoodlePanel>

      {/* STATUS 0: PENDING INVITATION */}
      {isPending && (
        <DoodlePanel variant="default" tape="yellow" padding="lg" style={{ textAlign: "center", marginBottom: "20px" }}>
          {isChallenger ? (
            <div>
              <h2 style={{ fontSize: "19px", fontWeight: 600, marginBottom: "8px" }}>
                waiting for {opponent.displayName} to accept
              </h2>
              <p style={{ fontSize: "14px", color: "var(--ink-secondary)", lineHeight: 1.5, marginBottom: "16px" }}>
                The match will begin as soon as {opponent.displayName} accepts your invitation.
              </p>
              <DoodleButton size="sm" variant="ghost" onClick={() => handleRespond("cancel")}>
                cancel challenge
              </DoodleButton>
            </div>
          ) : (
            <div>
              <h2 style={{ fontSize: "19px", fontWeight: 600, marginBottom: "6px" }}>
                {challenge.challenger.displayName} challenged you!
              </h2>
              <div style={{ fontSize: "13px", color: "var(--ink-secondary)", marginBottom: "12px" }}>
                {challenge.mode.replace(/_/g, " ")} · {challenge.difficulty}
                {challenge.note && ` · "${challenge.note}"`}
              </div>
              <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                <DoodleButton size="sm" variant="primary" onClick={() => handleRespond("accept")}>
                  accept & play
                </DoodleButton>
                <DoodleButton size="sm" variant="secondary" onClick={() => handleRespond("decline")}>
                  decline
                </DoodleButton>
              </div>
            </div>
          )}
        </DoodlePanel>
      )}

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
              {challenge.winnerId === currentUserId ? "+25 XP awarded" : "+10 XP completion bonus"}
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
      {!isCompleted && !isPending && myFinished && (
        <DoodleEmptyState
          icon="check"
          title="puzzle solved!"
          description={`Your result is recorded. You will be notified as soon as ${opponent.displayName} finishes their run.`}
          actionLabel="← back to challenges"
          actionHref="/challenges"
        />
      )}

      {/* STATUS 3: ACTIVE PLAYING BOARD */}
      {!isCompleted && !isPending && !myFinished && cells.length === 81 && (
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
          <div style={{ width: "100%", maxWidth: "var(--page-game, 460px)", margin: "10px auto 0", display: "flex", flexDirection: "column", gap: "8px" }}>
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

          <div style={{ textAlign: "center", marginTop: "10px", fontSize: "12px", color: "var(--ink-secondary)" }}>
            competitive run · hints disabled
          </div>
        </div>
      )}
    </div>
  );
}
