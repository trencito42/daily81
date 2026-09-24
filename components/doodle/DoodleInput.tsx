import React from "react";
import { DoodleIcon, DoodleIconName } from "./DoodleIcon";

export interface DoodleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: DoodleIconName;
  label?: string;
  error?: string;
}

export const DoodleInput = React.forwardRef<HTMLInputElement, DoodleInputProps>(
  ({ icon, label, error, className = "", style, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
        {label && (
          <label
            htmlFor={inputId}
            style={{
              fontFamily: "var(--font-doodle)",
              fontSize: "14px",
              color: "var(--ink-secondary)",
              fontWeight: 500,
            }}
          >
            {label}
          </label>
        )}
        <div style={{ position: "relative", display: "flex", alignItems: "center", width: "100%" }}>
          {icon && (
            <div
              style={{
                position: "absolute",
                left: "12px",
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                color: "var(--ink-secondary)",
              }}
            >
              <DoodleIcon name={icon} size={16} />
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`doodle-input-primitive ${className}`}
            style={{
              width: "100%",
              backgroundColor: "var(--bg-paper)",
              color: "var(--ink-primary)",
              fontFamily: "var(--font-doodle)",
              fontSize: "15px",
              padding: icon ? "8px 12px 8px 36px" : "8px 12px",
              borderStyle: "solid",
              borderWidth: "10px",
              borderImage: "url(/doodle/button.svg) 10 10 10 10 stretch stretch",
              outline: "none",
              boxSizing: "border-box",
              ...style,
            }}
            {...props}
          />
        </div>
        {error && (
          <span
            style={{
              fontFamily: "var(--font-doodle)",
              fontSize: "12px",
              color: "var(--error-ink)",
              marginTop: "2px",
            }}
          >
            {error}
          </span>
        )}
      </div>
    );
  }
);

DoodleInput.displayName = "DoodleInput";
