"use client";

import React, { useState, useEffect } from "react";
import { GameSettings } from "@/lib/sudoku/types";
import { loadSettings, saveSettings } from "@/lib/client/storage";
import { DoodleCheckbox } from "@/components/doodle/DoodleCheckbox";
import { soundEngine } from "@/lib/client/audio";

export default function SettingsPage() {
  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  const [savedNotice, setSavedNotice] = useState(false);

  const updateSetting = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveSettings(updated);
    if (key === "sound") {
      soundEngine.setEnabled(value as boolean);
      if (value) {
        soundEngine.playPencilDigit();
      }
    }
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1500);
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "460px",
        margin: "16px auto",
        padding: "16px 20px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "16px" }}>
        <h1
          className="font-doodle"
          style={{
            fontSize: "22px",
            fontWeight: 400,
            color: "var(--ink-primary)",
          }}
        >
          settings
        </h1>
        {savedNotice && (
          <span style={{ fontSize: "12px", fontFamily: "var(--font-doodle)", color: "var(--success-ink)" }}>
            saved ✓
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <DoodleCheckbox
          label="pencil sounds"
          description="quiet paper & pencil scratch feedback"
          checked={settings.sound}
          onChange={(val) => updateSetting("sound", val)}
        />

        <DoodleCheckbox
          label="tactile haptics"
          description="subtle vibrations on mobile devices"
          checked={settings.haptics}
          onChange={(val) => updateSetting("haptics", val)}
        />

        <div className="notebook-rule" />

        <DoodleCheckbox
          label="auto-remove pencil notes"
          description="erase candidate notes when confirmed digit is placed"
          checked={settings.autoRemoveNotes}
          onChange={(val) => updateSetting("autoRemoveNotes", val)}
        />

        <DoodleCheckbox
          label="highlight matching numbers"
          description="subtly illuminate other cells with the same number"
          checked={settings.highlightMatching}
          onChange={(val) => updateSetting("highlightMatching", val)}
        />

        <DoodleCheckbox
          label="highlight related row & block"
          description="tint the active row, column, and 3x3 block"
          checked={settings.highlightRelated}
          onChange={(val) => updateSetting("highlightRelated", val)}
        />

        <div className="notebook-rule" />

        <DoodleCheckbox
          label="show timer"
          description="display elapsed time above the board"
          checked={settings.showTimer}
          onChange={(val) => updateSetting("showTimer", val)}
        />

        <DoodleCheckbox
          label="show mistakes counter"
          description="track incorrect entries during puzzle solving"
          checked={settings.showMistakes}
          onChange={(val) => updateSetting("showMistakes", val)}
        />
      </div>
    </div>
  );
}
