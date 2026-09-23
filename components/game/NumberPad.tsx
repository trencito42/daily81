"use client";

import React from "react";
import { PencilIcon, UndoIcon, EraseIcon, HintIcon } from "../doodle/Icons";

interface NumberPadProps {
  onNumberClick: (num: number) => void;
  onPencilToggle: () => void;
  onUndo: () => void;
  onErase: () => void;
  onHint: () => void;
  pencilMode: boolean;
  completedNumbers: number[]; // numbers with all 9 instances correctly placed
  numberCounts: Record<number, number>; // current count of each number on the board
  canUndo: boolean;
  disabled?: boolean;
}

export function NumberPad({
  onNumberClick,
  onPencilToggle,
  onUndo,
  onErase,
  onHint,
  pencilMode,
  completedNumbers,
  numberCounts,
  canUndo,
  disabled = false,
}: NumberPadProps) {
  return (
    <div style={{ width: "100%", maxWidth: "500px", margin: "14px auto 0", display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* 1-9 Digits Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(9, 1fr)",
          gap: "4px",
          width: "100%",
        }}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
          const isCompleted = completedNumbers.includes(num);
          const count = numberCounts[num] || 0;
          const remaining = Math.max(0, 9 - count);

          return (
            <button
              key={num}
              type="button"
              disabled={disabled}
              className={`numpad-btn ${isCompleted ? "completed" : ""}`}
              onClick={() => onNumberClick(num)}
              aria-label={`Enter number ${num}, ${remaining} remaining`}
            >
              <span>{num}</span>
              {!isCompleted && remaining > 0 && remaining < 9 && (
                <span className="count-badge">{remaining}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Action Controls Row: Pencil, Undo, Erase, Hint */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px",
          width: "100%",
        }}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={onPencilToggle}
          className={`doodle-button ${pencilMode ? "active" : ""}`}
          style={{ flex: 1, padding: "8px 4px", fontSize: "13px" }}
          title="Toggle pencil notes mode (Key: M)"
        >
          <PencilIcon active={pencilMode} />
          <span>pencil {pencilMode ? "on" : "off"}</span>
        </button>

        <button
          type="button"
          disabled={disabled || !canUndo}
          onClick={onUndo}
          className="doodle-button"
          style={{ flex: 1, padding: "8px 4px", fontSize: "13px", opacity: canUndo ? 1 : 0.4 }}
          title="Undo last move (Ctrl+Z)"
        >
          <UndoIcon />
          <span>undo</span>
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={onErase}
          className="doodle-button"
          style={{ flex: 1, padding: "8px 4px", fontSize: "13px" }}
          title="Erase cell (Backspace / Delete)"
        >
          <EraseIcon />
          <span>erase</span>
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={onHint}
          className="doodle-button"
          style={{ flex: 1, padding: "8px 4px", fontSize: "13px" }}
          title="Reveal a hint (reduces XP)"
        >
          <HintIcon />
          <span>hint</span>
        </button>
      </div>
    </div>
  );
}
