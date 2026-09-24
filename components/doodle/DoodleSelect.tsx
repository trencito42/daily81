import React from "react";

export interface DoodleSelectOption {
  value: string;
  label: string;
}

export interface DoodleSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: DoodleSelectOption[];
  error?: string;
}

export const DoodleSelect = React.forwardRef<HTMLSelectElement, DoodleSelectProps>(
  ({ label, options, children, error, className = "", style, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
        {label && (
          <label
            htmlFor={selectId}
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
        <select
          ref={ref}
          id={selectId}
          className={`doodle-select-primitive ${className}`}
          style={{
            width: "100%",
            backgroundColor: "var(--bg-paper)",
            color: "var(--ink-primary)",
            fontFamily: "var(--font-doodle)",
            fontSize: "15px",
            padding: "8px 32px 8px 12px",
            borderStyle: "solid",
            borderWidth: "10px",
            borderImage: "url(/doodle/button.svg) 10 10 10 10 stretch stretch",
            outline: "none",
            appearance: "none",
            background: "url(/doodle/caret.svg) no-repeat right transparent",
            backgroundPositionX: "calc(100% - 10px)",
            backgroundPositionY: "center",
            boxSizing: "border-box",
            cursor: "pointer",
            ...style,
          }}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
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

DoodleSelect.displayName = "DoodleSelect";
