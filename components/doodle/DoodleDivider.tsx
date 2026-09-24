import React from "react";

export interface DoodleDividerProps {
  className?: string;
  style?: React.CSSProperties;
  spacing?: "sm" | "md" | "lg";
}

export function DoodleDivider({
  className = "",
  style,
  spacing = "md",
}: DoodleDividerProps) {
  const marginMap: Record<"sm" | "md" | "lg", string> = {
    sm: "10px 0",
    md: "18px 0",
    lg: "28px 0",
  };

  return (
    <div
      role="separator"
      className={`doodle-divider ${className}`}
      style={{
        width: "100%",
        height: "6px",
        borderStyle: "solid",
        borderWidth: "0px 3px 6px 3px",
        borderImage: "url(/doodle/hr.svg) 0 3 6 3 stretch stretch",
        margin: marginMap[spacing],
        ...style,
      }}
    />
  );
}
