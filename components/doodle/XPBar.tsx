import React from "react";
import { getLevelProgress } from "@/lib/xp/progression";
import { DoodleProgress } from "./DoodleProgress";

export interface XPBarProps {
  xp: number;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function XPBar({ xp, showDetails = true, compact = false, className = "", style }: XPBarProps) {
  const { level, xpInCurrentLevel, xpNeededForNext, progressPercent } = getLevelProgress(xp);

  if (compact) {
    return (
      <div
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          fontFamily: "var(--font-doodle)",
          ...style,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: "13px" }}>Lv. {level}</span>
        <div style={{ width: "50px" }}>
          <DoodleProgress
            value={progressPercent}
            max={100}
            size="sm"
            variant="ink"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        width: "100%",
        maxWidth: "340px",
        margin: "0 auto",
        fontFamily: "var(--font-doodle)",
        ...style,
      }}
    >
      <DoodleProgress
        value={xpInCurrentLevel}
        max={xpNeededForNext}
        label={`Lv. ${level}`}
        sublabel={showDetails ? `${xpInCurrentLevel} / ${xpNeededForNext} XP` : undefined}
        size="md"
        variant="ink"
      />
    </div>
  );
}
