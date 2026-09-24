import React from "react";
import { DoodlePanel } from "./DoodlePanel";
import { DoodleIcon, DoodleIconName } from "./DoodleIcon";
import { DoodleButton } from "./DoodleButton";

export interface DoodleEmptyStateProps {
  icon?: DoodleIconName;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function DoodleEmptyState({
  icon = "info",
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  className = "",
  style,
}: DoodleEmptyStateProps) {
  return (
    <DoodlePanel
      variant="subtle"
      padding="lg"
      className={className}
      style={{
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        margin: "16px 0",
        ...style,
      }}
    >
      <div style={{ color: "var(--ink-secondary)", marginBottom: "4px" }}>
        <DoodleIcon name={icon} size={32} />
      </div>
      <h3
        style={{
          fontFamily: "var(--font-doodle)",
          fontSize: "17px",
          fontWeight: 600,
          color: "var(--ink-primary)",
          margin: 0,
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            fontFamily: "var(--font-doodle)",
            fontSize: "14px",
            color: "var(--ink-secondary)",
            margin: 0,
            maxWidth: "340px",
            lineHeight: 1.4,
          }}
        >
          {description}
        </p>
      )}
      {(actionLabel && (onAction || actionHref)) && (
        <div style={{ marginTop: "8px" }}>
          <DoodleButton
            size="sm"
            variant="primary"
            onClick={onAction}
            href={actionHref}
          >
            {actionLabel}
          </DoodleButton>
        </div>
      )}
    </DoodlePanel>
  );
}
