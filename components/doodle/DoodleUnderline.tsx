import React from "react";

export function DoodleUnderline({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 8"
      preserveAspectRatio="none"
      style={{
        position: "absolute",
        left: "-2px",
        right: "-2px",
        bottom: "-4px",
        width: "calc(100% + 4px)",
        height: "6px",
        pointerEvents: "none",
      }}
      className={className}
      aria-hidden="true"
    >
      <path
        d="M 2,4 Q 25,2 50,4.5 T 98,3.5"
        fill="none"
        stroke="var(--ink-primary)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
