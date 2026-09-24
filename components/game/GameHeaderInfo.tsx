"use client";

import React from "react";
import { Difficulty } from "@/lib/sudoku/types";
import { formatNotebookDate } from "@/lib/daily/streak";
import { DoodleIcon } from "../doodle/DoodleIcon";

interface GameHeaderInfoProps {
  title?: string;
  dateStr?: string | null;
  difficulty: Difficulty;
  elapsedSeconds: number;
  mistakes: number;
  isPaused: boolean;
  onTogglePause: () => void;
  showTimer?: boolean;
  showMistakes?: boolean;
  streak?: number;
  syncStatus?: "saved" | "saving" | "offline" | null;
}

export function GameHeaderInfo({
  title,
  dateStr,
  difficulty,
  elapsedSeconds,
  mistakes,
  isPaused,
  onTogglePause,
  showTimer = true,
  showMistakes = true,
  streak,
  syncStatus = null,
}: GameHeaderInfoProps) {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "var(--page-game, 500px)",
        margin: "0 auto 10px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        fontFamily: "var(--font-doodle)",
      }}
    >
      {/* Title */}
      <h1
        style={{
          fontSize: "24px",
          fontWeight: 600,
          color: "var(--ink-primary)",
          letterSpacing: "-0.2px",
          marginBottom: "2px",
          lineHeight: 1.2,
        }}
      >
        {title || (dateStr ? "daily sudoku" : "sudoku")}
      </h1>

      {/* Date & Metadata */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "14px",
          color: "var(--ink-secondary)",
          marginBottom: "8px",
        }}
      >
        {dateStr && <span>{formatNotebookDate(dateStr)}</span>}
        {dateStr && <span>·</span>}
        <span style={{ color: "var(--ink-primary)", fontWeight: 500 }}>
          {difficulty}
        </span>
        {streak !== undefined && streak > 0 && (
          <>
            <span>·</span>
            <span style={{ color: "var(--ink-primary)", display: "inline-flex", alignItems: "center", gap: "3px" }}>
              <DoodleIcon name="streak" size={13} />
              {streak} day streak
            </span>
          </>
        )}
      </div>

      {/* Timer & Mistakes Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          padding: "0 4px",
          fontSize: "14px",
          color: "var(--ink-secondary)",
        }}
      >
        {showTimer ? (
          <button
            type="button"
            onClick={onTogglePause}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "none",
              border: "1px dashed var(--border-subtle)",
              borderRadius: "4px",
              padding: "3px 8px",
              fontFamily: "var(--font-doodle)",
              fontSize: "14px",
              color: "var(--ink-primary)",
              cursor: "pointer",
              userSelect: "none",
              fontVariantNumeric: "tabular-nums",
            }}
            aria-label={isPaused ? "Resume game" : "Pause game"}
          >
            <DoodleIcon name={isPaused ? "play" : "clock"} size={14} />
            <span>{timeFormatted}</span>
            {isPaused && <span style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>(paused)</span>}
          </button>
        ) : (
          <div />
        )}

        {showMistakes && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
            }}
          >
            {syncStatus && (
              <span
                style={{
                  fontSize: "12px",
                  color: syncStatus === "offline" ? "var(--ink-muted)" : "var(--ink-secondary)",
                  opacity: 0.85,
                }}
              >
                {syncStatus === "saving" ? "syncing..." : syncStatus === "saved" ? "synced" : "offline"}
              </span>
            )}
            <span
              style={{
                color: mistakes > 0 ? "var(--error-ink)" : "var(--ink-secondary)",
                fontWeight: mistakes > 0 ? 600 : 400,
              }}
            >
              mistakes: {mistakes}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
