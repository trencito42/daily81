"use client";

import React, { useState, useEffect } from "react";
import { Difficulty, SudokuPuzzle } from "@/lib/sudoku/types";
import { generateSudoku } from "@/lib/sudoku/generator";
import { DIFFICULTY_CONFIG } from "@/lib/sudoku/constants";
import { SudokuGame } from "@/components/game/SudokuGame";

export default function PlayPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [puzzle, setPuzzle] = useState<SudokuPuzzle | null>(null);
  const [isChangingDifficulty, setIsChangingDifficulty] = useState<boolean>(false);

  const startNewGame = (diff: Difficulty) => {
    setDifficulty(diff);
    const newPuzzle = generateSudoku(diff);
    setPuzzle(newPuzzle);
    setIsChangingDifficulty(false);
  };

  useEffect(() => {
    startNewGame("medium");
  }, []);

  const difficulties: Difficulty[] = ["easy", "medium", "hard", "expert"];

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
          gap: "8px",
        }}
      >
        {difficulties.map((diff) => {
          const isActive = difficulty === diff;
          return (
            <button
              key={diff}
              type="button"
              onClick={() => startNewGame(diff)}
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

      {puzzle ? (
        <SudokuGame
          key={puzzle.puzzleKey}
          initialPuzzle={puzzle}
          isDaily={false}
          onPlayAnother={() => startNewGame(difficulty)}
        />
      ) : (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--ink-secondary)" }}>
          <span className="font-doodle">sharpening pencil...</span>
        </div>
      )}
    </div>
  );
}
