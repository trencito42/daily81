"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SudokuBoard } from "@/components/game/SudokuBoard";
import { PencilIcon, UndoIcon, EraseIcon } from "@/components/doodle/Icons";
import { CellState } from "@/lib/sudoku/types";
import { parseGridString, stringifyGrid, isGridCompleteAndValid } from "@/lib/sudoku/validate";

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

    // If all required rounds already completed, do not tick timer
    if (c.mode === "duel" || c.mode === "daily_duel") {
      if (myAttempts.length >= 1) return;
    } else if (c.mode === "best_of_3") {
      if (myAttempts.length >= 3) return;
    } else if (c.mode === "sprint") {
      if (myAttempts.length >= (c.sprintCount || 3)) return;
    } else if (c.mode === "time_attack") {
      const myTimeAttackAttempt = c.attempts.find((a) => a.userId === uid && a.roundNumber === 0);
      if (myTimeAttackAttempt?.isCompleted) return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
      if (c.mode === "time_attack") {
        setTimeAttackTotalElapsed((t) => t + 1);
        setTimeAttackRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleTimeAttackFinish();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [data]);

  // Handle cell value change / input
  const handleNumberInput = (num: number) => {
    if (selectedIndex === null || !cells[selectedIndex] || cells[selectedIndex].given) return;

    const cell = cells[selectedIndex];

    if (pencilMode) {
      const currentNotes = cell.notes || [];
      const newNotes = currentNotes.includes(num)
        ? currentNotes.filter((n) => n !== num)
        : [...currentNotes, num].sort((a, b) => a - b);

      const nextCells = [...cells];
      nextCells[selectedIndex] = { ...cell, notes: newNotes };
      setCells(nextCells);
      return;
    }

    // Set value
    const prevVal = cell.value;
    const newVal = cell.value === num ? 0 : num;

    setHistory((h) => [...h, { index: selectedIndex, prevVal, newVal }]);

    const nextCells = [...cells];
    nextCells[selectedIndex] = {
      ...cell,
      value: newVal,
      notes: [],
      isMistake: false,
    };
    setCells(nextCells);

    // Check if board is complete and valid
    if (newVal !== 0) {
      const currentGridStr = stringifyGrid(nextCells);
      if (currentGridStr.indexOf("0") === -1) {
        // No empty cells left, check validity
        if (isGridCompleteAndValid(currentGridStr)) {
          handleSubmitCurrentRound(currentGridStr);
        }
      }
    }
  };

  const handleErase = () => {
    if (selectedIndex === null || !cells[selectedIndex] || cells[selectedIndex].given) return;
    const cell = cells[selectedIndex];
    if (cell.value === 0 && (!cell.notes || cell.notes.length === 0)) return;

    setHistory((h) => [...h, { index: selectedIndex, prevVal: cell.value, newVal: 0 }]);
    const nextCells = [...cells];
    nextCells[selectedIndex] = { ...cell, value: 0, notes: [], isMistake: false };
    setCells(nextCells);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const lastMove = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));

    const nextCells = [...cells];
    const cell = nextCells[lastMove.index];
    if (cell && !cell.given) {
      nextCells[lastMove.index] = { ...cell, value: lastMove.prevVal, isMistake: false };
      setCells(nextCells);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!data || data.challenge.status !== "active") return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key >= "1" && e.key <= "9") {
        handleNumberInput(parseInt(e.key, 10));
      } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
        handleErase();
      } else if (e.key === "m" || e.key === "M") {
        setPencilMode((p) => !p);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
      } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        setSelectedIndex((prev) => {
          if (prev === null) return 0;
          const row = Math.floor(prev / 9);
          const col = prev % 9;
          if (e.key === "ArrowUp") return Math.max(0, row - 1) * 9 + col;
          if (e.key === "ArrowDown") return Math.min(8, row + 1) * 9 + col;
          if (e.key === "ArrowLeft") return row * 9 + Math.max(0, col - 1);
          if (e.key === "ArrowRight") return row * 9 + Math.min(8, col + 1);
          return prev;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cells, selectedIndex, pencilMode, history, data]);

  // Submit completed round solution
  const handleSubmitCurrentRound = async (finalGrid: string) => {
    if (!data || submitting) return;
    setSubmitting(true);

    const c = data.challenge;
    const roundNumber = currentRoundIndex + 1;

    try {
      const res = await fetch(`/api/challenges/${challengeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_attempt",
          roundNumber,
          finalGrid,
          elapsedSeconds,
          mistakes,
          hintsUsed: 0,
        }),
      });

      const resJson = await res.json();
      if (res.ok) {
        if (c.mode === "time_attack") {
          // In Time Attack: increment solved count and advance puzzle in sequence
          const newSolvedCount = timeAttackSolvedCount + 1;
          setTimeAttackSolvedCount(newSolvedCount);

          const nextRound = c.rounds.find((r) => r.roundNumber === roundNumber + 1);
          if (nextRound) {
            setCurrentRoundIndex(roundNumber);
            setCells(parseGridString(nextRound.initialGrid));
            setHistory([]);
          }
        } else {
          // Best of 3 / Sprint progression
          const maxRounds = c.mode === "best_of_3" ? 3 : c.mode === "sprint" ? (c.sprintCount || 3) : 1;
          if (roundNumber < maxRounds) {
            const nextRound = c.rounds.find((r) => r.roundNumber === roundNumber + 1);
            if (nextRound) {
              setCurrentRoundIndex(roundNumber);
              setCells(parseGridString(nextRound.initialGrid));
              setHistory([]);
              setFeedback(`Round ${roundNumber} solved! Next round ready.`);
            }
          } else {
            setFeedback("All rounds complete! Evaluating results...");
          }
        }

        fetchChallenge();
      } else {
        setFeedback(resJson.error || "Submission failed.");
      }
    } catch {
      setFeedback("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTimeAttackFinish = async () => {
    try {
      await fetch(`/api/challenges/${challengeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "time_attack_finish",
          puzzlesSolved: timeAttackSolvedCount,
          totalElapsedSeconds: timeAttackTotalElapsed,
          totalMistakes: mistakes,
        }),
      });
      fetchChallenge();
    } catch {
      // Fallback
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--ink-secondary)" }}>
        <span className="font-doodle">loading challenge arena...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          margin: "40px auto",
          padding: "24px 20px",
          textAlign: "center",
          border: "1px dashed var(--border-subtle)",
          borderRadius: "10px",
        }}
      >
        <p style={{ color: "var(--ink-secondary)", marginBottom: "16px" }}>{error || "Challenge not found."}</p>
        <Link href="/challenges" className="doodle-button doodle-button-sm">
          ← back to challenges
        </Link>
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
        maxWidth: "520px",
        margin: "12px auto",
        padding: "16px 20px 48px",
      }}
    >
      {/* Top Breadcrumb */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "12px" }}>
        <Link href="/challenges" style={{ fontSize: "13px", color: "var(--ink-secondary)", textDecoration: "none" }}>
          ← challenges
        </Link>
        <span style={{ fontSize: "12px", color: "var(--ink-secondary)", fontFamily: "var(--font-mono)" }}>
          {challenge.difficulty} · {challenge.mode.replace(/_/g, " ")}
        </span>
      </div>

      {feedback && (
        <div
          style={{
            padding: "8px 12px",
            backgroundColor: "var(--highlight-cell)",
            borderRadius: "6px",
            fontSize: "13px",
            marginBottom: "14px",
          }}
        >
          {feedback}
        </div>
      )}

      {/* Header Info: You vs Opponent */}
      <div
        style={{
          border: "1.5px solid var(--ink-primary)",
          borderRadius: "255px 10px 225px 10px/10px 225px 10px 255px",
          padding: "12px 16px",
          backgroundColor: "var(--bg-paper)",
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: "15px", fontWeight: 700 }}>
            you vs {opponent.displayName}
          </div>
          <div style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>
            @{opponent.username} · Lv. {opponent.level}
            {challenge.note && ` · "${challenge.note}"`}
          </div>
        </div>

        <div style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>
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
              <span style={{ fontSize: "16px", fontWeight: 700 }}>{formatTime(elapsedSeconds)}</span>
              {totalRoundsExpected > 1 && (
                <div style={{ fontSize: "11px", color: "var(--ink-secondary)" }}>
                  round {currentRoundIndex + 1}/{totalRoundsExpected}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* STATUS 1: COMPLETED RESULTS CARD */}
      {isCompleted && (
        <div
          style={{
            border: "2px solid var(--ink-primary)",
            borderRadius: "255px 12px 225px 12px/12px 225px 12px 255px",
            padding: "20px",
            backgroundColor: "var(--highlight-cell)",
            marginBottom: "20px",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "16px" }}>
            <h2 className="font-doodle" style={{ fontSize: "22px", margin: 0 }}>
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

          {/* Results Summary Table */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: "1px dashed var(--border-subtle)", paddingTop: "12px" }}>
            {challenge.mode === "duel" || challenge.mode === "daily_duel" ? (
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: "15px" }}>
                <span>you: {formatTime(myAttempts[0]?.elapsedSeconds || 0)}</span>
                <span>{opponent.displayName}: {formatTime(peerAttempts[0]?.elapsedSeconds || 0)}</span>
              </div>
            ) : challenge.mode === "best_of_3" ? (
              [1, 2, 3].map((r) => {
                const a1 = myAttempts.find((a) => a.roundNumber === r);
                const a2 = peerAttempts.find((a) => a.roundNumber === r);
                return (
                  <div key={r} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontFamily: "var(--font-mono)" }}>
                    <span>round {r}: you {formatTime(a1?.elapsedSeconds || 0)}</span>
                    <span>{opponent.displayName} {formatTime(a2?.elapsedSeconds || 0)}</span>
                  </div>
                );
              })
            ) : challenge.mode === "time_attack" ? (
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: "15px" }}>
                <span>you: {myAttempts[0]?.puzzlesSolved || 0} solved</span>
                <span>{opponent.displayName}: {peerAttempts[0]?.puzzlesSolved || 0} solved</span>
              </div>
            ) : (
              // Sprint
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: "14px" }}>
                <span>you total: {formatTime(myAttempts.reduce((acc, a) => acc + a.elapsedSeconds, 0))}</span>
                <span>{opponent.displayName} total: {formatTime(peerAttempts.reduce((acc, a) => acc + a.elapsedSeconds, 0))}</span>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "18px" }}>
            <Link
              href={`/challenges?opponent=${encodeURIComponent(opponent.username)}`}
              className="doodle-button doodle-button-sm active"
              style={{ textDecoration: "none", fontSize: "13px", padding: "6px 16px" }}
            >
              rematch ✏
            </Link>
            <Link
              href="/challenges"
              className="doodle-button doodle-button-sm"
              style={{ textDecoration: "none", fontSize: "13px", padding: "6px 14px" }}
            >
              challenges list
            </Link>
          </div>
        </div>
      )}

      {/* STATUS 2: WAITING FOR OPPONENT */}
      {!isCompleted && myFinished && (
        <div
          style={{
            border: "1.5px solid var(--ink-primary)",
            borderRadius: "255px 10px 225px 10px/10px 225px 10px 255px",
            padding: "24px 20px",
            textAlign: "center",
            backgroundColor: "var(--bg-paper)",
            marginBottom: "20px",
          }}
        >
          <h2 className="font-doodle" style={{ fontSize: "20px", marginBottom: "8px" }}>
            puzzle solved!
          </h2>
          <p style={{ fontSize: "14px", color: "var(--ink-secondary)", lineHeight: "1.6", marginBottom: "16px" }}>
            Your result is recorded. You will be notified as soon as {opponent.displayName} finishes their challenge run.
          </p>
          <Link href="/challenges" className="doodle-button doodle-button-sm active" style={{ textDecoration: "none" }}>
            ← back to challenges
          </Link>
        </div>
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
          <div style={{ width: "100%", maxWidth: "500px", margin: "14px auto 0", display: "flex", flexDirection: "column", gap: "10px" }}>
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
            <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setPencilMode(!pencilMode)}
                className={`doodle-button ${pencilMode ? "active" : ""}`}
                style={{ flex: 1, padding: "8px 4px", fontSize: "13px" }}
              >
                <PencilIcon active={pencilMode} />
                <span>pencil {pencilMode ? "on" : "off"}</span>
              </button>

              <button
                type="button"
                disabled={history.length === 0}
                onClick={handleUndo}
                className="doodle-button"
                style={{ flex: 1, padding: "8px 4px", fontSize: "13px", opacity: history.length === 0 ? 0.4 : 1 }}
              >
                <UndoIcon />
                <span>undo</span>
              </button>

              <button
                type="button"
                onClick={handleErase}
                className="doodle-button"
                style={{ flex: 1, padding: "8px 4px", fontSize: "13px" }}
              >
                <EraseIcon />
                <span>erase</span>
              </button>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: "14px", fontSize: "12px", color: "var(--ink-secondary)", fontFamily: "var(--font-doodle)" }}>
            competitive run • hints disabled
          </div>
        </div>
      )}
    </div>
  );
}
