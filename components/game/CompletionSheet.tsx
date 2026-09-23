"use client";

import React, { useState } from "react";
import Link from "next/link";
import { XPBreakdown, Difficulty } from "@/lib/sudoku/types";
import { XPBar } from "../doodle/XPBar";

interface CompletionSheetProps {
  difficulty: Difficulty;
  elapsedSeconds: number;
  xpBreakdown: XPBreakdown;
  isDaily: boolean;
  dateStr?: string | null;
  onPlayAnother?: () => void;
}

export function CompletionSheet({
  difficulty,
  elapsedSeconds,
  xpBreakdown,
  isDaily,
  dateStr,
  onPlayAnother,
}: CompletionSheetProps) {
  const [copied, setCopied] = useState(false);

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const handleShare = () => {
    const text = isDaily
      ? `daily81 (${dateStr}) - ${difficulty.toUpperCase()}\nSolved in ${timeFormatted}\n+${xpBreakdown.totalXP} XP\nhttps://daily81.com`
      : `daily81 - ${difficulty.toUpperCase()}\nSolved in ${timeFormatted}\n+${xpBreakdown.totalXP} XP\nhttps://daily81.com`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "440px",
        margin: "20px auto",
        padding: "24px 20px",
        backgroundColor: "var(--bg-paper)",
        border: "2px solid var(--ink-primary)",
        borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px",
        textAlign: "center",
      }}
      className="animate-pop"
    >
      {/* Title */}
      <h2
        className="font-doodle"
        style={{
          fontSize: "24px",
          fontWeight: 400,
          color: "var(--ink-primary)",
          marginBottom: "4px",
        }}
      >
        problem solved
      </h2>

      {/* Time */}
      <div
        style={{
          fontSize: "28px",
          fontWeight: 700,
          fontFamily: "var(--font-mono)",
          color: "var(--ink-primary)",
          marginBottom: "16px",
        }}
      >
        {timeFormatted}
      </div>

      {/* XP Breakdown Table */}
      <div
        style={{
          width: "100%",
          maxWidth: "320px",
          margin: "0 auto 20px",
          fontSize: "14px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "var(--ink-secondary)" }}>
          <span style={{ textTransform: "capitalize" }}>{difficulty}</span>
          <span style={{ fontFamily: "var(--font-mono)" }}>+{xpBreakdown.baseXP} xp</span>
        </div>

        {xpBreakdown.noMistakesBonus > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "var(--ink-secondary)" }}>
            <span>no mistakes</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>+{xpBreakdown.noMistakesBonus} xp</span>
          </div>
        )}

        {xpBreakdown.noHintsBonus > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "var(--ink-secondary)" }}>
            <span>no hints</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>+{xpBreakdown.noHintsBonus} xp</span>
          </div>
        )}

        {xpBreakdown.dailyBonus > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "var(--ink-secondary)" }}>
            <span>daily puzzle</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>+{xpBreakdown.dailyBonus} xp</span>
          </div>
        )}

        {xpBreakdown.speedBonus > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "var(--ink-secondary)" }}>
            <span>speed bonus</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>+{xpBreakdown.speedBonus} xp</span>
          </div>
        )}

        <div style={{ height: "1.5px", backgroundColor: "var(--ink-primary)", margin: "8px 0" }} />

        <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontWeight: 700, fontSize: "15px" }}>
          <span>total</span>
          <span style={{ fontFamily: "var(--font-mono)" }}>+{xpBreakdown.totalXP} xp</span>
        </div>
      </div>

      {/* Level Progress */}
      <div style={{ marginBottom: "24px" }}>
        {xpBreakdown.levelUp && (
          <div
            className="font-doodle animate-pop"
            style={{
              fontSize: "16px",
              color: "var(--ink-primary)",
              marginBottom: "8px",
              display: "inline-block",
            }}
          >
            <span className="doodle-underline">level up! reached level {xpBreakdown.newLevel}</span>
          </div>
        )}
        <XPBar xp={xpBreakdown.newXP} />
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
        <button type="button" onClick={handleShare} className="doodle-button" style={{ fontSize: "13px" }}>
          {copied ? "copied!" : "share result"}
        </button>

        {isDaily ? (
          <Link href="/archive" className="doodle-button" style={{ textDecoration: "none", fontSize: "13px" }}>
            view archive
          </Link>
        ) : (
          <button
            type="button"
            onClick={onPlayAnother}
            className="doodle-button active"
            style={{ fontSize: "13px" }}
          >
            play another
          </button>
        )}
      </div>
    </div>
  );
}
