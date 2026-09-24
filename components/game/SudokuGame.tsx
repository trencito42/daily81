"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  SudokuPuzzle,
  CellState,
  SudokuMove,
  GameSettings,
  XPBreakdown,
  CompletionResult,
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
  getCompletedDailyDates,
} from "@/lib/client/storage";
import { calculatePuzzleXP } from "@/lib/xp/progression";
import { SudokuBoard } from "./SudokuBoard";
import { NumberPad } from "./NumberPad";
import { GameHeaderInfo } from "./GameHeaderInfo";
import { CompletionSheet } from "./CompletionSheet";
import { DoodlePanel } from "../doodle/DoodlePanel";
import { DoodleButton } from "../doodle/DoodleButton";
import { DoodleIcon } from "../doodle/DoodleIcon";

const IS_DEV = process.env.NODE_ENV !== "production";

function logSync(...args: unknown[]) {
  if (IS_DEV) {
    console.log("[daily81 sync]", ...args);
  }
}

/**
 * Three-way merge for Sudoku cells between:
 * - baseGrid: last acknowledged server grid
 * - localCells: current live local board (may contain newer user moves)
 * - serverGrid: newly received server grid (may contain moves from another device)
 */
function threeWayMergeCells(
  baseGrid: string,
  localCells: CellState[],
  serverGrid: string,
  initialGrid: string,
  serverNotes?: Record<string, number[]>
): { mergedCells: CellState[]; hasChanges: boolean } {
  let hasChanges = false;
  const merged: CellState[] = localCells.map((c) => {
    const idx = c.index;
    const isGiven = initialGrid[idx] !== "0";
    if (isGiven) {
      return { ...c, value: parseInt(initialGrid[idx], 10), given: true, notes: [] };
    }

    const baseVal = parseInt(baseGrid[idx] || "0", 10);
    const localVal = c.value;
    const serverVal = parseInt(serverGrid[idx] || "0", 10);

    let finalVal = localVal;
    let finalNotes = [...c.notes];

    if (localVal === baseVal && serverVal !== baseVal) {
      // Remote device filled this cell; local user hasn't touched it -> accept remote
      finalVal = serverVal;
      finalNotes = serverNotes?.[idx] ? [...serverNotes[idx]] : [];
      hasChanges = true;
    } else if (serverVal === baseVal && localVal !== baseVal) {
      // Local user filled this cell; remote hasn't seen it yet -> keep local
      finalVal = localVal;
    } else if (localVal === serverVal) {
      // Both match -> keep
      finalVal = localVal;
    } else {
      // Both devices modified this cell differently:
      if (serverVal !== 0 && localVal === 0) {
        finalVal = serverVal;
        hasChanges = true;
      } else if (localVal !== 0 && serverVal === 0) {
        finalVal = localVal;
      } else {
        // Both non-zero but different: prefer canonical server
        finalVal = serverVal !== 0 ? serverVal : localVal;
        hasChanges = true;
      }
    }

    // Merge pencil notes if cell is empty
    if (finalVal === 0 && serverNotes?.[idx]) {
      const serverCellNotes = serverNotes[idx];
      const union = Array.from(new Set([...finalNotes, ...serverCellNotes])).sort((a, b) => a - b);
      if (union.length !== finalNotes.length) {
        finalNotes = union;
        hasChanges = true;
      }
    } else if (finalVal !== 0) {
      finalNotes = [];
    }

    return {
      ...c,
      value: finalVal,
      notes: finalNotes,
      isMistake: false,
    };
  });

  return { mergedCells: merged, hasChanges };
}

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

  // Completion & practice state
  const [officialCompleted, setOfficialCompleted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const guest = loadGuestProfile();
    const isGuestCompleted = guest.completedPuzzleKeys.includes(initialPuzzle.puzzleKey);
    const isDailyDateMarked = isDaily && dateStr && getCompletedDailyDates().includes(dateStr);
    return Boolean(isGuestCompleted || isDailyDateMarked);
  });
  const [completionResult, setCompletionResult] = useState<CompletionResult | null>(null);
  const [practiceMode, setPracticeMode] = useState<boolean>(false);
  const [practiceCompleted, setPracticeCompleted] = useState<boolean>(false);
  const [xpBreakdown, setXpBreakdown] = useState<XPBreakdown | null>(null);

  const [syncStatus, setSyncStatus] = useState<"saved" | "saving" | "offline" | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<boolean>(true);

  // Latest-state REFS (to eliminate stale closures across async operations)
  const cellsRef = useRef<CellState[]>([]);
  cellsRef.current = cells;

  const mistakesRef = useRef<number>(0);
  mistakesRef.current = mistakes;

  const hintsUsedRef = useRef<number>(0);
  hintsUsedRef.current = hintsUsed;

  const elapsedSecondsRef = useRef<number>(0);
  elapsedSecondsRef.current = elapsedSeconds;

  const isStartedRef = useRef<boolean>(false);
  isStartedRef.current = isStarted;

  const isPausedRef = useRef<boolean>(false);
  isPausedRef.current = isPaused;

  const pencilModeRef = useRef<boolean>(false);
  pencilModeRef.current = pencilMode;

  const selectedIndexRef = useRef<number | null>(null);
  selectedIndexRef.current = selectedIndex;

  const officialCompletedRef = useRef<boolean>(officialCompleted);
  officialCompletedRef.current = officialCompleted;

  const practiceModeRef = useRef<boolean>(practiceMode);
  practiceModeRef.current = practiceMode;

  // Concurrency and Revision Tracking Refs
  const historyRef = useRef<SudokuMove[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const serverVersionRef = useRef<number>(1);
  const isSavingRef = useRef<boolean>(false);
  const saveQueuedRef = useRef<boolean>(false);
  const gameplaySaveDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPeriodicSaveRef = useRef<number>(0);

  const boardRevisionRef = useRef<number>(0);
  const cellRevisionsRef = useRef<number[]>(new Array(81).fill(0));
  const cellMistakeTokenRef = useRef<number[]>(new Array(81).fill(0));
  const lastAcknowledgedGridRef = useRef<string>(initialPuzzle.initialGrid);
  const fetchRequestIdRef = useRef<number>(0);

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

  // Flush remote autosave reading from LATEST refs with save queueing
  const flushRemoteAutosave = useCallback(async (keepalive = false) => {
    if (practiceModeRef.current || officialCompletedRef.current) return;
    if (cellsRef.current.length !== 81 || !isStartedRef.current) return;

    if (isSavingRef.current) {
      logSync("Save already in flight; queuing next save.");
      saveQueuedRef.current = true;
      return;
    }

    try {
      isSavingRef.current = true;
      setSyncStatus("saving");

      const currentGrid = cellsRef.current.map((c) => c.value).join("");
      const notesMap: Record<string, number[]> = {};
      cellsRef.current.forEach((c) => {
        if (c.notes && c.notes.length > 0) {
          notesMap[c.index] = c.notes;
        }
      });

      const currentElapsed = elapsedSecondsRef.current;
      const currentMistakes = mistakesRef.current;
      const currentHints = hintsUsedRef.current;
      const currentStarted = isStartedRef.current;
      const sentVersion = serverVersionRef.current;

      logSync(`Starting autosave v${sentVersion} (${currentGrid.slice(0, 10)}...)`);

      const res = await fetch(`/api/progress/${encodeURIComponent(initialPuzzle.puzzleKey)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        keepalive,
        body: JSON.stringify({
          currentGrid,
          notes: notesMap,
          elapsedSeconds: currentElapsed,
          mistakes: currentMistakes,
          hintsUsed: currentHints,
          isStarted: currentStarted,
          expectedVersion: sentVersion,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.progress) {
          serverVersionRef.current = data.progress.version;
          lastAcknowledgedGridRef.current = currentGrid;
          setSyncStatus("saved");
          logSync(`Autosave accepted, new version v${data.progress.version}`);

          // Broadcast to other tabs
          if (typeof window !== "undefined" && "BroadcastChannel" in window) {
            try {
              const channel = new BroadcastChannel("daily81-progress");
              channel.postMessage({ puzzleKey: initialPuzzle.puzzleKey, version: data.progress.version });
              channel.close();
            } catch {}
          }
        }
      } else if (res.status === 409) {
        // 409 Conflict Reconciliation with Three-Way Merge
        const data = await res.json();
        if (data.progress) {
          const p = data.progress;
          serverVersionRef.current = p.version;
          setSyncStatus("saved");
          logSync(`Autosave 409 conflict. Remote v${p.version}. Reconciling...`);

          if (p.completed) {
            setOfficialCompleted(true);
            setCompletionResult({
              elapsedSeconds: p.elapsedSeconds ?? 0,
              mistakes: p.mistakes ?? 0,
              hintsUsed: p.hintsUsed ?? 0,
              xpAwarded: p.xpAwarded ?? 0,
              completedAt: p.completedAt,
              leaderboardEligible: p.leaderboardEligible,
              dateStr: p.date || dateStr || initialPuzzle.date,
              difficulty: p.difficulty || initialPuzzle.difficulty,
              isDaily: Boolean(p.isDaily ?? isDaily),
              rank: p.rank,
            });
            clearActiveGame(initialPuzzle.puzzleKey);
          } else if (p.currentGrid && p.currentGrid.length === 81) {
            // Three-way merge: base = lastAcknowledgedGrid, local = cellsRef.current, remote = p.currentGrid
            setCells((currentLocalCells) => {
              const { mergedCells, hasChanges } = threeWayMergeCells(
                lastAcknowledgedGridRef.current,
                currentLocalCells,
                p.currentGrid,
                initialPuzzle.initialGrid,
                p.notes
              );
              lastAcknowledgedGridRef.current = p.currentGrid;
              if (hasChanges) {
                boardRevisionRef.current++;
                saveQueuedRef.current = true;
              }
              return mergedCells;
            });

            setMistakes((prev) => Math.max(prev, p.mistakes || 0));
            setHintsUsed((prev) => Math.max(prev, p.hintsUsed || 0));
            setElapsedSeconds((prev) => Math.max(prev, p.elapsedSeconds || 0));
          }
        }
      }
    } catch (err) {
      logSync("Autosave offline/failed:", err);
      setSyncStatus("offline");
    } finally {
      isSavingRef.current = false;
      if (saveQueuedRef.current) {
        saveQueuedRef.current = false;
        logSync("Flushing queued save with newest state.");
        flushRemoteAutosave();
      }
    }
  }, [initialPuzzle.puzzleKey, initialPuzzle.difficulty, initialPuzzle.date, isDaily, dateStr]);

  // Trigger debounced gameplay autosave (only called upon meaningful local mutations)
  const triggerGameplayAutosave = useCallback(() => {
    if (practiceModeRef.current || officialCompletedRef.current) return;

    // Save locally immediately
    saveActiveGame({
      puzzle: initialPuzzle,
      cells: cellsRef.current,
      selectedIndex: selectedIndexRef.current,
      pencilMode: pencilModeRef.current,
      mistakes: mistakesRef.current,
      hintsUsed: hintsUsedRef.current,
      elapsedSeconds: elapsedSecondsRef.current,
      isStarted: isStartedRef.current,
      isPaused: isPausedRef.current,
      isCompleted: false,
      history: historyRef.current,
      historyIndex: historyRef.current.length,
    });

    // Debounce remote autosave by 600ms
    if (gameplaySaveDebounceTimerRef.current) {
      clearTimeout(gameplaySaveDebounceTimerRef.current);
    }
    gameplaySaveDebounceTimerRef.current = setTimeout(() => {
      flushRemoteAutosave();
    }, 600);
  }, [initialPuzzle, flushRemoteAutosave]);

  // Fetch server progress with revision-aware three-way merge
  const fetchServerProgress = useCallback(async () => {
    const fetchId = ++fetchRequestIdRef.current;
    const revisionAtStart = boardRevisionRef.current;

    try {
      logSync(`Fetching server progress (request #${fetchId})...`);
      const res = await fetch(`/api/progress/${encodeURIComponent(initialPuzzle.puzzleKey)}`);
      if (res.ok) {
        const data = await res.json();

        // Discard stale responses if a newer fetch was initiated
        if (fetchRequestIdRef.current !== fetchId) {
          logSync(`Discarding stale fetch #${fetchId}`);
          return;
        }

        if (data.progress) {
          const p = data.progress;
          serverVersionRef.current = p.version || 1;
          setSyncStatus("saved");

          if (p.completed) {
            setOfficialCompleted(true);
            setCompletionResult({
              elapsedSeconds: p.elapsedSeconds ?? 0,
              mistakes: p.mistakes ?? 0,
              hintsUsed: p.hintsUsed ?? 0,
              xpAwarded: p.xpAwarded ?? 0,
              completedAt: p.completedAt,
              leaderboardEligible: p.leaderboardEligible,
              dateStr: p.date || dateStr || initialPuzzle.date,
              difficulty: p.difficulty || initialPuzzle.difficulty,
              isDaily: Boolean(p.isDaily ?? isDaily),
              rank: p.rank,
            });
            clearActiveGame(initialPuzzle.puzzleKey);
            setLoadingProgress(false);
            return;
          }

          if (p.currentGrid && p.currentGrid.length === 81) {
            if (boardRevisionRef.current === revisionAtStart) {
              // No local changes occurred during fetch -> safe direct hydration
              logSync(`Directly hydrating server progress v${p.version}`);
              const serverCells = buildInitialCells(p.currentGrid, p.notes);
              setCells(serverCells);
              lastAcknowledgedGridRef.current = p.currentGrid;
            } else {
              // Local moves WERE made while fetch was in-flight -> perform 3-way merge!
              logSync(`Local changes detected during fetch #${fetchId}. Running 3-way merge.`);
              setCells((currentLocalCells) => {
                const { mergedCells, hasChanges } = threeWayMergeCells(
                  lastAcknowledgedGridRef.current,
                  currentLocalCells,
                  p.currentGrid,
                  initialPuzzle.initialGrid,
                  p.notes
                );
                lastAcknowledgedGridRef.current = p.currentGrid;
                if (hasChanges) {
                  boardRevisionRef.current++;
                  triggerGameplayAutosave();
                }
                return mergedCells;
              });
            }

            setMistakes((prev) => Math.max(prev, p.mistakes || 0));
            setHintsUsed((prev) => Math.max(prev, p.hintsUsed || 0));
            setElapsedSeconds((prev) => Math.max(prev, p.elapsedSeconds || 0));
            if (p.isStarted) setIsStarted(true);
          }
        }
      }
    } catch {
      setSyncStatus("offline");
    } finally {
      setLoadingProgress(false);
    }
  }, [
    initialPuzzle.puzzleKey,
    initialPuzzle.difficulty,
    initialPuzzle.initialGrid,
    initialPuzzle.date,
    isDaily,
    dateStr,
    buildInitialCells,
    triggerGameplayAutosave,
  ]);

  // Initial load: local cache + server progress sync
  useEffect(() => {
    soundEngine.setEnabled(settings.sound);

    // 1. Initialize from local storage for this puzzle
    const saved = loadActiveGame(initialPuzzle.puzzleKey);
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
      lastAcknowledgedGridRef.current = saved.cells.map((c) => c.value).join("");
    } else {
      setCells(buildInitialCells(initialPuzzle.initialGrid));
      setSelectedIndex(null);
      setMistakes(0);
      setHintsUsed(0);
      setElapsedSeconds(0);
      setIsStarted(false);
      historyRef.current = [];
      lastAcknowledgedGridRef.current = initialPuzzle.initialGrid;
    }

    // 2. Start server progress fetch
    fetchServerProgress();
  }, [initialPuzzle.puzzleKey, initialPuzzle.initialGrid, buildInitialCells, settings.sound, fetchServerProgress]);

  // BroadcastChannel for cross-tab sync in same browser
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    const channel = new BroadcastChannel("daily81-progress");
    channel.onmessage = (e) => {
      if (e.data?.puzzleKey === initialPuzzle.puzzleKey && e.data?.version > serverVersionRef.current) {
        logSync("BroadcastChannel message received. Refreshing progress...");
        fetchServerProgress();
      }
    };
    return () => {
      channel.close();
    };
  }, [initialPuzzle.puzzleKey, fetchServerProgress]);

  // Timer Tick (isolated; does NOT re-trigger remote autosave debounce)
  useEffect(() => {
    const isGameActive = isStarted && !isPaused && (!officialCompleted || practiceMode) && !practiceCompleted;
    if (isGameActive) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isStarted, isPaused, officialCompleted, practiceMode, practiceCompleted]);

  // Periodic Timer Sync (every 15s, separate from gameplay autosave)
  useEffect(() => {
    if (
      !practiceMode &&
      !officialCompleted &&
      isStarted &&
      !isPaused &&
      elapsedSeconds > 0 &&
      elapsedSeconds - lastPeriodicSaveRef.current >= 15
    ) {
      lastPeriodicSaveRef.current = elapsedSeconds;
      flushRemoteAutosave();
    }
  }, [elapsedSeconds, isStarted, isPaused, officialCompleted, practiceMode, flushRemoteAutosave]);

  // Visibility / Tab focus / pagehide handling
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden" && isStartedRef.current && !officialCompletedRef.current && !practiceModeRef.current) {
        setIsPaused(true);
        flushRemoteAutosave(true);
      } else if (document.visibilityState === "visible" && !officialCompletedRef.current && !practiceModeRef.current) {
        fetchServerProgress();
      }
    };

    const handlePageHide = () => {
      if (isStartedRef.current && !officialCompletedRef.current && !practiceModeRef.current) {
        flushRemoteAutosave(true);
      }
    };

    const handleFocus = () => {
      if (!officialCompletedRef.current && !practiceModeRef.current) {
        fetchServerProgress();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handlePageHide);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handlePageHide);
      window.removeEventListener("focus", handleFocus);
    };
  }, [flushRemoteAutosave, fetchServerProgress]);

  // Start Practice Replay Mode
  const handleStartPracticeReplay = useCallback(() => {
    setPracticeMode(true);
    setPracticeCompleted(false);
    setCells(buildInitialCells(initialPuzzle.initialGrid));
    setSelectedIndex(null);
    setPencilMode(false);
    setMistakes(0);
    setHintsUsed(0);
    setElapsedSeconds(0);
    setIsStarted(false);
    setIsPaused(false);
    historyRef.current = [];
    boardRevisionRef.current++;
    cellRevisionsRef.current = new Array(81).fill(0);
  }, [buildInitialCells, initialPuzzle.initialGrid]);

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
      soundEngine.playSolved();
      triggerHaptic("complete", settings.haptics);

      const finalGrid = finalCells.map((c) => c.value).join("");
      const isSolved = isGridCompleteAndValid(finalGrid);

      if (!isSolved) return;

      if (practiceModeRef.current) {
        setPracticeCompleted(true);
        setIsPaused(false);
        return;
      }

      setOfficialCompleted(true);
      setIsPaused(false);
      clearActiveGame(initialPuzzle.puzzleKey);

      const currentElapsed = elapsedSecondsRef.current;
      const currentMistakes = mistakesRef.current;
      const currentHints = hintsUsedRef.current;

      const guestProfile = loadGuestProfile();
      const xpResult = calculatePuzzleXP({
        difficulty: initialPuzzle.difficulty,
        isDaily,
        mistakes: currentMistakes,
        hintsUsed: currentHints,
        elapsedSeconds: currentElapsed,
        userCurrentXP: guestProfile.xp,
      });

      setXpBreakdown(xpResult);
      setCompletionResult({
        elapsedSeconds: currentElapsed,
        mistakes: currentMistakes,
        hintsUsed: currentHints,
        xpAwarded: xpResult.totalXP,
        completedAt: new Date().toISOString(),
        leaderboardEligible: currentHints === 0 && currentMistakes === 0 && currentElapsed >= 15,
        dateStr: initialPuzzle.date || dateStr,
        difficulty: initialPuzzle.difficulty,
        isDaily,
        xpBreakdown: xpResult,
      });

      // Record locally for guest
      recordGuestGameCompletion({
        puzzleKey: initialPuzzle.puzzleKey,
        difficulty: initialPuzzle.difficulty,
        isDaily,
        dateStr: initialPuzzle.date || dateStr,
        elapsedSeconds: currentElapsed,
        mistakes: currentMistakes,
        hints: currentHints,
        xpEarned: xpResult.totalXP,
      });

      if (isDaily && (dateStr || initialPuzzle.date)) {
        markDailyDateCompleted(dateStr || initialPuzzle.date!);
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
            elapsedSeconds: currentElapsed,
            mistakes: currentMistakes,
            hintsUsed: currentHints,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.xpBreakdown) {
            setXpBreakdown(data.xpBreakdown);
          }
          if (data.rank !== undefined) {
            setCompletionResult((prev) => (prev ? { ...prev, rank: data.rank } : null));
          }
        }
      } catch {
        // Offline fallback
      }
    },
    [initialPuzzle, isDaily, dateStr, settings.haptics]
  );

  // Set number action: OPTIMISTIC placement + atomic functional state update + race-safe validation
  const handleSetNumber = useCallback(
    async (num: number) => {
      const isInteractionDisabled =
        (officialCompletedRef.current && !practiceModeRef.current) || isPausedRef.current || practiceCompleted;
      const selected = selectedIndexRef.current;
      if (selected === null || isInteractionDisabled) return;

      const targetCell = cellsRef.current[selected];
      if (!targetCell || targetCell.given) return;

      if (!isStartedRef.current) setIsStarted(true);

      const targetIndex = selected;
      const prevValue = targetCell.value;
      const prevNotes = [...targetCell.notes];

      // 1. PENCIL MODE (Atomic local update)
      if (pencilModeRef.current) {
        const newNotes = targetCell.notes.includes(num)
          ? targetCell.notes.filter((n) => n !== num)
          : [...targetCell.notes, num].sort((a, b) => a - b);

        soundEngine.playPencilNote();
        triggerHaptic("note", settings.haptics);

        historyRef.current.push({
          index: targetIndex,
          prevValue,
          newValue: 0,
          prevNotes,
          newNotes,
          timestamp: Date.now(),
        });

        cellRevisionsRef.current[targetIndex]++;
        boardRevisionRef.current++;

        setCells((prev) =>
          prev.map((c) =>
            c.index === targetIndex ? { ...c, value: 0, notes: newNotes, isMistake: false } : c
          )
        );

        triggerGameplayAutosave();
        return;
      }

      // 2. ERASE (When typing the same digit)
      if (targetCell.value === num) {
        soundEngine.playEraser();
        triggerHaptic("tap", settings.haptics);

        historyRef.current.push({
          index: targetIndex,
          prevValue,
          newValue: 0,
          prevNotes,
          newNotes: [],
          timestamp: Date.now(),
        });

        cellRevisionsRef.current[targetIndex]++;
        boardRevisionRef.current++;

        setCells((prev) =>
          prev.map((c) => (c.index === targetIndex ? { ...c, value: 0, notes: [], isMistake: false } : c))
        );

        triggerGameplayAutosave();
        return;
      }

      // 3. OPTIMISTIC DIGIT PLACEMENT (Immediate UI response)
      soundEngine.playPencilDigit();
      triggerHaptic("tap", settings.haptics);

      const peerIndices = getPeers(targetIndex);
      const removedPeerNotes: { index: number; notes: number[] }[] = [];

      const currentCellRevision = ++cellRevisionsRef.current[targetIndex];
      boardRevisionRef.current++;

      setCells((prev) => {
        return prev.map((c) => {
          if (c.index === targetIndex) {
            return { ...c, value: num, notes: [], isMistake: false };
          }
          if (settings.autoRemoveNotes && peerIndices.includes(c.index) && c.notes.includes(num)) {
            removedPeerNotes.push({ index: c.index, notes: [num] });
            return { ...c, notes: c.notes.filter((n) => n !== num) };
          }
          return c;
        });
      });

      historyRef.current.push({
        index: targetIndex,
        prevValue,
        newValue: num,
        prevNotes,
        newNotes: [],
        removedPeerNotes,
        timestamp: Date.now(),
      });

      triggerGameplayAutosave();

      // Check immediate completion if all filled
      const latestGrid = cellsRef.current.map((c) => (c.index === targetIndex ? num : c.value)).join("");
      if (!latestGrid.includes("0") && isGridCompleteAndValid(latestGrid)) {
        handleGameComplete(cellsRef.current.map((c) => (c.index === targetIndex ? { ...c, value: num } : c)));
      }

      // 4. ASYNC BACKGROUND VALIDATION (Race-safe per-cell revision check)
      let isCorrect = true;
      try {
        const res = await fetch("/api/game/check-move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            puzzleKey: initialPuzzle.puzzleKey,
            index: targetIndex,
            number: num,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          isCorrect = Boolean(data.correct);
        }
      } catch {
        // Fallback: check peer conflicts client-side
        isCorrect = !peerIndices.some((idx) => cellsRef.current[idx]?.value === num);
      }

      if (!isCorrect) {
        // Only revert if cell has NOT been modified by a newer move in the meantime!
        if (cellRevisionsRef.current[targetIndex] === currentCellRevision) {
          logSync(`Move at index ${targetIndex} (${num}) rejected by server. Reverting.`);
          soundEngine.playMistake();
          triggerHaptic("mistake", settings.haptics);
          setMistakes((prev) => prev + 1);

          const mistakeToken = ++cellMistakeTokenRef.current[targetIndex];
          cellRevisionsRef.current[targetIndex]++;
          boardRevisionRef.current++;

          setCells((prev) =>
            prev.map((c) =>
              c.index === targetIndex ? { ...c, value: 0, isMistake: true } : c
            )
          );

          triggerGameplayAutosave();

          // Clear visual mistake glow after 600ms safely
          setTimeout(() => {
            if (cellMistakeTokenRef.current[targetIndex] === mistakeToken) {
              setCells((prev) =>
                prev.map((c) => (c.index === targetIndex ? { ...c, isMistake: false } : c))
              );
            }
          }, 600);
        } else {
          logSync(`Stale invalidation for cell ${targetIndex} ignored (newer revision active).`);
        }
      }
    },
    [
      practiceCompleted,
      settings.haptics,
      settings.autoRemoveNotes,
      initialPuzzle.puzzleKey,
      triggerGameplayAutosave,
      handleGameComplete,
    ]
  );

  // Erase action
  const handleErase = useCallback(() => {
    const isInteractionDisabled =
      (officialCompletedRef.current && !practiceModeRef.current) || isPausedRef.current || practiceCompleted;
    const selected = selectedIndexRef.current;
    if (selected === null || isInteractionDisabled) return;

    const targetCell = cellsRef.current[selected];
    if (!targetCell || targetCell.given) return;
    if (targetCell.value === 0 && targetCell.notes.length === 0) return;

    if (!isStartedRef.current) setIsStarted(true);

    soundEngine.playEraser();
    triggerHaptic("tap", settings.haptics);

    historyRef.current.push({
      index: selected,
      prevValue: targetCell.value,
      newValue: 0,
      prevNotes: [...targetCell.notes],
      newNotes: [],
      timestamp: Date.now(),
    });

    cellRevisionsRef.current[selected]++;
    boardRevisionRef.current++;

    setCells((prev) =>
      prev.map((c) => (c.index === selected ? { ...c, value: 0, notes: [], isMistake: false } : c))
    );

    triggerGameplayAutosave();
  }, [practiceCompleted, settings.haptics, triggerGameplayAutosave]);

  // Undo action with full peer notes restoration
  const handleUndo = useCallback(() => {
    const isInteractionDisabled =
      (officialCompletedRef.current && !practiceModeRef.current) || isPausedRef.current || practiceCompleted;
    if (historyRef.current.length === 0 || isInteractionDisabled) return;

    const lastMove = historyRef.current.pop();
    if (!lastMove) return;

    soundEngine.playEraser();
    triggerHaptic("tap", settings.haptics);

    cellRevisionsRef.current[lastMove.index]++;
    boardRevisionRef.current++;

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
    triggerGameplayAutosave();
  }, [practiceCompleted, settings.haptics, triggerGameplayAutosave]);

  // Hint action with race-safe cell revision check
  const handleHint = useCallback(async () => {
    const isInteractionDisabled =
      (officialCompletedRef.current && !practiceModeRef.current) || isPausedRef.current || practiceCompleted;
    if (isInteractionDisabled) return;
    if (!isStartedRef.current) setIsStarted(true);

    const currentCells = cellsRef.current;
    const candidateIndices = currentCells
      .filter((c) => !c.given && c.value === 0)
      .map((c) => c.index);

    if (candidateIndices.length === 0) return;

    const selected = selectedIndexRef.current;
    const targetIndex =
      selected !== null && candidateIndices.includes(selected) ? selected : candidateIndices[0];

    const targetRevision = cellRevisionsRef.current[targetIndex];

    let correctNum = 0;
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

    if (!correctNum) return;

    // Ensure target cell has not been filled or changed while hint was fetching
    if (cellRevisionsRef.current[targetIndex] !== targetRevision || cellsRef.current[targetIndex]?.value !== 0) {
      logSync(`Stale hint response for cell ${targetIndex} discarded.`);
      return;
    }

    soundEngine.playPencilDigit();
    triggerHaptic("tap", settings.haptics);
    setHintsUsed((prev) => prev + 1);

    const peerIndices = getPeers(targetIndex);
    const removedPeerNotes: { index: number; notes: number[] }[] = [];

    cellRevisionsRef.current[targetIndex]++;
    boardRevisionRef.current++;

    setCells((prev) =>
      prev.map((c) => {
        if (c.index === targetIndex) {
          return { ...c, value: correctNum, notes: [], isMistake: false };
        }
        if (settings.autoRemoveNotes && peerIndices.includes(c.index) && c.notes.includes(correctNum)) {
          removedPeerNotes.push({ index: c.index, notes: [correctNum] });
          return { ...c, notes: c.notes.filter((n) => n !== correctNum) };
        }
        return c;
      })
    );

    historyRef.current.push({
      index: targetIndex,
      prevValue: 0,
      newValue: correctNum,
      prevNotes: cellsRef.current[targetIndex]?.notes || [],
      newNotes: [],
      removedPeerNotes,
      timestamp: Date.now(),
    });

    setSelectedIndex(targetIndex);
    triggerGameplayAutosave();

    // Check completion
    const latestGrid = cellsRef.current.map((c) => (c.index === targetIndex ? correctNum : c.value)).join("");
    if (!latestGrid.includes("0") && isGridCompleteAndValid(latestGrid)) {
      handleGameComplete(cellsRef.current.map((c) => (c.index === targetIndex ? { ...c, value: correctNum } : c)));
    }
  }, [
    practiceCompleted,
    initialPuzzle.puzzleKey,
    settings.haptics,
    settings.autoRemoveNotes,
    triggerGameplayAutosave,
    handleGameComplete,
  ]);

  // Keyboard navigation and shortcuts with e.repeat guard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((officialCompletedRef.current && !practiceModeRef.current) || practiceCompleted) return;
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

      // Undo
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
  }, [practiceCompleted, handleSetNumber, handleErase, handleUndo, handleHint]);

  const handleCellClick = useCallback(
    (index: number) => {
      if ((officialCompletedRef.current && !practiceModeRef.current) || isPausedRef.current || practiceCompleted) {
        return;
      }
      if (!isStartedRef.current) setIsStarted(true);
      setSelectedIndex((prev) => (prev === index ? null : index));
      triggerHaptic("tap", settings.haptics);
    },
    [practiceCompleted, settings.haptics]
  );

  const handleTogglePause = useCallback(() => {
    if ((officialCompletedRef.current && !practiceModeRef.current) || practiceCompleted) return;
    setIsPaused((prev) => !prev);
    if (!isStartedRef.current) setIsStarted(true);
  }, [practiceCompleted]);

  // Loading state fallback while initial sync is executing
  if (loadingProgress && cells.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 16px", color: "var(--ink-secondary)" }}>
        <span className="font-doodle" style={{ fontSize: "15px" }}>opening notebook...</span>
      </div>
    );
  }

  // 1. OFFICIAL COMPLETED STATE (NOT IN PRACTICE MODE)
  if (officialCompleted && !practiceMode) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          maxWidth: "var(--page-game, 460px)",
          margin: "0 auto",
          padding: "4px 12px 20px",
          boxSizing: "border-box",
        }}
      >
        <GameHeaderInfo
          difficulty={completionResult?.difficulty || initialPuzzle.difficulty}
          dateStr={completionResult?.dateStr || dateStr || initialPuzzle.date}
          elapsedSeconds={completionResult?.elapsedSeconds || elapsedSeconds}
          mistakes={completionResult?.mistakes || mistakes}
          isPaused={false}
          onTogglePause={() => {}}
          streak={userStreak}
          syncStatus={syncStatus}
        />

        <CompletionSheet
          difficulty={completionResult?.difficulty || initialPuzzle.difficulty}
          elapsedSeconds={completionResult?.elapsedSeconds || elapsedSeconds}
          xpBreakdown={xpBreakdown || completionResult?.xpBreakdown}
          xpAwarded={completionResult?.xpAwarded ?? 0}
          mistakes={completionResult?.mistakes ?? mistakes}
          hintsUsed={completionResult?.hintsUsed ?? hintsUsed}
          isDaily={isDaily}
          dateStr={completionResult?.dateStr || dateStr || initialPuzzle.date}
          rank={completionResult?.rank}
          onReplayPractice={handleStartPracticeReplay}
          onPlayAnother={onPlayAnother}
        />
      </div>
    );
  }

  // 2. PRACTICE COMPLETED STATE
  if (practiceMode && practiceCompleted) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          maxWidth: "var(--page-game, 460px)",
          margin: "0 auto",
          padding: "4px 12px 20px",
          boxSizing: "border-box",
        }}
      >
        <GameHeaderInfo
          title="daily sudoku (practice)"
          difficulty={initialPuzzle.difficulty}
          dateStr={dateStr || initialPuzzle.date}
          elapsedSeconds={elapsedSeconds}
          mistakes={mistakes}
          isPaused={false}
          onTogglePause={() => {}}
          streak={userStreak}
        />

        <CompletionSheet
          difficulty={initialPuzzle.difficulty}
          elapsedSeconds={elapsedSeconds}
          mistakes={mistakes}
          hintsUsed={hintsUsed}
          isDaily={isDaily}
          dateStr={dateStr || initialPuzzle.date}
          isPractice={true}
          onReplayPractice={handleStartPracticeReplay}
          onPlayAnother={() => setPracticeMode(false)}
        />
      </div>
    );
  }

  // 3. ACTIVE INTERACTIVE GAMEPLAY (NEW, IN-PROGRESS, OR PRACTICE REPLAY)
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        maxWidth: "var(--page-game, 460px)",
        margin: "0 auto",
        padding: "4px 12px 20px",
        boxSizing: "border-box",
      }}
    >
      <GameHeaderInfo
        title={practiceMode ? "daily sudoku (practice)" : undefined}
        difficulty={initialPuzzle.difficulty}
        dateStr={dateStr || initialPuzzle.date}
        elapsedSeconds={elapsedSeconds}
        mistakes={mistakes}
        isPaused={isPaused}
        onTogglePause={handleTogglePause}
        streak={userStreak}
        syncStatus={practiceMode ? null : syncStatus}
      />

      <div style={{ position: "relative", width: "100%", maxWidth: "min(calc(100vw - 28px), var(--board-max-size, 440px))" }}>
        <SudokuBoard
          cells={cells}
          selectedIndex={selectedIndex}
          onSelectCell={handleCellClick}
          highlightMatching={settings.highlightMatching}
          highlightRelated={settings.highlightRelated}
        />

        {isPaused && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              zIndex: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "var(--bg-paper)",
              padding: "16px",
              boxSizing: "border-box",
            }}
          >
            <DoodlePanel
              variant="default"
              tape="yellow"
              padding="lg"
              style={{ textAlign: "center", maxWidth: "290px" }}
            >
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px", color: "var(--ink-primary)" }}>
                <DoodleIcon name="pause" size={32} />
              </div>
              <div style={{ fontSize: "19px", fontWeight: 600, color: "var(--ink-primary)", marginBottom: "4px" }}>
                puzzle paused
              </div>
              <div style={{ fontSize: "13px", color: "var(--ink-secondary)", marginBottom: "14px", lineHeight: 1.3 }}>
                grid covered while you take a breather
              </div>
              <DoodleButton
                variant="primary"
                size="md"
                onClick={handleTogglePause}
                icon="play"
              >
                resume puzzle
              </DoodleButton>
            </DoodlePanel>
          </div>
        )}
      </div>

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
        disabled={isPaused}
      />
    </div>
  );
}


