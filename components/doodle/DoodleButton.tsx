import React from "react";
import Link from "next/link";
import { DoodleIcon, DoodleIconName } from "./DoodleIcon";

export interface DoodleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: DoodleIconName;
  iconRight?: DoodleIconName;
  href?: string;
  target?: string;
  rel?: string;
  isActive?: boolean;
  fullWidth?: boolean;
}

export function DoodleButton({
  children,
  variant = "default",
  size = "md",
  icon,
  iconRight,
  href,
  target,
  rel,
  isActive = false,
  fullWidth = false,
  className = "",
  style,
  disabled,
  ...props
}: DoodleButtonProps) {
  const sizeStyles: Record<"sm" | "md" | "lg", React.CSSProperties> = {
    sm: {
      padding: "3px 10px",
      fontSize: "13px",
      minHeight: "28px",
      gap: "5px",
    },
    md: {
      padding: "6px 14px",
      fontSize: "14px",
      minHeight: "36px",
      gap: "7px",
    },
    lg: {
      padding: "10px 20px",
      fontSize: "16px",
      minHeight: "44px",
      gap: "8px",
    },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      backgroundColor: "var(--bg-paper)",
      color: "var(--ink-primary)",
      borderStyle: "solid",
      borderWidth: "10px",
      borderImage: "url(/doodle/button.svg) 10 10 10 10 stretch stretch",
    },
    primary: {
      backgroundColor: "var(--highlight-cell)",
      color: "var(--ink-primary)",
      borderStyle: "solid",
      borderWidth: "10px",
      borderImage: "url(/doodle/button.svg) 10 10 10 10 stretch stretch",
      fontWeight: 600,
    },
    secondary: {
      backgroundColor: "var(--bg-paper-alt)",
      color: "var(--ink-secondary)",
      borderStyle: "solid",
      borderWidth: "10px",
      borderImage: "url(/doodle/button.svg) 10 10 10 10 stretch stretch",
    },
    ghost: {
      backgroundColor: "transparent",
      color: "var(--ink-secondary)",
      border: "1px solid transparent",
    },
    danger: {
      backgroundColor: "var(--error-bg)",
      color: "var(--error-ink)",
      borderStyle: "solid",
      borderWidth: "10px",
      borderImage: "url(/doodle/button.svg) 10 10 10 10 stretch stretch",
    },
  };

  const activeStyle: React.CSSProperties = isActive
    ? {
        backgroundColor: "var(--highlight-cell)",
        color: "var(--ink-primary)",
        fontWeight: 600,
      }
    : {};

  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-doodle)",
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    userSelect: "none",
    touchAction: "manipulation",
    boxSizing: "border-box",
    width: fullWidth ? "100%" : undefined,
    textAlign: "center",
    lineHeight: 1.2,
    transition: "transform 0.08s ease, background-color 0.12s ease",
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...activeStyle,
    ...style,
  };

  const content = (
    <>
      {icon && <DoodleIcon name={icon} size={size === "sm" ? 14 : size === "lg" ? 20 : 16} />}
      {children && <span>{children}</span>}
      {iconRight && <DoodleIcon name={iconRight} size={size === "sm" ? 14 : size === "lg" ? 20 : 16} />}
    </>
  );

  if (href && !disabled) {
    const isInternal = href.startsWith("/") || href.startsWith("#");
    if (isInternal) {
      return (
        <Link
          href={href}
          className={`doodle-button-primitive ${className}`}
          style={baseStyle}
        >
          {content}
        </Link>
      );
    }
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        className={`doodle-button-primitive ${className}`}
        style={baseStyle}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type={props.type || "button"}
      disabled={disabled}
      className={`doodle-button-primitive ${className}`}
      style={baseStyle}
      {...props}
    >
      {content}
    </button>
  );
}
