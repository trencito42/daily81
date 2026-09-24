import React from "react";
import { DoodleIcon, DoodleIconName } from "./DoodleIcon";
import { DoodleUnderline } from "./DoodleUnderline";

export interface DoodleTabItem {
  id: string;
  label: string;
  icon?: DoodleIconName;
  count?: number | string;
}

export interface DoodleTabsProps {
  tabs: DoodleTabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: "buttons" | "underlined" | "pills";
  size?: "sm" | "md";
  className?: string;
  style?: React.CSSProperties;
}

export function DoodleTabs({
  tabs,
  activeTab,
  onChange,
  variant = "buttons",
  size = "md",
  className = "",
  style,
}: DoodleTabsProps) {
  if (variant === "underlined") {
    return (
      <div
        className={`doodle-tabs-underlined ${className}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: size === "sm" ? "12px" : "20px",
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: "4px",
          overflowX: "auto",
          ...style,
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              style={{
                position: "relative",
                background: "none",
                border: "none",
                padding: size === "sm" ? "4px 6px" : "6px 10px",
                fontFamily: "var(--font-doodle)",
                fontSize: size === "sm" ? "13px" : "15px",
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "var(--ink-primary)" : "var(--ink-secondary)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                whiteSpace: "nowrap",
                touchAction: "manipulation",
              }}
            >
              {tab.icon && <DoodleIcon name={tab.icon} size={size === "sm" ? 14 : 16} />}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  style={{
                    fontSize: "11px",
                    backgroundColor: isActive ? "var(--highlight-cell)" : "var(--bg-paper-alt)",
                    padding: "1px 5px",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "4px",
                  }}
                >
                  {tab.count}
                </span>
              )}
              {isActive && <DoodleUnderline />}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={`doodle-tabs-buttons ${className}`}
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: size === "sm" ? "6px" : "8px",
        ...style,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: size === "sm" ? "3px 10px" : "6px 14px",
              fontFamily: "var(--font-doodle)",
              fontSize: size === "sm" ? "13px" : "14px",
              fontWeight: isActive ? 600 : 400,
              color: "var(--ink-primary)",
              backgroundColor: isActive ? "var(--highlight-cell)" : "var(--bg-paper)",
              borderStyle: "solid",
              borderWidth: "10px",
              borderImage: "url(/doodle/button.svg) 10 10 10 10 stretch stretch",
              cursor: "pointer",
              touchAction: "manipulation",
              userSelect: "none",
              transition: "background-color 0.1s ease",
            }}
          >
            {tab.icon && <DoodleIcon name={tab.icon} size={size === "sm" ? 14 : 16} />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                style={{
                  fontSize: "11px",
                  opacity: 0.75,
                }}
              >
                ({tab.count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
