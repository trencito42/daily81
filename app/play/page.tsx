"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Difficulty, PublicSudokuPuzzle } from "@/lib/sudoku/types";
import { SudokuGame } from "@/components/game/SudokuGame";
import { DoodleTabs } from "@/components/doodle/DoodleTabs";
import { DoodleNotice } from "@/components/doodle/DoodleNotice";
import { DoodleButton } from "@/components/doodle/DoodleButton";

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
              (s: { puzzleKey?: string }) => s.puzzleKey && !s.puzzleKey.startsWith("daily-") && !s.puzzleKey.startsWith("ch-")
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

  const difficultyTabs = [
    { id: "easy", label: "easy" },
    { id: "medium", label: "medium" },
    { id: "hard", label: "hard" },
    { id: "expert", label: "expert" },
  ];

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
          maxWidth: "var(--page-reading, 520px)",
          margin: "0 auto",
          padding: "6px 16px 0",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <DoodleTabs
          tabs={difficultyTabs}
          activeTab={difficulty}
          size="sm"
          onChange={(id) => {
            setActiveSession(null);
            loadPuzzle(id as Difficulty, true);
          }}
        />
      </div>

      {/* Active Session Resume Notice */}
      {activeSession && puzzle && activeSession.puzzleKey !== puzzle.puzzleKey && (
        <div
          style={{
            maxWidth: "var(--page-game, 500px)",
            margin: "8px auto 0",
            padding: "0 12px",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <DoodleNotice variant="warning">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: "8px" }}>
              <span>
                unfinished {activeSession.puzzle.difficulty} ({formatTime(activeSession.elapsedSeconds)})
              </span>
              <DoodleButton
                size="sm"
                variant="primary"
                onClick={() => {
                  setDifficulty(activeSession.puzzle.difficulty);
                  setPuzzle(activeSession.puzzle);
                  setActiveSession(null);
                }}
              >
                resume
              </DoodleButton>
            </div>
          </DoodleNotice>
        </div>
      )}

      {loading && !puzzle ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--ink-secondary)" }}>
          <span className="font-doodle" style={{ fontSize: "16px" }}>sharpening pencil...</span>
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
