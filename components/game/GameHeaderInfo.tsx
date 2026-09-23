"use client";

import React from "react";
import { Difficulty } from "@/lib/sudoku/types";
import { formatNotebookDate } from "@/lib/daily/streak";
import { PauseIcon, PlayIcon } from "../doodle/Icons";

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
}: GameHeaderInfoProps) {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "500px",
        margin: "0 auto 12px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      {/* Title & Date */}
      <h1
        style={{
          fontSize: "18px",
          fontWeight: 600,
          color: "var(--ink-primary)",
          letterSpacing: "-0.2px",
          marginBottom: "2px",
        }}
      >
        {title || (dateStr ? "daily sudoku" : "sudoku")}
      </h1>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontSize: "13px",
          color: "var(--ink-secondary)",
          marginBottom: "8px",
        }}
      >
        {dateStr && <span>{formatNotebookDate(dateStr)}</span>}
        {dateStr && <span>•</span>}
        <span
          style={{
            textTransform: "uppercase",
            fontWeight: 600,
            letterSpacing: "0.5px",
            fontSize: "12px",
            color: "var(--ink-primary)",
          }}
        >
          {difficulty}
        </span>
        {streak !== undefined && streak > 0 && (
          <>
            <span>•</span>
            <span className="font-doodle" style={{ color: "var(--ink-primary)" }}>
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
          fontSize: "13px",
          color: "var(--ink-secondary)",
        }}
      >
        {showTimer ? (
          <button
            type="button"
            onClick={onTogglePause}
            className="doodle-button doodle-button-sm doodle-button-ghost"
            style={{ padding: "2px 6px", fontFamily: "var(--font-mono)" }}
            aria-label={isPaused ? "Resume game" : "Pause game"}
          >
            {isPaused ? <PlayIcon /> : <PauseIcon />}
            <span>{timeFormatted}</span>
          </button>
        ) : (
          <div />
        )}

        {showMistakes && (
          <div style={{ fontFamily: "var(--font-doodle)", color: mistakes > 0 ? "var(--error-ink)" : "var(--ink-secondary)" }}>
            mistakes: {mistakes}
          </div>
        )}
      </div>
    </div>
  );
}
