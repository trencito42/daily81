import React from "react";
import { DoodleIcon, DoodleIconName } from "./DoodleIcon";

export interface DoodleNoticeProps {
  variant?: "info" | "success" | "error" | "warning";
  title?: string;
  children: React.ReactNode;
  icon?: DoodleIconName;
  onClose?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function DoodleNotice({
  variant = "info",
  title,
  children,
  icon,
  onClose,
  className = "",
  style,
}: DoodleNoticeProps) {
  const defaultIcons: Record<"info" | "success" | "error" | "warning", DoodleIconName> = {
    info: "lightbulb",
    success: "check",
    error: "warning",
    warning: "warning",
  };

  const resolvedIcon = icon || defaultIcons[variant];

  const variantStyles: Record<string, React.CSSProperties> = {
    info: {
      backgroundColor: "var(--bg-paper)",
      color: "var(--ink-primary)",
      borderImage: "url(/doodle/button.svg) 10 10 10 10 stretch stretch",
    },
    success: {
      backgroundColor: "var(--bg-paper-alt)",
      color: "var(--success-ink)",
      borderImage: "url(/doodle/button.svg) 10 10 10 10 stretch stretch",
    },
    error: {
      backgroundColor: "var(--error-bg)",
      color: "var(--error-ink)",
      borderImage: "url(/doodle/button.svg) 10 10 10 10 stretch stretch",
    },
    warning: {
      backgroundColor: "var(--highlight-cell)",
      color: "var(--ink-primary)",
      borderImage: "url(/doodle/button.svg) 10 10 10 10 stretch stretch",
    },
  };

  return (
    <div
      role="alert"
      className={`doodle-notice-primitive ${className}`}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        padding: "10px 14px",
        borderStyle: "solid",
        borderWidth: "10px",
        fontFamily: "var(--font-doodle)",
        boxSizing: "border-box",
        width: "100%",
        position: "relative",
        ...variantStyles[variant],
        ...style,
      }}
    >
      <div style={{ flexShrink: 0, marginTop: "2px" }}>
        <DoodleIcon name={resolvedIcon} size={18} />
      </div>
      <div style={{ flex: 1, fontSize: "14px", lineHeight: 1.4 }}>
        {title && <div style={{ fontWeight: 600, marginBottom: "2px" }}>{title}</div>}
        <div>{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "2px",
            color: "inherit",
            opacity: 0.7,
            display: "flex",
            alignItems: "center",
          }}
        >
          <DoodleIcon name="close" size={14} />
        </button>
      )}
    </div>
  );
}
