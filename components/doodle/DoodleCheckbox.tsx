import React from "react";
import { DoodleIcon } from "./DoodleIcon";

export interface DoodleCheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  disabled?: boolean;
}

export function DoodleCheckbox({
  label,
  checked,
  onChange,
  description,
  disabled = false,
}: DoodleCheckboxProps) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        cursor: disabled ? "not-allowed" : "pointer",
        userSelect: "none",
        padding: "6px 0",
        opacity: disabled ? 0.5 : 1,
      }}
      onClick={(e) => {
        if (disabled) return;
        e.preventDefault();
        onChange(!checked);
      }}
    >
      <div
        style={{
          width: "22px",
          height: "22px",
          marginTop: "1px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderStyle: "solid",
          borderWidth: "6px",
          borderImage: "url(/doodle/checkbox.svg) 6 6 6 6 stretch stretch",
          backgroundColor: checked ? "var(--highlight-cell)" : "var(--bg-paper)",
          color: "var(--ink-primary)",
          flexShrink: 0,
          boxSizing: "border-box",
        }}
      >
        {checked && <DoodleIcon name="check" size={14} />}
      </div>
      <div>
        <div
          style={{
            fontFamily: "var(--font-doodle)",
            fontSize: "15px",
            fontWeight: 500,
            color: "var(--ink-primary)",
          }}
        >
          {label}
        </div>
        {description && (
          <div
            style={{
              fontFamily: "var(--font-doodle)",
              fontSize: "13px",
              color: "var(--ink-secondary)",
              marginTop: "2px",
            }}
          >
            {description}
          </div>
        )}
      </div>
    </label>
  );
}
