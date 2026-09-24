"use client";

import React, { useState } from "react";
import { GameSettings } from "@/lib/sudoku/types";
import { loadSettings, saveSettings } from "@/lib/client/storage";
import { DoodleCheckbox } from "@/components/doodle/DoodleCheckbox";
import { DoodleDivider } from "@/components/doodle/DoodleDivider";
import { DoodleBadge } from "@/components/doodle/DoodleBadge";
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
        maxWidth: "var(--page-reading, 520px)",
        margin: "12px auto",
        padding: "16px 20px 48px",
        boxSizing: "border-box",
        fontFamily: "var(--font-doodle)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "16px" }}>
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 600,
            color: "var(--ink-primary)",
            margin: 0,
          }}
        >
          settings
        </h1>
        {savedNotice && (
          <DoodleBadge variant="success" size="sm">
            saved
          </DoodleBadge>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
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

        <DoodleDivider spacing="sm" />

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

        <DoodleDivider spacing="sm" />

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
