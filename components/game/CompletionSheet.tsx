"use client";

import React, { useState } from "react";
import Link from "next/link";
import { XPBreakdown, Difficulty } from "@/lib/sudoku/types";
import { XPBar } from "../doodle/XPBar";

interface CompletionSheetProps {
  difficulty: Difficulty;
  elapsedSeconds: number;
  xpBreakdown?: XPBreakdown | null;
  xpAwarded?: number;
  mistakes?: number;
  hintsUsed?: number;
  isDaily: boolean;
  dateStr?: string | null;
  rank?: number | null;
  isPractice?: boolean;
  onReplayPractice?: () => void;
  onPlayAnother?: () => void;
}

export function CompletionSheet({
  difficulty,
  elapsedSeconds,
  xpBreakdown,
  xpAwarded = 0,
  mistakes = 0,
  hintsUsed = 0,
  isDaily,
  dateStr,
  rank,
  isPractice = false,
  onReplayPractice,
  onPlayAnother,
}: CompletionSheetProps) {
  const [copied, setCopied] = useState(false);

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const totalXP = xpBreakdown ? xpBreakdown.totalXP : xpAwarded;

  const handleShare = () => {
    let text = "";
    if (isPractice) {
      text = `daily81 (practice) - ${difficulty.toUpperCase()}\nSolved in ${timeFormatted}\nhttps://daily81.com`;
    } else if (isDaily) {
      text = `daily81 (${dateStr || "today"}) - ${difficulty.toUpperCase()}\nSolved in ${timeFormatted}\n+${totalXP} XP${rank ? `\nRank #${rank}` : ""}\nhttps://daily81.com`;
    } else {
      text = `daily81 - ${difficulty.toUpperCase()}\nSolved in ${timeFormatted}\n+${totalXP} XP\nhttps://daily81.com`;
    }

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
        margin: "16px auto",
        padding: "24px 20px",
        backgroundColor: "var(--bg-paper)",
        border: "2px solid var(--ink-primary)",
        borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px",
        textAlign: "center",
        boxShadow: "3px 4px 0 var(--border-shadow, rgba(0, 0, 0, 0.08))",
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
        {isPractice ? "practice solved ✓" : isDaily ? "today's sudoku ✓" : "problem solved"}
      </h2>

      {dateStr && (
        <div
          style={{
            fontSize: "13px",
            color: "var(--ink-secondary)",
            marginBottom: "12px",
            fontFamily: "var(--font-mono)",
          }}
        >
          {dateStr} · {difficulty}
        </div>
      )}

      {/* Time */}
      <div
        style={{
          fontSize: "30px",
          fontWeight: 700,
          fontFamily: "var(--font-mono)",
          color: "var(--ink-primary)",
          marginBottom: "14px",
        }}
      >
        {timeFormatted}
      </div>

      {/* Stats / Breakdown */}
      {xpBreakdown ? (
        /* Detailed XP Breakdown Table for fresh completions */
        <div
          style={{
            width: "100%",
            maxWidth: "320px",
            margin: "0 auto 18px",
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
      ) : (
        /* Clean Summary for restored completions or practice */
        <div
          style={{
            width: "100%",
            maxWidth: "280px",
            margin: "0 auto 16px",
            fontSize: "14px",
            display: "flex",
            flexDirection: "column",
            gap: "5px",
            color: "var(--ink-secondary)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>mistakes</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink-primary)" }}>{mistakes}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>hints used</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink-primary)" }}>{hintsUsed}</span>
          </div>
          {!isPractice && totalXP > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, color: "var(--ink-primary)" }}>
              <span>xp earned</span>
              <span style={{ fontFamily: "var(--font-mono)" }}>+{totalXP} xp</span>
            </div>
          )}
          {isPractice && (
            <div style={{ fontSize: "12px", color: "var(--ink-secondary)", marginTop: "4px", fontStyle: "italic" }}>
              practice mode · official record unchanged
            </div>
          )}
        </div>
      )}

      {/* Rank Badge if available */}
      {rank && rank > 0 && !isPractice && (
        <div style={{ marginBottom: "16px" }}>
          <span
            style={{
              display: "inline-block",
              padding: "4px 12px",
              backgroundColor: "var(--highlight-cell, #f5f0e6)",
              border: "1px dashed var(--ink-secondary)",
              borderRadius: "255px 12px 225px 12px/12px 225px 12px 255px",
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--ink-primary)",
            }}
          >
            #{rank} today
          </span>
        </div>
      )}

      {/* Level Progress */}
      {xpBreakdown && (
        <div style={{ marginBottom: "20px" }}>
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
      )}

      {/* Action Buttons */}
      <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap", marginTop: "12px" }}>
        {isDaily && (
          <Link
            href={`/leaderboard?type=daily${dateStr ? `&date=${encodeURIComponent(dateStr)}` : ""}`}
            className="doodle-button"
            style={{ textDecoration: "none", fontSize: "13px" }}
          >
            view leaderboard
          </Link>
        )}

        {isDaily && onReplayPractice && (
          <button
            type="button"
            onClick={onReplayPractice}
            className="doodle-button active"
            style={{ fontSize: "13px" }}
          >
            replay for practice
          </button>
        )}

        {!isDaily && onPlayAnother && (
          <button
            type="button"
            onClick={onPlayAnother}
            className="doodle-button active"
            style={{ fontSize: "13px" }}
          >
            play another
          </button>
        )}

        <button type="button" onClick={handleShare} className="doodle-button" style={{ fontSize: "13px" }}>
          {copied ? "copied!" : "share result"}
        </button>
      </div>
    </div>
  );
}
