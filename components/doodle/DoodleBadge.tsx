import React from "react";
import { DoodleIcon, DoodleIconName } from "./DoodleIcon";

export interface DoodleBadgeProps {
  children: React.ReactNode;
  variant?: "default" | "highlight" | "success" | "error" | "muted";
  size?: "sm" | "md";
  icon?: DoodleIconName;
  className?: string;
  style?: React.CSSProperties;
}

export function DoodleBadge({
  children,
  variant = "default",
  size = "sm",
  icon,
  className = "",
  style,
}: DoodleBadgeProps) {
  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      backgroundColor: "var(--bg-paper-alt)",
      color: "var(--ink-primary)",
      borderColor: "var(--ink-primary)",
    },
    highlight: {
      backgroundColor: "var(--highlight-cell)",
      color: "var(--ink-primary)",
      borderColor: "var(--ink-primary)",
      fontWeight: 600,
    },
    success: {
      backgroundColor: "var(--bg-paper-alt)",
      color: "var(--success-ink)",
      borderColor: "var(--success-ink)",
    },
    error: {
      backgroundColor: "var(--error-bg)",
      color: "var(--error-ink)",
      borderColor: "var(--error-ink)",
    },
    muted: {
      backgroundColor: "transparent",
      color: "var(--ink-muted)",
      borderColor: "var(--border-subtle)",
    },
  };

  return (
    <span
      className={`doodle-badge-primitive ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: size === "sm" ? "1px 7px" : "3px 10px",
        fontSize: size === "sm" ? "12px" : "13px",
        fontFamily: "var(--font-doodle)",
        lineHeight: 1.2,
        borderRadius: "255px 6px 225px 6px/6px 225px 6px 255px",
        border: "1px solid",
        userSelect: "none",
        whiteSpace: "nowrap",
        ...variantStyles[variant],
        ...style,
      }}
    >
      {icon && <DoodleIcon name={icon} size={size === "sm" ? 12 : 14} />}
      <span>{children}</span>
    </span>
  );
}
