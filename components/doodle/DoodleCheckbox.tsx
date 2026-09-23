import React from "react";
import { CheckIcon } from "./Icons";

interface DoodleCheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}

export function DoodleCheckbox({ label, checked, onChange, description }: DoodleCheckboxProps) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        cursor: "pointer",
        userSelect: "none",
        padding: "8px 0",
      }}
      onClick={(e) => {
        e.preventDefault();
        onChange(!checked);
      }}
    >
      <div
        style={{
          width: "20px",
          height: "20px",
          marginTop: "2px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1.5px solid var(--ink-primary)",
          borderRadius: "255px 4px 225px 4px/4px 225px 4px 255px",
          backgroundColor: checked ? "var(--ink-primary)" : "transparent",
          color: "var(--bg-paper)",
          transition: "all 0.12s ease",
          flexShrink: 0,
        }}
      >
        {checked && <CheckIcon className="w-3.5 h-3.5" />}
      </div>
      <div>
        <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--ink-primary)" }}>{label}</div>
        {description && (
          <div style={{ fontSize: "12px", color: "var(--ink-secondary)", marginTop: "2px" }}>
            {description}
          </div>
        )}
      </div>
    </label>
  );
}
