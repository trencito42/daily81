"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Difficulty, PublicSudokuPuzzle } from "@/lib/sudoku/types";
import { SudokuGame } from "@/components/game/SudokuGame";

interface ActiveSessionItem {
  sessionId: string;
  puzzleKey: string;
  puzzle: PublicSudokuPuzzle;
  elapsedSeconds: number;
  mistakes: number;
  hintsUsed: number;
}

export default function PlayPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [puzzle, setPuzzle] = useState<PublicSudokuPuzzle | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSessionItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Check for active sessions on load
  useEffect(() => {
    const fetchActiveSessions = async () => {
      try {
        const res = await fetch("/api/progress");
        if (res.ok) {
          const data = await res.json();
          if (data.activeSessions && data.activeSessions.length > 0) {
            // Find most recent incomplete play session (non-daily)
            const playSession = data.activeSessions.find(
              (s: any) => !s.puzzleKey.startsWith("daily-") && !s.puzzleKey.startsWith("ch-")
            );
            if (playSession) {
              setActiveSession(playSession);
            }
          }
        }
      } catch {
        // Fallback
      }
    };

    fetchActiveSessions();
  }, []);

  const loadPuzzle = useCallback(async (diff: Difficulty, forceNew = false) => {
    setLoading(true);
    setDifficulty(diff);
    try {
      const res = await fetch(`/api/puzzles/new?difficulty=${encodeURIComponent(diff)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.puzzle) {
          setPuzzle(data.puzzle);
        }
      }
    } catch (err) {
      console.error("Failed to load puzzle:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPuzzle("medium");
  }, [loadPuzzle]);

  const difficulties: Difficulty[] = ["easy", "medium", "hard", "expert"];

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div style={{ width: "100%", flex: 1, display: "flex", flexDirection: "column" }}>
      {/* Top Difficulty Selector Bar */}
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          margin: "0 auto",
          padding: "4px 16px 0",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        {difficulties.map((diff) => {
          const isActive = difficulty === diff;
          return (
            <button
              key={diff}
              type="button"
              onClick={() => {
                setActiveSession(null);
                loadPuzzle(diff, true);
              }}
              className={`doodle-button doodle-button-sm ${isActive ? "active" : ""}`}
              style={{
                textTransform: "lowercase",
                fontSize: "12px",
                padding: "3px 10px",
              }}
            >
              {diff}
            </button>
          );
        })}
      </div>

      {/* Active Session Resume Banner */}
      {activeSession && puzzle && activeSession.puzzleKey !== puzzle.puzzleKey && (
        <div
          style={{
            maxWidth: "440px",
            margin: "8px auto 0",
            padding: "6px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--highlight-cell)",
            border: "1px dashed var(--ink-secondary)",
            borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px",
            fontSize: "12px",
            fontFamily: "var(--font-doodle)",
            width: "90%",
            boxSizing: "border-box",
          }}
        >
          <span>
            unfinished {activeSession.puzzle.difficulty} ({formatTime(activeSession.elapsedSeconds)})
          </span>
          <button
            type="button"
            onClick={() => {
              setDifficulty(activeSession.puzzle.difficulty);
              setPuzzle(activeSession.puzzle);
              setActiveSession(null);
            }}
            className="doodle-button doodle-button-sm"
            style={{ fontSize: "11px", padding: "2px 8px" }}
          >
            resume →
          </button>
        </div>
      )}

      {loading && !puzzle ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--ink-secondary)" }}>
          <span className="font-doodle">sharpening pencil...</span>
        </div>
      ) : puzzle ? (
        <SudokuGame
          key={puzzle.puzzleKey}
          initialPuzzle={puzzle}
          isDaily={false}
          onPlayAnother={() => loadPuzzle(difficulty, true)}
        />
      ) : null}
    </div>
  );
}

