import React from "react";

export interface DoodleProgressProps {
  value: number; // 0 to max
  max?: number;
  label?: string;
  sublabel?: string;
  size?: "sm" | "md" | "lg";
  variant?: "yellow" | "ink";
  showValue?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function DoodleProgress({
  value,
  max = 100,
  label,
  sublabel,
  size = "md",
  variant = "yellow",
  showValue = false,
  className = "",
  style,
}: DoodleProgressProps) {
  const percentage = Math.min(100, Math.max(0, max > 0 ? (value / max) * 100 : 0));

  const heightMap: Record<"sm" | "md" | "lg", string> = {
    sm: "10px",
    md: "16px",
    lg: "22px",
  };

  const fillColor = variant === "yellow" ? "var(--highlight-cell)" : "var(--ink-primary)";

  return (
    <div
      className={`doodle-progress-wrapper ${className}`}
      style={{
        width: "100%",
        fontFamily: "var(--font-doodle)",
        ...style,
      }}
    >
      {(label || sublabel || showValue) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            fontSize: size === "sm" ? "12px" : "13px",
            color: "var(--ink-secondary)",
            marginBottom: "4px",
          }}
        >
          {label && <span style={{ fontWeight: 500, color: "var(--ink-primary)" }}>{label}</span>}
          {sublabel && <span>{sublabel}</span>}
          {showValue && !sublabel && (
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {value}/{max} ({Math.round(percentage)}%)
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        style={{
          width: "100%",
          height: heightMap[size],
          backgroundColor: "var(--bg-paper-alt)",
          borderStyle: "solid",
          borderWidth: "10px",
          borderImage: "url(/doodle/button.svg) 10 10 10 10 stretch stretch",
          position: "relative",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${percentage}%`,
            backgroundColor: fillColor,
            transition: "width 0.3s ease",
            borderRight: percentage < 100 && percentage > 0 ? "1px solid var(--ink-primary)" : "none",
          }}
        />
      </div>
    </div>
  );
}
