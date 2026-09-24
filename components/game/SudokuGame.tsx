"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  SudokuPuzzle,
  CellState,
  SudokuMove,
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
  const serverVersionRef = useRef<number>(1);
  const isSavingRef = useRef<boolean>(false);
  const pendingSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPeriodicSaveRef = useRef<number>(0);

  // Helper to build initial cells array
  const buildInitialCells = useCallback((gridStr: string, notesMap?: Record<string, number[]>): CellState[] => {
    const list: CellState[] = [];
    const gridChars = gridStr.split("");
    for (let i = 0; i < 81; i++) {
      const val = parseInt(gridChars[i] || "0", 10);
      const given = initialPuzzle.initialGrid[i] !== "0";
      list.push({
        index: i,
        row: getRow(i),
        col: getCol(i),
        block: getBlock(i),
        value: val,
        given,
        notes: notesMap && notesMap[i] ? notesMap[i] : [],
        isMistake: false,
      });
    }
    return list;
  }, [initialPuzzle.initialGrid]);

  // Initial load: local cache + server progress sync
  useEffect(() => {
    soundEngine.setEnabled(settings.sound);

    // 1. Initialize from local state if matches
    const saved = loadActiveGame();
    let initialLoaded = false;
    if (
      saved &&
      saved.puzzle &&
      saved.puzzle.puzzleKey === initialPuzzle.puzzleKey &&
      saved.cells &&
      !saved.isCompleted
    ) {
      setCells(saved.cells);
      setSelectedIndex(saved.selectedIndex ?? null);
      setPencilMode(saved.pencilMode ?? false);
      setMistakes(saved.mistakes ?? 0);
      setHintsUsed(saved.hintsUsed ?? 0);
      setElapsedSeconds(saved.elapsedSeconds ?? 0);
      setIsStarted(saved.isStarted ?? false);
      initialLoaded = true;
    } else {
      setCells(buildInitialCells(initialPuzzle.initialGrid));
      setSelectedIndex(null);
      setMistakes(0);
      setHintsUsed(0);
      setElapsedSeconds(0);
      setIsStarted(false);
      setIsCompleted(false);
      setXpBreakdown(null);
      historyRef.current = [];
    }

    // 2. Fetch server progress for authenticated cross-device sync
    const fetchServerProgress = async () => {
      try {
        const res = await fetch(`/api/progress/${encodeURIComponent(initialPuzzle.puzzleKey)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.progress) {
            const p = data.progress;
            serverVersionRef.current = p.version || 1;

            if (p.completed) {
              setIsCompleted(true);
              clearActiveGame();
              return;
            }

            // If server has progress and it's started, reconcile
            if (p.currentGrid && p.currentGrid.length === 81) {
              const serverCells = buildInitialCells(p.currentGrid, p.notes);
              setCells(serverCells);
              setMistakes(Math.max(saved?.mistakes || 0, p.mistakes || 0));
              setHintsUsed(Math.max(saved?.hintsUsed || 0, p.hintsUsed || 0));
              setElapsedSeconds(Math.max(saved?.elapsedSeconds || 0, p.elapsedSeconds || 0));
              if (p.isStarted) setIsStarted(true);
            }
          }
        }
      } catch {
        // Offline fallback
      }
    };

    fetchServerProgress();
  }, [initialPuzzle.puzzleKey, initialPuzzle.initialGrid, buildInitialCells, settings.sound]);

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

  // Remote autosave function
  const flushRemoteAutosave = useCallback(async () => {
    if (cells.length !== 81 || !isStarted || isCompleted || isSavingRef.current) return;

    try {
      isSavingRef.current = true;
      const currentGrid = cells.map((c) => c.value).join("");
      const notesMap: Record<string, number[]> = {};
      cells.forEach((c) => {
        if (c.notes && c.notes.length > 0) {
          notesMap[c.index] = c.notes;
        }
      });

      const res = await fetch(`/api/progress/${encodeURIComponent(initialPuzzle.puzzleKey)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentGrid,
          notes: notesMap,
          elapsedSeconds,
          mistakes,
          hintsUsed,
          isStarted,
          expectedVersion: serverVersionRef.current,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.progress) {
          serverVersionRef.current = data.progress.version;
        }
      } else if (res.status === 409) {
        // Conflict resolution: reconcile to canonical server state
        const data = await res.json();
        if (data.progress) {
          const p = data.progress;
          serverVersionRef.current = p.version;
          if (p.completed) {
            setIsCompleted(true);
            clearActiveGame();
          } else if (p.currentGrid && p.currentGrid.length === 81) {
            setCells(buildInitialCells(p.currentGrid, p.notes));
            setMistakes(p.mistakes || 0);
            setHintsUsed(p.hintsUsed || 0);
            setElapsedSeconds(p.elapsedSeconds || 0);
          }
        }
      }
    } catch {
      // Offline fallback
    } finally {
      isSavingRef.current = false;
    }
  }, [cells, isStarted, isCompleted, elapsedSeconds, mistakes, hintsUsed, initialPuzzle.puzzleKey, buildInitialCells]);

  // Local storage save & debounced server autosave
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

      // Debounce server autosave by 800ms
      if (pendingSaveTimerRef.current) clearTimeout(pendingSaveTimerRef.current);
      pendingSaveTimerRef.current = setTimeout(() => {
        flushRemoteAutosave();
      }, 800);
    }
  }, [cells, selectedIndex, pencilMode, mistakes, hintsUsed, isStarted, isCompleted, initialPuzzle, elapsedSeconds, isPaused, flushRemoteAutosave]);

  // Periodic timer sync every 15s without sending requests every single second
  useEffect(() => {
    if (isStarted && !isPaused && !isCompleted && elapsedSeconds > 0 && elapsedSeconds - lastPeriodicSaveRef.current >= 15) {
      lastPeriodicSaveRef.current = elapsedSeconds;
      flushRemoteAutosave();
    }
  }, [elapsedSeconds, isStarted, isPaused, isCompleted, flushRemoteAutosave]);

  // Handle visibility & pagehide flushing
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden" && isStarted && !isCompleted) {
        setIsPaused(true);
        flushRemoteAutosave();
      }
    };
    const handlePageHide = () => {
      if (isStarted && !isCompleted) {
        flushRemoteAutosave();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handlePageHide);
    };
  }, [isStarted, isCompleted, flushRemoteAutosave]);

  // Calculate completed numbers & counts
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

      // Sync server-side atomically
      try {
        const res = await fetch("/api/game/complete", {
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

        if (res.ok) {
          const data = await res.json();
          if (data.xpBreakdown) {
            setXpBreakdown(data.xpBreakdown);
          }
        }
      } catch {
        // Offline fallback
      }
    },
    [initialPuzzle, isDaily, dateStr, elapsedSeconds, mistakes, hintsUsed, settings.haptics]
  );

  // Set number action with secure move check & peer notes restoration
  const handleSetNumber = useCallback(
    async (num: number) => {
      if (selectedIndex === null || isCompleted || isPaused) return;
      const targetCell = cells[selectedIndex];
      if (targetCell.given) return;

      if (!isStarted) setIsStarted(true);

      const prevValue = targetCell.value;
      const prevNotes = [...targetCell.notes];

      // 1. PENCIL MODE
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

      // 2. NORMAL NUMBER PLACEMENT
      if (targetCell.value === num) {
        // Erase
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

      // 3. SECURE MOVE VALIDATION
      let isCorrect = true;
      if (initialPuzzle.solutionGrid) {
        // Client has solutionGrid (e.g. offline mode)
        const solutionNum = parseInt(initialPuzzle.solutionGrid[selectedIndex], 10);
        isCorrect = num === solutionNum;
      } else {
        // Check with server move check API
        try {
          const res = await fetch("/api/game/check-move", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              puzzleKey: initialPuzzle.puzzleKey,
              index: selectedIndex,
              number: num,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            isCorrect = Boolean(data.correct);
          }
        } catch {
          // Fallback: check peer conflicts client-side
          const peerIndices = getPeers(selectedIndex);
          isCorrect = !peerIndices.some((idx) => cells[idx].value === num);
        }
      }

      if (isCorrect) {
        soundEngine.playPencilDigit();
        triggerHaptic("tap", settings.haptics);

        const peerIndices = getPeers(selectedIndex);
        const removedPeerNotes: { index: number; notes: number[] }[] = [];

        const nextCells = cells.map((c) => {
          if (c.index === selectedIndex) {
            return { ...c, value: num, notes: [], isMistake: false };
          }
          if (settings.autoRemoveNotes && peerIndices.includes(c.index) && c.notes.includes(num)) {
            removedPeerNotes.push({ index: c.index, notes: [num] });
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
          removedPeerNotes,
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
      initialPuzzle.puzzleKey,
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

  // Undo action with full peer notes restoration
  const handleUndo = useCallback(() => {
    if (historyRef.current.length === 0 || isCompleted || isPaused) return;
    const lastMove = historyRef.current.pop();
    if (!lastMove) return;

    soundEngine.playEraser();
    triggerHaptic("tap", settings.haptics);

    setCells((prev) => {
      const removedMap = new Map<number, number[]>();
      if (lastMove.removedPeerNotes) {
        lastMove.removedPeerNotes.forEach((r) => {
          removedMap.set(r.index, r.notes);
        });
      }

      return prev.map((c) => {
        if (c.index === lastMove.index) {
          return {
            ...c,
            value: lastMove.prevValue,
            notes: lastMove.prevNotes,
            isMistake: false,
          };
        }
        if (removedMap.has(c.index)) {
          const restoredNotes = Array.from(new Set([...c.notes, ...(removedMap.get(c.index) || [])])).sort(
            (a, b) => a - b
          );
          return { ...c, notes: restoredNotes };
        }
        return c;
      });
    });

    setSelectedIndex(lastMove.index);
  }, [isCompleted, isPaused, settings.haptics]);

  // Hint action with server-backed reveal
  const handleHint = useCallback(async () => {
    if (isCompleted || isPaused) return;
    if (!isStarted) setIsStarted(true);

    const candidateIndices = cells
      .filter((c) => !c.given && c.value === 0)
      .map((c) => c.index);

    if (candidateIndices.length === 0) return;

    const targetIndex =
      selectedIndex !== null && candidateIndices.includes(selectedIndex)
        ? selectedIndex
        : candidateIndices[0];

    let correctNum = 0;
    if (initialPuzzle.solutionGrid) {
      correctNum = parseInt(initialPuzzle.solutionGrid[targetIndex], 10);
    } else {
      try {
        const res = await fetch("/api/game/hint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            puzzleKey: initialPuzzle.puzzleKey,
            index: targetIndex,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          correctNum = data.number;
        }
      } catch {
        // Fallback
      }
    }

    if (!correctNum) return;

    soundEngine.playPencilDigit();
    triggerHaptic("tap", settings.haptics);
    setHintsUsed((prev) => prev + 1);

    const peerIndices = getPeers(targetIndex);
    const removedPeerNotes: { index: number; notes: number[] }[] = [];

    const nextCells = cells.map((c) => {
      if (c.index === targetIndex) {
        return { ...c, value: correctNum, notes: [], isMistake: false };
      }
      if (settings.autoRemoveNotes && peerIndices.includes(c.index) && c.notes.includes(correctNum)) {
        removedPeerNotes.push({ index: c.index, notes: [correctNum] });
        return { ...c, notes: c.notes.filter((n) => n !== correctNum) };
      }
      return c;
    });

    historyRef.current.push({
      index: targetIndex,
      prevValue: 0,
      newValue: correctNum,
      prevNotes: cells[targetIndex]?.notes || [],
      newNotes: [],
      removedPeerNotes,
      timestamp: Date.now(),
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
    initialPuzzle.puzzleKey,
    initialPuzzle.solutionGrid,
    settings.haptics,
    settings.autoRemoveNotes,
    handleGameComplete,
  ]);

  // Keyboard navigation and shortcuts with e.repeat guard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCompleted) return;

      // Ignore held-down repeated keys
      if (e.repeat) return;

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

      // Hint (H)
      if (e.key.toLowerCase() === "h") {
        e.preventDefault();
        handleHint();
        return;
      }

      // Arrow Key Navigation
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        setSelectedIndex((curr) => {
          if (curr === null) return 0;
          const r = getRow(curr);
          const c = getCol(curr);

          if (e.key === "ArrowUp") return r > 0 ? (r - 1) * 9 + c : curr;
          if (e.key === "ArrowDown") return r < 8 ? (r + 1) * 9 + c : curr;
          if (e.key === "ArrowLeft") return c > 0 ? r * 9 + (c - 1) : curr;
          if (e.key === "ArrowRight") return c < 8 ? r * 9 + (c + 1) : curr;
          return curr;
        });
        return;
      }

      // Escape to deselect
      if (e.key === "Escape") {
        setSelectedIndex(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCompleted, handleSetNumber, handleErase, handleUndo, handleHint]);

  const handleCellClick = useCallback(
    (index: number) => {
      if (isCompleted || isPaused) return;
      if (!isStarted) setIsStarted(true);
      setSelectedIndex((prev) => (prev === index ? null : index));
      triggerHaptic("tap", settings.haptics);
    },
    [isCompleted, isPaused, isStarted, settings.haptics]
  );

  const handleTogglePause = useCallback(() => {
    if (isCompleted) return;
    setIsPaused((prev) => !prev);
    if (!isStarted) setIsStarted(true);
  }, [isCompleted, isStarted]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        maxWidth: "440px",
        margin: "0 auto",
        padding: "8px 12px 24px",
        boxSizing: "border-box",
      }}
    >
      <GameHeaderInfo
        difficulty={initialPuzzle.difficulty}
        dateStr={dateStr || initialPuzzle.date}
        elapsedSeconds={elapsedSeconds}
        mistakes={mistakes}
        isPaused={isPaused}
        onTogglePause={handleTogglePause}
      />

      <SudokuBoard
        cells={cells}
        selectedIndex={selectedIndex}
        onSelectCell={handleCellClick}
        highlightMatching={settings.highlightMatching}
        highlightRelated={settings.highlightRelated}
      />

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

      {isCompleted && xpBreakdown && (
        <CompletionSheet
          difficulty={initialPuzzle.difficulty}
          elapsedSeconds={elapsedSeconds}
          xpBreakdown={xpBreakdown}
          isDaily={isDaily}
          dateStr={dateStr || initialPuzzle.date}
          onPlayAnother={onPlayAnother}
        />
      )}
    </div>
  );
}
