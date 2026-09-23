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
  completedNumbers: number[];
  numberCounts: Record<number, number>;
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
  // 3 fixed border variants distributed cyclically A B C A B C A B C
  const variantClasses = [
    "numpad-btn-var1",
    "numpad-btn-var2",
    "numpad-btn-var3",
  ];

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "480px",
        margin: "14px auto 0",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      {/* 1-9 Digits Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(9, 1fr)",
          gap: "4px",
          width: "100%",
        }}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num, idx) => {
          const isCompleted = completedNumbers.includes(num);
          const count = numberCounts[num] || 0;
          const remaining = Math.max(0, 9 - count);
          const variantClass = variantClasses[idx % 3];

          return (
            <button
              key={num}
              type="button"
              disabled={disabled}
              className={`numpad-btn ${variantClass} ${isCompleted ? "completed" : ""}`}
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
          style={{
            flex: 1,
            minHeight: "44px",
            padding: "8px 6px",
            fontSize: "13px",
            borderRadius: "255px 10px 225px 12px/12px 225px 10px 255px",
          }}
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
          style={{
            flex: 1,
            minHeight: "44px",
            padding: "8px 6px",
            fontSize: "13px",
            borderRadius: "12px 255px 10px 225px/225px 12px 255px 10px",
            opacity: canUndo ? 1 : 0.4,
          }}
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
          style={{
            flex: 1,
            minHeight: "44px",
            padding: "8px 6px",
            fontSize: "13px",
            borderRadius: "225px 12px 255px 14px/14px 255px 12px 225px",
          }}
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
          style={{
            flex: 1,
            minHeight: "44px",
            padding: "8px 6px",
            fontSize: "13px",
            borderRadius: "10px 255px 12px 225px/225px 10px 255px 12px",
          }}
          title="Reveal a hint (reduces XP)"
        >
          <HintIcon />
          <span>hint</span>
        </button>
      </div>
    </div>
  );
}
