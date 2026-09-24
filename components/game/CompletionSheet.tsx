"use client";

import React, { useState } from "react";
import { XPBreakdown, Difficulty } from "@/lib/sudoku/types";
import { XPBar } from "../doodle/XPBar";
import { DoodlePanel } from "../doodle/DoodlePanel";
import { DoodleBadge } from "../doodle/DoodleBadge";
import { DoodleButton } from "../doodle/DoodleButton";
import { DoodleDivider } from "../doodle/DoodleDivider";
import { DoodleIcon } from "../doodle/DoodleIcon";
import { DoodleUnderline } from "../doodle/DoodleUnderline";

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
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const totalXP = xpBreakdown ? xpBreakdown.totalXP : xpAwarded;

  const nextDailyInfo = React.useMemo(() => {
    if (!isDaily || typeof window === "undefined") return null;
    const now = new Date();
    const nextUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
    try {
      const timeStr = nextUTC.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const hoursLeft = Math.max(1, Math.round((nextUTC.getTime() - now.getTime()) / (1000 * 60 * 60)));
      return { timeStr, hoursLeft };
    } catch {
      return null;
    }
  }, [isDaily]);

  const handleShare = async () => {
    let text = "";
    if (isPractice) {
      text = `daily81 (practice) - ${difficulty.toUpperCase()}\nSolved in ${timeFormatted}\nhttps://daily81.com`;
    } else if (isDaily) {
      text = `daily81 (${dateStr || "today"}) - ${difficulty.toUpperCase()}\nSolved in ${timeFormatted}\n+${totalXP} XP${rank ? `\nRank #${rank}` : ""}\nhttps://daily81.com`;
    } else {
      text = `daily81 - ${difficulty.toUpperCase()}\nSolved in ${timeFormatted}\n+${totalXP} XP\nhttps://daily81.com`;
    }

    let success = false;
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        success = true;
      } catch {
        success = false;
      }
    }

    // Fallback using textarea execCommand
    if (!success && typeof document !== "undefined") {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "-9999px";
        textarea.setAttribute("readonly", "");
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        success = document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch {
        success = false;
      }
    }

    if (success) {
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } else {
      setCopyStatus("error");
      setTimeout(() => setCopyStatus("idle"), 3000);
    }
  };

  return (
    <DoodlePanel
      variant="default"
      tape="yellow"
      padding="lg"
      className="animate-pop"
      style={{
        width: "100%",
        maxWidth: "460px",
        margin: "16px auto",
        textAlign: "center",
      }}
    >
      {/* Trophy / Check Graphic */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px", color: "var(--ink-primary)" }}>
        <DoodleIcon name="trophy" size={36} />
      </div>

      {/* Title */}
      <h2
        style={{
          fontSize: "22px",
          fontWeight: 600,
          color: "var(--ink-primary)",
          marginBottom: "4px",
          lineHeight: 1.2,
        }}
      >
        {isPractice ? "practice solved" : isDaily ? "today's sudoku solved" : "puzzle solved"}
      </h2>

      {dateStr && (
        <div
          style={{
            fontSize: "13px",
            color: "var(--ink-secondary)",
            marginBottom: "10px",
          }}
        >
          {dateStr} · {difficulty}
        </div>
      )}

      {/* Time */}
      <div
        style={{
          fontSize: "32px",
          fontWeight: 600,
          color: "var(--ink-primary)",
          marginBottom: "12px",
          fontVariantNumeric: "tabular-nums",
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
            margin: "0 auto 14px",
            fontSize: "14px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", color: "var(--ink-secondary)" }}>
            <span style={{ textTransform: "capitalize" }}>{difficulty}</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>+{xpBreakdown.baseXP} xp</span>
          </div>

          {xpBreakdown.noMistakesBonus > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", color: "var(--ink-secondary)" }}>
              <span>no mistakes bonus</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>+{xpBreakdown.noMistakesBonus} xp</span>
            </div>
          )}

          {xpBreakdown.noHintsBonus > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", color: "var(--ink-secondary)" }}>
              <span>no hints bonus</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>+{xpBreakdown.noHintsBonus} xp</span>
            </div>
          )}

          {xpBreakdown.dailyBonus > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", color: "var(--ink-secondary)" }}>
              <span>daily puzzle bonus</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>+{xpBreakdown.dailyBonus} xp</span>
            </div>
          )}

          {xpBreakdown.speedBonus > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", color: "var(--ink-secondary)" }}>
              <span>speed bonus</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>+{xpBreakdown.speedBonus} xp</span>
            </div>
          )}

          <DoodleDivider spacing="sm" />

          <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontWeight: 700, fontSize: "15px", color: "var(--ink-primary)" }}>
            <span>total earned</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>+{xpBreakdown.totalXP} xp</span>
          </div>
        </div>
      ) : (
        /* Clean Summary for restored completions or practice */
        <div
          style={{
            width: "100%",
            maxWidth: "280px",
            margin: "0 auto 14px",
            fontSize: "14px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            color: "var(--ink-secondary)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>mistakes</span>
            <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--ink-primary)" }}>{mistakes}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>hints used</span>
            <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--ink-primary)" }}>{hintsUsed}</span>
          </div>
          {!isPractice && totalXP > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, color: "var(--ink-primary)" }}>
              <span>xp earned</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>+{totalXP} xp</span>
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
        <div style={{ marginBottom: "14px" }}>
          <DoodleBadge variant="highlight" size="md" icon="trophy">
            #{rank} today
          </DoodleBadge>
        </div>
      )}

      {/* Level Progress */}
      {xpBreakdown && (
        <div style={{ marginBottom: "18px" }}>
          {xpBreakdown.levelUp && (
            <div
              style={{
                fontSize: "15px",
                color: "var(--ink-primary)",
                marginBottom: "8px",
                position: "relative",
                display: "inline-block",
              }}
            >
              <span>level up! reached level {xpBreakdown.newLevel}</span>
              <DoodleUnderline />
            </div>
          )}
          <XPBar xp={xpBreakdown.newXP} />
        </div>
      )}

      {/* Next Daily Puzzle Unlock Indicator */}
      {isDaily && nextDailyInfo && (
        <div
          style={{
            fontSize: "12px",
            color: "var(--ink-secondary)",
            margin: "6px 0 10px",
            fontStyle: "italic",
          }}
        >
          next daily sudoku appears at {nextDailyInfo.timeStr} (in ~{nextDailyInfo.hoursLeft}h · 00:00 UTC)
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: "flex", justifyContent: "center", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
        {isDaily && (
          <DoodleButton
            size="sm"
            variant="default"
            href={`/leaderboard?type=daily${dateStr ? `&date=${encodeURIComponent(dateStr)}` : ""}`}
            icon="leaderboard"
          >
            leaderboard
          </DoodleButton>
        )}

        {isDaily && onReplayPractice && (
          <DoodleButton
            size="sm"
            variant="primary"
            onClick={onReplayPractice}
            icon="refresh"
          >
            replay
          </DoodleButton>
        )}

        {!isDaily && onPlayAnother && (
          <DoodleButton
            size="sm"
            variant="primary"
            onClick={onPlayAnother}
            icon="play"
          >
            play another
          </DoodleButton>
        )}

        <DoodleButton
          size="sm"
          variant="secondary"
          onClick={handleShare}
          icon={copyStatus === "copied" ? "check" : undefined}
        >
          {copyStatus === "copied"
            ? "copied!"
            : copyStatus === "error"
            ? "could not copy — copy manually"
            : "share result"}
        </DoodleButton>
      </div>
    </DoodlePanel>
  );
}

