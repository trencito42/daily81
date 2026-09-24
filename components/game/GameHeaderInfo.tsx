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
        maxWidth: "480px",
        margin: "0 auto 10px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      {/* Title & Date */}
      <h1
        className="font-doodle"
        style={{
          fontSize: "22px",
          fontWeight: 400,
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
          gap: "8px",
          fontSize: "13px",
          color: "var(--ink-secondary)",
          marginBottom: "6px",
        }}
      >
        {dateStr && <span>{formatNotebookDate(dateStr)}</span>}
        {dateStr && <span>•</span>}
        <span
          className="font-doodle"
          style={{
            fontSize: "13px",
            color: "var(--ink-primary)",
          }}
        >
          {difficulty}
        </span>
        {streak !== undefined && streak > 0 && (
          <>
            <span>•</span>
            <span className="font-doodle" style={{ color: "var(--ink-primary)" }}>
              {streak}d streak
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
          padding: "0 2px",
          fontSize: "13px",
          color: "var(--ink-secondary)",
        }}
      >
        {showTimer ? (
          <button
            type="button"
            onClick={onTogglePause}
            className="doodle-button doodle-button-sm doodle-button-ghost"
            style={{
              padding: "2px 8px",
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              borderRadius: "255px 6px 225px 6px/6px 225px 6px 255px",
            }}
            aria-label={isPaused ? "Resume game" : "Pause game"}
          >
            {isPaused ? <PlayIcon /> : <PauseIcon />}
            <span>{timeFormatted}</span>
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
              fontSize: "13px",
            }}
          >
            {syncStatus && (
              <span
                style={{
                  fontSize: "11px",
                  color: syncStatus === "offline" ? "var(--ink-muted)" : "var(--ink-secondary)",
                  opacity: 0.8,
                  fontFamily: "var(--font-doodle)",
                }}
              >
                {syncStatus === "saving" ? "syncing..." : syncStatus === "saved" ? "synced" : "offline"}
              </span>
            )}
            <span
              className="font-doodle"
              style={{
                color: mistakes > 0 ? "var(--error-ink)" : "var(--ink-secondary)",
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
