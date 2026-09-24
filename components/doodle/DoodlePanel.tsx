import React from "react";

export interface DoodlePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "subtle" | "highlight" | "alt" | "error";
  tape?: "none" | "white" | "yellow";
  padding?: "none" | "sm" | "md" | "lg";
  children: React.ReactNode;
}

export function DoodlePanel({
  variant = "default",
  tape = "none",
  padding = "md",
  children,
  className = "",
  style,
  ...props
}: DoodlePanelProps) {
  const paddingStyles: Record<"none" | "sm" | "md" | "lg", React.CSSProperties> = {
    none: { padding: "0px" },
    sm: { padding: "8px 12px" },
    md: { padding: "16px 20px" },
    lg: { padding: "24px 28px" },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      backgroundColor: "var(--bg-paper)",
      borderStyle: "solid",
      borderWidth: "10px",
      borderImage: "url(/doodle/border.svg) 10 10 10 10 stretch stretch",
      color: "var(--ink-primary)",
    },
    subtle: {
      backgroundColor: "var(--bg-paper)",
      borderStyle: "solid",
      borderWidth: "10px",
      borderImage: "url(/doodle/button.svg) 10 10 10 10 stretch stretch",
      color: "var(--ink-primary)",
    },
    highlight: {
      backgroundColor: "var(--highlight-cell)",
      borderStyle: "solid",
      borderWidth: "10px",
      borderImage: "url(/doodle/border.svg) 10 10 10 10 stretch stretch",
      color: "var(--ink-primary)",
    },
    alt: {
      backgroundColor: "var(--bg-paper-alt)",
      borderStyle: "solid",
      borderWidth: "10px",
      borderImage: "url(/doodle/button.svg) 10 10 10 10 stretch stretch",
      color: "var(--ink-primary)",
    },
    error: {
      backgroundColor: "var(--error-bg)",
      borderStyle: "solid",
      borderWidth: "10px",
      borderImage: "url(/doodle/border.svg) 10 10 10 10 stretch stretch",
      color: "var(--error-ink)",
    },
  };

  return (
    <div
      className={`doodle-panel-primitive ${className}`}
      style={{
        position: "relative",
        boxSizing: "border-box",
        fontFamily: "var(--font-doodle)",
        ...variantStyles[variant],
        ...paddingStyles[padding],
        ...style,
      }}
      {...props}
    >
      {tape !== "none" && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "-12px",
            left: "50%",
            transform: "translateX(-50%) rotate(-1deg)",
            width: "56px",
            height: "16px",
            backgroundColor: tape === "yellow" ? "rgba(243, 231, 165, 0.85)" : "rgba(235, 230, 222, 0.85)",
            border: "1px dashed rgba(100, 95, 87, 0.4)",
            borderRadius: "2px",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />
      )}
      {children}
    </div>
  );
}
