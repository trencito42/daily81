"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  SudokuPuzzle,
  CellState,
  SudokuMove,
  SudokuGameState,
  GameSettings,
  XPBreakdown,
  Difficulty,
} from "@/lib/sudoku/types";
import { getRow, getCol, getBlock, getPeers, isGridCompleteAndValid } from "@/lib/sudoku/validate";
import { soundEngine } from "@/lib/client/audio";
import { triggerHaptic } from "@/lib/client/haptics";
import {
  loadSettings,
  loadActiveGame,
  saveActiveGame,
  clearActiveGame,
  recordGuestGameCompletion,
  loadGuestProfile,
  markDailyDateCompleted,
} from "@/lib/client/storage";
import { calculatePuzzleXP } from "@/lib/xp/progression";
import { SudokuBoard } from "./SudokuBoard";
import { NumberPad } from "./NumberPad";
import { GameHeaderInfo } from "./GameHeaderInfo";
import { CompletionSheet } from "./CompletionSheet";

interface SudokuGameProps {
  initialPuzzle: SudokuPuzzle;
  isDaily?: boolean;
  dateStr?: string | null;
  onPlayAnother?: () => void;
  userStreak?: number;
}

export function SudokuGame({
  initialPuzzle,
  isDaily = false,
  dateStr = null,
  onPlayAnother,
  userStreak,
}: SudokuGameProps) {
  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [pencilMode, setPencilMode] = useState<boolean>(false);
  const [cells, setCells] = useState<CellState[]>([]);
  const [mistakes, setMistakes] = useState<number>(0);
  const [hintsUsed, setHintsUsed] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [xpBreakdown, setXpBreakdown] = useState<XPBreakdown | null>(null);

  const historyRef = useRef<SudokuMove[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize cells from initialGrid or saved active game
  useEffect(() => {
    soundEngine.setEnabled(settings.sound);

    const saved = loadActiveGame();
    if (saved && saved.puzzle && saved.puzzle.puzzleKey === initialPuzzle.puzzleKey && saved.cells && !saved.isCompleted) {
      setCells(saved.cells);
      setSelectedIndex(saved.selectedIndex ?? null);
      setPencilMode(saved.pencilMode ?? false);
      setMistakes(saved.mistakes ?? 0);
      setHintsUsed(saved.hintsUsed ?? 0);
      setElapsedSeconds(saved.elapsedSeconds ?? 0);
      setIsStarted(saved.isStarted ?? false);
      return;
    }

    const initialCells: CellState[] = [];
    const gridChars = initialPuzzle.initialGrid.split("");

    for (let i = 0; i < 81; i++) {
      const val = parseInt(gridChars[i], 10);
      initialCells.push({
        index: i,
        row: getRow(i),
        col: getCol(i),
        block: getBlock(i),
        value: val,
        given: val !== 0,
        notes: [],
        isMistake: false,
      });
    }

    setCells(initialCells);
    setSelectedIndex(null);
    setMistakes(0);
    setHintsUsed(0);
    setElapsedSeconds(0);
    setIsStarted(false);
    setIsCompleted(false);
    setXpBreakdown(null);
    historyRef.current = [];
  }, [initialPuzzle, settings.sound]);

  // Handle timer tick
  useEffect(() => {
    if (isStarted && !isPaused && !isCompleted) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isStarted, isPaused, isCompleted]);

  // Handle auto-pause on page visibility change
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden" && isStarted && !isCompleted) {
        setIsPaused(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [isStarted, isCompleted]);

  // Auto-save game state to storage
  useEffect(() => {
    if (cells.length === 81 && isStarted && !isCompleted) {
      saveActiveGame({
        puzzle: initialPuzzle,
        cells,
        selectedIndex,
        pencilMode,
        mistakes,
        hintsUsed,
        elapsedSeconds,
        isStarted,
        isPaused,
        isCompleted: false,
        history: historyRef.current,
        historyIndex: historyRef.current.length,
      });
    }
  }, [cells, selectedIndex, pencilMode, mistakes, hintsUsed, elapsedSeconds, isStarted, isCompleted, initialPuzzle]);

  // Calculate completed numbers & number counts
  const { completedNumbers, numberCounts } = React.useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
    const completed: number[] = [];

    cells.forEach((c) => {
      if (c.value >= 1 && c.value <= 9) {
        counts[c.value] = (counts[c.value] || 0) + 1;
      }
    });

    for (let num = 1; num <= 9; num++) {
      if (counts[num] === 9) {
        completed.push(num);
      }
    }

    return { completedNumbers: completed, numberCounts: counts };
  }, [cells]);

  // Finish game verification and reward calculation
  const handleGameComplete = useCallback(
    async (finalCells: CellState[]) => {
      setIsCompleted(true);
      setIsPaused(false);
      clearActiveGame();

      soundEngine.playSolved();
      triggerHaptic("complete", settings.haptics);

      const finalGrid = finalCells.map((c) => c.value).join("");
      const isSolved = isGridCompleteAndValid(finalGrid);

      if (!isSolved) {
        return;
      }

      const guestProfile = loadGuestProfile();
      const xpResult = calculatePuzzleXP({
        difficulty: initialPuzzle.difficulty,
        isDaily,
        mistakes,
        hintsUsed,
        elapsedSeconds,
        userCurrentXP: guestProfile.xp,
      });

      setXpBreakdown(xpResult);

      // Record locally for guest
      recordGuestGameCompletion({
        puzzleKey: initialPuzzle.puzzleKey,
        difficulty: initialPuzzle.difficulty,
        isDaily,
        dateStr: initialPuzzle.date || dateStr,
        elapsedSeconds,
        mistakes,
        hints: hintsUsed,
        xpEarned: xpResult.totalXP,
      });

      if (isDaily && dateStr) {
        markDailyDateCompleted(dateStr);
      }

      // Sync server-side if user is logged in
      try {
        await fetch("/api/game/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            puzzleKey: initialPuzzle.puzzleKey,
            difficulty: initialPuzzle.difficulty,
            date: initialPuzzle.date || dateStr,
            isDaily,
            finalGrid,
            elapsedSeconds,
            mistakes,
            hintsUsed,
          }),
        });
      } catch {
        // Server sync offline fallback
      }
    },
    [initialPuzzle, isDaily, dateStr, elapsedSeconds, mistakes, hintsUsed, settings.haptics]
  );

  // Set number action
  const handleSetNumber = useCallback(
    (num: number) => {
      if (selectedIndex === null || isCompleted || isPaused) return;
      const targetCell = cells[selectedIndex];
      if (targetCell.given) return;

      if (!isStarted) setIsStarted(true);

      const prevValue = targetCell.value;
      const prevNotes = [...targetCell.notes];

      // PENCIL MODE
      if (pencilMode) {
        const newNotes = targetCell.notes.includes(num)
          ? targetCell.notes.filter((n) => n !== num)
          : [...targetCell.notes, num].sort((a, b) => a - b);

        soundEngine.playPencilNote();
        triggerHaptic("note", settings.haptics);

        historyRef.current.push({
          index: selectedIndex,
          prevValue,
          newValue: 0,
          prevNotes,
          newNotes,
          timestamp: Date.now(),
        });

        setCells((prev) =>
          prev.map((c) =>
            c.index === selectedIndex
              ? { ...c, value: 0, notes: newNotes, isMistake: false }
              : c
          )
        );
        return;
      }

      // NORMAL NUMBER PLACEMENT
      if (targetCell.value === num) {
        // Already set to this number -> erase it
        soundEngine.playEraser();
        triggerHaptic("tap", settings.haptics);

        historyRef.current.push({
          index: selectedIndex,
          prevValue,
          newValue: 0,
          prevNotes,
          newNotes: [],
          timestamp: Date.now(),
        });

        setCells((prev) =>
          prev.map((c) => (c.index === selectedIndex ? { ...c, value: 0, isMistake: false } : c))
        );
        return;
      }

      // Check against solution
      const solutionNum = parseInt(initialPuzzle.solutionGrid[selectedIndex], 10);
      const isCorrect = num === solutionNum;

      if (isCorrect) {
        soundEngine.playPencilDigit();
        triggerHaptic("tap", settings.haptics);

        const peerIndices = getPeers(selectedIndex);

        const nextCells = cells.map((c) => {
          if (c.index === selectedIndex) {
            return { ...c, value: num, notes: [], isMistake: false };
          }
          if (settings.autoRemoveNotes && peerIndices.includes(c.index) && c.notes.includes(num)) {
            return { ...c, notes: c.notes.filter((n) => n !== num) };
          }
          return c;
        });

        historyRef.current.push({
          index: selectedIndex,
          prevValue,
          newValue: num,
          prevNotes,
          newNotes: [],
          timestamp: Date.now(),
        });

        setCells(nextCells);

        // Check completion
        const allFilled = nextCells.every((c) => c.value !== 0);
        if (allFilled) {
          handleGameComplete(nextCells);
        }
      } else {
        // MISTAKE
        soundEngine.playMistake();
        triggerHaptic("mistake", settings.haptics);
        setMistakes((prev) => prev + 1);

        setCells((prev) =>
          prev.map((c) => (c.index === selectedIndex ? { ...c, isMistake: true } : c))
        );

        setTimeout(() => {
          setCells((prev) =>
            prev.map((c) => (c.index === selectedIndex ? { ...c, isMistake: false } : c))
          );
        }, 600);
      }
    },
    [
      selectedIndex,
      isCompleted,
      isPaused,
      cells,
      pencilMode,
      settings.haptics,
      settings.autoRemoveNotes,
      initialPuzzle.solutionGrid,
      isStarted,
      handleGameComplete,
    ]
  );

  // Erase action
  const handleErase = useCallback(() => {
    if (selectedIndex === null || isCompleted || isPaused) return;
    const targetCell = cells[selectedIndex];
    if (targetCell.given) return;
    if (targetCell.value === 0 && targetCell.notes.length === 0) return;

    if (!isStarted) setIsStarted(true);

    soundEngine.playEraser();
    triggerHaptic("tap", settings.haptics);

    historyRef.current.push({
      index: selectedIndex,
      prevValue: targetCell.value,
      newValue: 0,
      prevNotes: [...targetCell.notes],
      newNotes: [],
      timestamp: Date.now(),
    });

    setCells((prev) =>
      prev.map((c) =>
        c.index === selectedIndex ? { ...c, value: 0, notes: [], isMistake: false } : c
      )
    );
  }, [selectedIndex, isCompleted, isPaused, cells, isStarted, settings.haptics]);

  // Undo action
  const handleUndo = useCallback(() => {
    if (historyRef.current.length === 0 || isCompleted || isPaused) return;
    const lastMove = historyRef.current.pop();
    if (!lastMove) return;

    soundEngine.playEraser();
    triggerHaptic("tap", settings.haptics);

    setCells((prev) =>
      prev.map((c) =>
        c.index === lastMove.index
          ? {
              ...c,
              value: lastMove.prevValue,
              notes: lastMove.prevNotes,
              isMistake: false,
            }
          : c
      )
    );
    setSelectedIndex(lastMove.index);
  }, [isCompleted, isPaused, settings.haptics]);

  // Hint action
  const handleHint = useCallback(() => {
    if (isCompleted || isPaused) return;
    if (!isStarted) setIsStarted(true);

    // Find first empty or incorrect non-given cell
    const candidateIndices = cells
      .filter((c) => !c.given && c.value === 0)
      .map((c) => c.index);

    if (candidateIndices.length === 0) return;

    // Pick targeted cell (preferably selected cell if empty, otherwise first empty)
    const targetIndex =
      selectedIndex !== null && candidateIndices.includes(selectedIndex)
        ? selectedIndex
        : candidateIndices[0];

    const correctNum = parseInt(initialPuzzle.solutionGrid[targetIndex], 10);

    soundEngine.playPencilDigit();
    triggerHaptic("tap", settings.haptics);
    setHintsUsed((prev) => prev + 1);

    const peerIndices = getPeers(targetIndex);
    const nextCells = cells.map((c) => {
      if (c.index === targetIndex) {
        return { ...c, value: correctNum, notes: [], isMistake: false };
      }
      if (settings.autoRemoveNotes && peerIndices.includes(c.index) && c.notes.includes(correctNum)) {
        return { ...c, notes: c.notes.filter((n) => n !== correctNum) };
      }
      return c;
    });

    setSelectedIndex(targetIndex);
    setCells(nextCells);

    const allFilled = nextCells.every((c) => c.value !== 0);
    if (allFilled) {
      handleGameComplete(nextCells);
    }
  }, [
    isCompleted,
    isPaused,
    isStarted,
    cells,
    selectedIndex,
    initialPuzzle.solutionGrid,
    settings.haptics,
    settings.autoRemoveNotes,
    handleGameComplete,
  ]);

  // Keyboard navigation and shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCompleted) return;

      // Digits 1-9
      if (e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        handleSetNumber(parseInt(e.key, 10));
        return;
      }

      // Erase
      if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
        e.preventDefault();
        handleErase();
        return;
      }

      // Pencil Toggle
      if (e.key.toLowerCase() === "m" || e.key.toLowerCase() === "p") {
        e.preventDefault();
        setPencilMode((prev) => !prev);
        return;
      }

      // Undo (Ctrl+Z or Cmd+Z)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Navigation Arrows
      if (selectedIndex !== null) {
        const row = getRow(selectedIndex);
        const col = getCol(selectedIndex);

        if (e.key === "ArrowUp" || e.key === "w" || e.key === "k") {
          e.preventDefault();
          if (row > 0) setSelectedIndex(selectedIndex - 9);
        } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "j") {
          e.preventDefault();
          if (row < 8) setSelectedIndex(selectedIndex + 9);
        } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "h") {
          e.preventDefault();
          if (col > 0) setSelectedIndex(selectedIndex - 1);
        } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "l") {
          e.preventDefault();
          if (col < 8) setSelectedIndex(selectedIndex + 1);
        }
      } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        setSelectedIndex(0);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCompleted, selectedIndex, handleSetNumber, handleErase, handleUndo]);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "520px",
        margin: "0 auto",
        padding: "8px 16px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <GameHeaderInfo
        dateStr={initialPuzzle.date || dateStr}
        difficulty={initialPuzzle.difficulty}
        elapsedSeconds={elapsedSeconds}
        mistakes={mistakes}
        isPaused={isPaused}
        onTogglePause={() => setIsPaused((prev) => !prev)}
        showTimer={settings.showTimer}
        showMistakes={settings.showMistakes}
        streak={userStreak}
      />

      {isCompleted && xpBreakdown ? (
        <CompletionSheet
          difficulty={initialPuzzle.difficulty}
          elapsedSeconds={elapsedSeconds}
          xpBreakdown={xpBreakdown}
          isDaily={isDaily}
          dateStr={initialPuzzle.date || dateStr}
          onPlayAnother={onPlayAnother}
        />
      ) : (
        <>
          {isPaused ? (
            <div className="sudoku-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
              <div className="font-doodle" style={{ fontSize: "24px", color: "var(--ink-primary)" }}>
                game paused
              </div>
              <button
                type="button"
                onClick={() => setIsPaused(false)}
                className="doodle-button active"
                style={{ fontSize: "14px", padding: "8px 20px" }}
              >
                resume puzzle
              </button>
            </div>
          ) : (
            <SudokuBoard
              cells={cells}
              selectedIndex={selectedIndex}
              onSelectCell={(idx) => {
                setSelectedIndex(idx);
                if (!isStarted) setIsStarted(true);
              }}
              highlightMatching={settings.highlightMatching}
              highlightRelated={settings.highlightRelated}
            />
          )}

          <NumberPad
            onNumberClick={handleSetNumber}
            onPencilToggle={() => setPencilMode((prev) => !prev)}
            onUndo={handleUndo}
            onErase={handleErase}
            onHint={handleHint}
            pencilMode={pencilMode}
            completedNumbers={completedNumbers}
            numberCounts={numberCounts}
            canUndo={historyRef.current.length > 0}
            disabled={isCompleted || isPaused}
          />
        </>
      )}
    </div>
  );
}
