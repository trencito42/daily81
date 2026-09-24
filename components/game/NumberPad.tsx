"use client";

import React from "react";
import { DoodleIcon } from "../doodle/DoodleIcon";
import { DoodleButton } from "../doodle/DoodleButton";

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
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "min(calc(100vw - 28px), var(--board-max-size, 440px))",
        margin: "8px auto 0",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        fontFamily: "var(--font-doodle)",
        boxSizing: "border-box",
      }}
    >
      {/* 1-9 Digits Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(9, 1fr)",
          gap: "3px",
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
              disabled={disabled || isCompleted}
              onClick={() => onNumberClick(num)}
              aria-label={`Enter number ${num}, ${remaining} remaining`}
              className="numpad-btn"
              style={{
                backgroundColor: isCompleted ? "var(--bg-paper-alt)" : "var(--bg-paper)",
                color: isCompleted ? "var(--ink-muted)" : "var(--ink-primary)",
                cursor: disabled || isCompleted ? "default" : "pointer",
                opacity: isCompleted ? 0.35 : 1,
              }}
            >
              <span style={{ textDecoration: isCompleted ? "line-through" : "none" }}>{num}</span>
              {!isCompleted && remaining > 0 && remaining < 9 && (
                <span className="count-badge">
                  {remaining}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Action Controls Row: Pencil, Undo, Erase, Hint */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "5px",
          width: "100%",
        }}
      >
        <DoodleButton
          size="sm"
          variant={pencilMode ? "primary" : "default"}
          onClick={onPencilToggle}
          disabled={disabled}
          title="Toggle pencil notes mode (Key: M)"
          style={{ minHeight: "38px", padding: "4px 2px", fontSize: "13px" }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <DoodleIcon name="pencil" size={13} />
            <span>notes</span>
          </span>
        </DoodleButton>

        <DoodleButton
          size="sm"
          variant="default"
          onClick={onUndo}
          disabled={disabled || !canUndo}
          title="Undo last move (Ctrl+Z)"
          style={{ minHeight: "38px", padding: "4px 2px", fontSize: "13px", opacity: canUndo ? 1 : 0.4 }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <DoodleIcon name="undo" size={13} />
            <span>undo</span>
          </span>
        </DoodleButton>

        <DoodleButton
          size="sm"
          variant="default"
          onClick={onErase}
          disabled={disabled}
          title="Erase cell (Backspace / Delete)"
          style={{ minHeight: "38px", padding: "4px 2px", fontSize: "13px" }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <DoodleIcon name="erase" size={13} />
            <span>erase</span>
          </span>
        </DoodleButton>

        <DoodleButton
          size="sm"
          variant="default"
          onClick={onHint}
          disabled={disabled}
          title="Reveal a hint (reduces XP)"
          style={{ minHeight: "38px", padding: "4px 2px", fontSize: "13px" }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <DoodleIcon name="hint" size={13} />
            <span>hint</span>
          </span>
        </DoodleButton>
      </div>
    </div>
  );
}
