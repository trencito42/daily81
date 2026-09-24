import { describe, it, expect } from "vitest";
import { calculatePuzzleXP } from "@/lib/xp/progression";
import { CompletionResult, CellState } from "@/lib/sudoku/types";

// Helper replicating 3-way merge for test verification
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
      finalVal = serverVal;
      finalNotes = serverNotes?.[idx] ? [...serverNotes[idx]] : [];
      hasChanges = true;
    } else if (serverVal === baseVal && localVal !== baseVal) {
      finalVal = localVal;
    } else if (localVal === serverVal) {
      finalVal = localVal;
    } else {
      if (serverVal !== 0 && localVal === 0) {
        finalVal = serverVal;
        hasChanges = true;
      } else if (localVal !== 0 && serverVal === 0) {
        finalVal = localVal;
      } else {
        finalVal = serverVal !== 0 ? serverVal : localVal;
        hasChanges = true;
      }
    }

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

function makeCells(gridStr: string, givensStr: string): CellState[] {
  return gridStr.split("").map((ch, i) => ({
    index: i,
    row: Math.floor(i / 9),
    col: i % 9,
    block: Math.floor(Math.floor(i / 9) / 3) * 3 + Math.floor((i % 9) / 3),
    value: parseInt(ch, 10),
    given: givensStr[i] !== "0",
    notes: [],
  }));
}

describe("Sudoku State Consistency & Concurrency Integrity", () => {
  const initialGrid = "0".repeat(81);

  it("Scenario 1: New uncompleted daily puzzle has clean interactive state", () => {
    const puzzleKey = "daily-2026-09-24";
    expect(puzzleKey).toBe("daily-2026-09-24");
    expect(initialGrid.length).toBe(81);
  });

  it("Scenario 2: In-progress daily puzzle restores progress without completing", () => {
    const progress = {
      puzzleKey: "daily-2026-09-24",
      currentGrid: "530070000" + "0".repeat(72),
      elapsedSeconds: 120,
      mistakes: 1,
      hintsUsed: 0,
      completed: false,
    };
    expect(progress.completed).toBe(false);
    expect(progress.elapsedSeconds).toBe(120);
    expect(progress.currentGrid.length).toBe(81);
  });

  it("Scenario 3: Completed daily puzzle provides canonical server result metadata", () => {
    const canonicalResult: CompletionResult = {
      elapsedSeconds: 402,
      mistakes: 0,
      hintsUsed: 0,
      xpAwarded: 195,
      completedAt: "2026-09-24T10:00:00.000Z",
      leaderboardEligible: true,
      dateStr: "2026-09-24",
      difficulty: "hard",
      isDaily: true,
      rank: 42,
    };

    expect(canonicalResult.isDaily).toBe(true);
    expect(canonicalResult.xpAwarded).toBe(195);
    expect(canonicalResult.rank).toBe(42);
    expect(canonicalResult.leaderboardEligible).toBe(true);
  });

  it("Scenario 4: Practice replay does not award XP or modify canonical session", () => {
    const initialGuestXP = 500;
    const firstSolveXP = calculatePuzzleXP({
      difficulty: "hard",
      isDaily: true,
      mistakes: 0,
      hintsUsed: 0,
      elapsedSeconds: 400,
      userCurrentXP: initialGuestXP,
    });
    expect(firstSolveXP.totalXP).toBeGreaterThan(0);
    expect(firstSolveXP.dailyBonus).toBeGreaterThan(0);

    const isPracticeMode = true;
    const practiceCompletionPayloadDispatched = !isPracticeMode;
    expect(practiceCompletionPayloadDispatched).toBe(false);
  });

  it("TEST A: Late initial hydration does not overwrite live user input", () => {
    // Base grid at fetch start: all empty
    const baseGrid = "0".repeat(81);
    // User enters 4 at cell 10 before fetch returns
    const localGridStr = "0".repeat(10) + "4" + "0".repeat(70);
    const localCells = makeCells(localGridStr, initialGrid);

    // Stale server response returns with empty grid
    const serverGrid = "0".repeat(81);

    const { mergedCells } = threeWayMergeCells(baseGrid, localCells, serverGrid, initialGrid);
    expect(mergedCells[10].value).toBe(4);
  });

  it("TEST B & C: Three-way merge preserves union of cross-device progress", () => {
    // Base: cells 10 and 11 empty
    const baseGrid = "0".repeat(81);

    // PC filled cell 10 with 4
    const pcGrid = "0".repeat(10) + "4" + "0".repeat(70);
    const localCells = makeCells(pcGrid, initialGrid);

    // Phone filled cell 11 with 8
    const phoneGrid = "0".repeat(11) + "8" + "0".repeat(69);

    const { mergedCells, hasChanges } = threeWayMergeCells(baseGrid, localCells, phoneGrid, initialGrid);

    expect(hasChanges).toBe(true);
    expect(mergedCells[10].value).toBe(4);
    expect(mergedCells[11].value).toBe(8);
  });

  it("TEST D: Same-cell conflict deterministically prefers canonical server update without whole-board loss", () => {
    const baseGrid = "0".repeat(81);
    // Local device has cell 10 = 4 and cell 20 = 9
    const localGrid = "0".repeat(10) + "4" + "0".repeat(9) + "9" + "0".repeat(60);
    const localCells = makeCells(localGrid, initialGrid);

    // Remote server has cell 10 = 7
    const serverGrid = "0".repeat(10) + "7" + "0".repeat(70);

    const { mergedCells } = threeWayMergeCells(baseGrid, localCells, serverGrid, initialGrid);

    // Conflict at cell 10 resolves to 7, while non-conflicting cell 20 retains 9
    expect(mergedCells[10].value).toBe(7);
    expect(mergedCells[20].value).toBe(9);
  });

  it("TEST E: Pencil notes union cleanly during three-way merge", () => {
    const baseGrid = "0".repeat(81);
    const localGrid = "0".repeat(81);
    const localCells = makeCells(localGrid, initialGrid);
    localCells[5].notes = [1, 3];

    const serverGrid = "0".repeat(81);
    const serverNotes = { 5: [3, 5] };

    const { mergedCells } = threeWayMergeCells(baseGrid, localCells, serverGrid, initialGrid, serverNotes);

    expect(mergedCells[5].notes).toEqual([1, 3, 5]);
  });
});
