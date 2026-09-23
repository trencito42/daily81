import React from "react";
import { getLevelProgress } from "@/lib/xp/progression";

interface XPBarProps {
  xp: number;
  showDetails?: boolean;
  compact?: boolean;
}

export function XPBar({ xp, showDetails = true, compact = false }: XPBarProps) {
  const { level, xpInCurrentLevel, xpNeededForNext, progressPercent } = getLevelProgress(xp);

  if (compact) {
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontWeight: 600, fontSize: "13px" }}>Lv. {level}</span>
        <div
          style={{
            width: "50px",
            height: "6px",
            border: "1px solid var(--ink-primary)",
            borderRadius: "4px",
            backgroundColor: "var(--bg-paper)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progressPercent}%`,
              height: "100%",
              backgroundColor: "var(--ink-primary)",
              transition: "width 0.4s ease-out",
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: "340px", margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "6px",
          fontSize: "14px",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: "15px" }}>Lv. {level}</span>
        {showDetails && (
          <span style={{ color: "var(--ink-secondary)", fontSize: "13px", fontFamily: "var(--font-doodle)" }}>
            {xpInCurrentLevel} / {xpNeededForNext} XP
          </span>
        )}
      </div>

      <div
        style={{
          width: "100%",
          height: "10px",
          border: "1.5px solid var(--ink-primary)",
          borderRadius: "255px 6px 225px 6px/6px 225px 6px 255px",
          backgroundColor: "var(--bg-paper)",
          padding: "1px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progressPercent}%`,
            height: "100%",
            backgroundColor: "var(--ink-primary)",
            borderRadius: "2px",
            transition: "width 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
        />
      </div>
    </div>
  );
}
