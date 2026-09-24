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
        maxWidth: "var(--page-game, 500px)",
        margin: "12px auto 0",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        fontFamily: "var(--font-doodle)",
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
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "48px",
                width: "100%",
                backgroundColor: isCompleted ? "var(--bg-paper-alt)" : "var(--bg-paper)",
                color: isCompleted ? "var(--ink-muted)" : "var(--ink-primary)",
                borderStyle: "solid",
                borderWidth: "10px",
                borderImage: "url(/doodle/button.svg) 10 10 10 10 stretch stretch",
                fontFamily: "var(--font-doodle)",
                fontSize: "22px",
                fontWeight: 600,
                cursor: disabled || isCompleted ? "default" : "pointer",
                touchAction: "manipulation",
                userSelect: "none",
                position: "relative",
                padding: 0,
                opacity: isCompleted ? 0.35 : 1,
                lineHeight: 1,
                boxSizing: "border-box",
              }}
            >
              <span style={{ textDecoration: isCompleted ? "line-through" : "none" }}>{num}</span>
              {!isCompleted && remaining > 0 && remaining < 9 && (
                <span
                  style={{
                    position: "absolute",
                    bottom: "1px",
                    right: "3px",
                    fontSize: "10px",
                    color: "var(--ink-secondary)",
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
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
          gap: "6px",
          width: "100%",
        }}
      >
        <DoodleButton
          size="sm"
          variant={pencilMode ? "primary" : "default"}
          onClick={onPencilToggle}
          disabled={disabled}
          title="Toggle pencil notes mode (Key: M)"
          style={{ minHeight: "40px", padding: "6px 2px" }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <DoodleIcon name="pencil" size={14} />
            <span>notes</span>
          </span>
        </DoodleButton>

        <DoodleButton
          size="sm"
          variant="default"
          onClick={onUndo}
          disabled={disabled || !canUndo}
          title="Undo last move (Ctrl+Z)"
          style={{ minHeight: "40px", padding: "6px 2px", opacity: canUndo ? 1 : 0.4 }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <DoodleIcon name="undo" size={14} />
            <span>undo</span>
          </span>
        </DoodleButton>

        <DoodleButton
          size="sm"
          variant="default"
          onClick={onErase}
          disabled={disabled}
          title="Erase cell (Backspace / Delete)"
          style={{ minHeight: "40px", padding: "6px 2px" }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <DoodleIcon name="erase" size={14} />
            <span>erase</span>
          </span>
        </DoodleButton>

        <DoodleButton
          size="sm"
          variant="default"
          onClick={onHint}
          disabled={disabled}
          title="Reveal a hint (reduces XP)"
          style={{ minHeight: "40px", padding: "6px 2px" }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <DoodleIcon name="hint" size={14} />
            <span>hint</span>
          </span>
        </DoodleButton>
      </div>
    </div>
  );
}
