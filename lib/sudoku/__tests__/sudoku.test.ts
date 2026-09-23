import { describe, it, expect } from "vitest";
import { PRNG } from "../prng";
import { countSolutions, solveSudoku, getCandidates } from "../solver";
import { generateSudoku, generateDailySudoku } from "../generator";
import { isGridCompleteAndValid, isValidPlacement, getPeers, getIndex, getRow, getCol, getBlock } from "../validate";
import { getLevelFromXP, getXPForLevel, calculatePuzzleXP, getLevelProgress } from "../../xp/progression";

describe("Sudoku Core Engine", () => {
  it("computes row, col, and block coordinates accurately", () => {
    expect(getRow(0)).toBe(0);
    expect(getCol(0)).toBe(0);
    expect(getBlock(0)).toBe(0);

    expect(getRow(80)).toBe(8);
    expect(getCol(80)).toBe(8);
    expect(getBlock(80)).toBe(8);

    expect(getIndex(4, 5)).toBe(41);
    expect(getBlock(getIndex(4, 5))).toBe(4);
  });

  it("calculates 20 peers for any given cell", () => {
    const peers = getPeers(0);
    // 8 row peers + 8 col peers + 4 remaining block peers = 20 unique peers
    expect(peers.length).toBe(20);
    expect(new Set(peers).size).toBe(20);
    expect(peers.includes(0)).toBe(false);
  });

  it("PRNG is 100% deterministic given the same seed", () => {
    const prng1 = new PRNG("daily81-2026-09-24");
    const prng2 = new PRNG("daily81-2026-09-24");

    const seq1 = [prng1.next(), prng1.nextInt(1, 100), prng1.shuffle([1, 2, 3, 4, 5])];
    const seq2 = [prng2.next(), prng2.nextInt(1, 100), prng2.shuffle([1, 2, 3, 4, 5])];

    expect(seq1).toEqual(seq2);
  });

  it("solves a known valid Sudoku board", () => {
    const puzzle =
      "530070000600195000098000060800060003400803001700020006060000280000419005000080079";
    const expected =
      "534678912672195348198342567859761423426853791713924856961537284287419635345286179";

    const solution = solveSudoku(puzzle);
    expect(solution).toBe(expected);
    expect(isGridCompleteAndValid(solution!)).toBe(true);
    expect(countSolutions(puzzle, 2)).toBe(1);
  });

  it("generates deterministic Daily Sudoku with a single unique solution", () => {
    const daily1 = generateDailySudoku("2026-09-24", "hard");
    const daily2 = generateDailySudoku("2026-09-24", "hard");

    expect(daily1.initialGrid).toBe(daily2.initialGrid);
    expect(daily1.solutionGrid).toBe(daily2.solutionGrid);
    expect(daily1.puzzleKey).toBe("daily-2026-09-24");

    // Must be a valid 81-character puzzle
    expect(daily1.initialGrid.length).toBe(81);
    expect(daily1.solutionGrid.length).toBe(81);

    // Initial grid must be solvable to solutionGrid
    const solution = solveSudoku(daily1.initialGrid);
    expect(solution).toBe(daily1.solutionGrid);

    // Uniqueness test: must have exactly 1 solution
    expect(countSolutions(daily1.initialGrid, 2)).toBe(1);
    expect(isGridCompleteAndValid(daily1.solutionGrid)).toBe(true);
  });

  it("generates puzzles for all difficulty levels with unique solutions", () => {
    const difficulties = ["easy", "medium", "hard", "expert"] as const;

    for (const diff of difficulties) {
      const puzzle = generateSudoku(diff, `test-seed-${diff}`);
      expect(puzzle.difficulty).toBe(diff);
      expect(puzzle.initialGrid.length).toBe(81);
      expect(countSolutions(puzzle.initialGrid, 2)).toBe(1);
      expect(isGridCompleteAndValid(puzzle.solutionGrid)).toBe(true);
    }
  });

  it("validates grid constraints properly", () => {
    const solved =
      "534678912672195348198342567859761423426853791713924856961537284287419635345286179";
    expect(isGridCompleteAndValid(solved)).toBe(true);

    // Modify one cell to create duplicate in row
    const invalid = "554678912672195348198342567859761423426853791713924856961537284287419635345286179";
    expect(isGridCompleteAndValid(invalid)).toBe(false);
  });
});

describe("XP & Progression System", () => {
  it("calculates levels correctly", () => {
    expect(getLevelFromXP(0)).toBe(1);
    expect(getLevelFromXP(100)).toBe(1);
    expect(getLevelFromXP(200)).toBe(2);
    expect(getLevelFromXP(1000)).toBeGreaterThan(3);
  });

  it("calculates XP reward breakdown accurately", () => {
    const xpBreakdown = calculatePuzzleXP({
      difficulty: "hard",
      isDaily: true,
      mistakes: 0,
      hintsUsed: 0,
      elapsedSeconds: 400,
      userCurrentXP: 200,
    });

    expect(xpBreakdown.baseXP).toBe(120);
    expect(xpBreakdown.noMistakesBonus).toBe(30);
    expect(xpBreakdown.noHintsBonus).toBe(20);
    expect(xpBreakdown.dailyBonus).toBe(25);
    expect(xpBreakdown.speedBonus).toBeGreaterThan(0);
    expect(xpBreakdown.totalXP).toBe(120 + 30 + 20 + 25 + xpBreakdown.speedBonus);
    expect(xpBreakdown.newXP).toBe(200 + xpBreakdown.totalXP);
  });

  it("calculates level progress percentage", () => {
    const progress = getLevelProgress(100);
    expect(progress.level).toBe(1);
    expect(progress.progressPercent).toBeGreaterThanOrEqual(0);
    expect(progress.progressPercent).toBeLessThanOrEqual(100);
  });
});
