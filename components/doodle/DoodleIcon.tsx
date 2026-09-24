"use client";

import React from "react";

export type DoodleIconName =
  | "pencil"
  | "undo"
  | "erase"
  | "hint"
  | "lightbulb"
  | "info"
  | "pause"
  | "play"
  | "check"
  | "settings"
  | "user"
  | "trophy"
  | "clock"
  | "streak"
  | "fire"
  | "star"
  | "leaderboard"
  | "friends"
  | "calendar"
  | "archive"
  | "warning"
  | "error"
  | "close"
  | "menu"
  | "arrow-left"
  | "arrow-right"
  | "arrow-down"
  | "search"
  | "lock"
  | "refresh"
  | "rematch"
  | "swords"
  | "challenge"
  | "copy"
  | "share"
  | "check-circle"
  | "x-circle";

interface DoodleIconProps extends React.SVGProps<SVGSVGElement> {
  name: DoodleIconName;
  size?: number | string;
  className?: string;
  color?: string;
}

export function DoodleIcon({
  name,
  size = 18,
  className = "",
  color = "currentColor",
  style,
  ...props
}: DoodleIconProps) {
  const s = typeof size === "number" ? `${size}px` : size;

  // Hand-drawn unified icon paths with slightly organic strokes and round caps
  const renderPath = () => {
    switch (name) {
      case "pencil":
        return (
          <>
            <path d="M14.7 3.3a1.8 1.8 0 0 1 2.5 2.5l-9.8 9.8-3.4.9.9-3.4 9.8-9.8z" />
            <path d="M12.5 5.5l2 2" />
            <path d="M3.9 16.5l2.2-2.2" />
          </>
        );

      case "undo":
        return (
          <>
            <path d="M4.5 9.5l-2.5-3 3-2.5" />
            <path d="M2.5 6.5C5.8 4.2 10.4 4 14.1 6.2c4.2 2.5 5.6 7.8 3.2 12-2.1 3.7-6.5 5.4-10.5 4.1" />
          </>
        );

      case "erase":
        return (
          <>
            <path d="M16.5 13.5l-7 7-6.5-.5 3.5-3.5-3.5-3.5 8-8 7.5 7.5-2 1" />
            <path d="M8.5 7.5l5 5" />
            <path d="M13 20h7" />
          </>
        );

      case "hint":
      case "lightbulb":
        return (
          <>
            <path d="M8 15.5c-.8-.8-1.5-1.9-1.8-3.1C5.6 9.8 7 7.1 9.2 5.8c2.8-1.7 6.6-1.1 8.7 1.4 1.9 2.3 2 5.6.3 8-.4.6-.7 1.3-.8 2" />
            <path d="M8 16h8v2.5a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 18.5V16z" />
            <path d="M9.5 22h5" />
            <path d="M12 2v2M4 7l1.5 1M20 7l-1.5 1" />
          </>
        );

      case "pause":
        return (
          <>
            <path d="M7 5.5v13a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-13a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1z" />
            <path d="M14 5.5v13a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-13a1 1 0 0 0-1-1h-1a1 1 0 0 0-1 1z" />
          </>
        );

      case "play":
        return (
          <path d="M6.5 4.8c-.8-.5-1.5-.1-1.5.8v12.8c0 .9.7 1.3 1.5.8l11.2-6.4c.8-.5.8-1.2 0-1.7L6.5 4.8z" />
        );

      case "check":
        return <path d="M4.5 12.5l4.5 5 10.5-11.5" />;

      case "check-circle":
        return (
          <>
            <circle cx="12" cy="12" r="9.5" />
            <path d="M7.5 12.2l3 3.3 6-6.5" />
          </>
        );

      case "close":
      case "x-circle":
        return (
          <>
            <path d="M6.5 6.5l11 11" />
            <path d="M17.5 6.5l-11 11" />
          </>
        );

      case "settings":
        return (
          <>
            <circle cx="12" cy="12" r="3.2" />
            <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.2a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.2a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3 1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.2a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8 1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1z" />
          </>
        );

      case "user":
        return (
          <>
            <circle cx="12" cy="7.5" r="4.2" />
            <path d="M4.5 20.5c0-4.2 3.3-7 7.5-7s7.5 2.8 7.5 7" />
          </>
        );

      case "trophy":
        return (
          <>
            <path d="M6.5 4h11v5.5a5.5 5.5 0 0 1-11 0V4z" />
            <path d="M6.5 6H4a2 2 0 0 0-2 2v1a3 3 0 0 0 3 3h1.5" />
            <path d="M17.5 6H20a2 2 0 0 1 2 2v1a3 3 0 0 1-3 3h-1.5" />
            <path d="M12 15v4" />
            <path d="M7.5 19.5h9v1.5H7.5z" />
          </>
        );

      case "clock":
        return (
          <>
            <circle cx="12" cy="12" r="9.2" />
            <path d="M12 6.5v5.5l3.5 2" />
          </>
        );

      case "streak":
      case "fire":
        return (
          <path d="M11.8 2.8C9.5 5.5 8 8 8 11.5c0 1.2.3 2.3.8 3.3.4-1.2 1.4-2.2 2.7-2.6.3 1.5 1.2 2.8 2.5 3.5.2-.8.5-1.5 1-2.1.8 1 1.2 2.1 1.2 3.4 0 3.3-2.6 6-5.8 6-3.7 0-6.7-3-6.7-6.7 0-4.5 3.5-7.5 6.1-9.8.7-.6 1.4-1.2 2-3.7z" />
        );

      case "star":
        return (
          <path d="M12 2.5l2.8 6.3 6.9.7-5.1 4.7 1.4 6.8-6-3.4-6 3.4 1.4-6.8-5.1-4.7 6.9-.7L12 2.5z" />
        );

      case "leaderboard":
        return (
          <>
            <path d="M4 20.5h16" />
            <path d="M5.5 20.5V11a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v9.5" />
            <path d="M10.5 20.5V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v15.5" />
            <path d="M15.5 20.5V14a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v6.5" />
          </>
        );

      case "friends":
        return (
          <>
            <circle cx="8.5" cy="8.5" r="3.5" />
            <path d="M2.5 19.5c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
            <circle cx="16.5" cy="7.5" r="2.8" />
            <path d="M16 13.5c2.5.3 4.5 2 4.5 4.5v1.5" />
          </>
        );

      case "calendar":
      case "archive":
        return (
          <>
            <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
            <path d="M3.5 9.5h17" />
            <path d="M7.5 2.5v4" />
            <path d="M16.5 2.5v4" />
            <circle cx="7.5" cy="13.5" r=".8" />
            <circle cx="12" cy="13.5" r=".8" />
            <circle cx="16.5" cy="13.5" r=".8" />
            <circle cx="7.5" cy="17" r=".8" />
            <circle cx="12" cy="17" r=".8" />
          </>
        );

      case "warning":
      case "error":
        return (
          <>
            <path d="M10.8 3.8a1.5 1.5 0 0 1 2.4 0l8.3 14.2a1.5 1.5 0 0 1-1.3 2.2H3.8a1.5 1.5 0 0 1-1.3-2.2L10.8 3.8z" />
            <path d="M12 9v5" />
            <circle cx="12" cy="17" r=".9" fill={color} />
          </>
        );

      case "menu":
        return (
          <>
            <path d="M4 7h16" />
            <path d="M4 12h16" />
            <path d="M4 17h16" />
          </>
        );

      case "arrow-left":
        return (
          <>
            <path d="M19 12H5" />
            <path d="M11 6l-6 6 6 6" />
          </>
        );

      case "arrow-right":
        return (
          <>
            <path d="M5 12h14" />
            <path d="M13 6l6 6-6 6" />
          </>
        );

      case "arrow-down":
        return (
          <>
            <path d="M12 5v14" />
            <path d="M6 13l6 6 6-6" />
          </>
        );

      case "info":
        return (
          <>
            <circle cx="12" cy="12" r="9.5" />
            <line x1="12" y1="11" x2="12" y2="16.5" />
            <circle cx="12" cy="7.5" r="0.8" fill="currentColor" />
          </>
        );

      case "search":
        return (
          <>
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="M15.5 15.5l5 5" />
          </>
        );

      case "lock":
        return (
          <>
            <rect x="4.5" y="10.5" width="15" height="10.5" rx="2" />
            <path d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5" />
            <circle cx="12" cy="15.5" r="1.2" />
          </>
        );

      case "refresh":
      case "rematch":
        return (
          <>
            <path d="M20 4v5h-5" />
            <path d="M4 20v-5h5" />
            <path d="M19.5 9A8 8 0 0 0 5.6 6.6L4 9" />
            <path d="M4.5 15a8 8 0 0 0 13.9 2.4L20 15" />
          </>
        );

      case "swords":
      case "challenge":
        return (
          <>
            <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
            <path d="M13 19l2 2 4.5-4.5-2-2" />
            <path d="M9.5 17.5L21 6V3h-3L6.5 14.5" />
            <path d="M11 19l-2 2-4.5-4.5 2-2" />
          </>
        );

      case "copy":
        return (
          <>
            <rect x="8.5" y="8.5" width="11" height="12" rx="2" />
            <path d="M5.5 15.5H4.5a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
          </>
        );

      case "share":
        return (
          <>
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="M8.6 13.5l6.8 3.9M15.4 6.6L8.6 10.5" />
          </>
        );

      default:
        return <circle cx="12" cy="12" r="8" />;
    }
  };

  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`doodle-icon ${className}`}
      aria-hidden="true"
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        flexShrink: 0,
        ...style,
      }}
      {...props}
    >
      {renderPath()}
    </svg>
  );
}
