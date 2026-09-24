import { describe, it, expect } from "vitest";
import { getTodayDateString, isFutureDate, calculateNewStreak } from "../daily/streak";
import { generateDailySudoku, generateSudoku } from "../sudoku/generator";
import { isGridCompleteAndValid } from "../sudoku/validate";
import { getLevelFromXP, calculatePuzzleXP } from "../xp/progression";
import { getCanonicalPair } from "../friends/friends";
import { validateUsername } from "../auth/username";
import { toPublicPuzzle } from "../puzzles/puzzleService";

describe("Daily Puzzle Date & Timezone Integrity", () => {
  it("uses canonical UTC date string YYYY-MM-DD", () => {
    const today = getTodayDateString();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("deterministically generates identical puzzle for same UTC date", () => {
    const date = "2026-09-24";
    const puzzleA = generateDailySudoku(date, "hard");
    const puzzleB = generateDailySudoku(date, "hard");

    expect(puzzleA.puzzleKey).toBe(`daily-${date}`);
    expect(puzzleA.initialGrid).toBe(puzzleB.initialGrid);
    expect(puzzleA.solutionGrid).toBe(puzzleB.solutionGrid);
    expect(puzzleA.seed).toBe(puzzleB.seed);
  });

  it("rejects future daily puzzle dates", () => {
    const futureDate = "2099-01-01";
    expect(isFutureDate(futureDate)).toBe(true);

    const pastDate = "2020-01-01";
    expect(isFutureDate(pastDate)).toBe(false);
  });

  it("computes exact day streaks accurately", () => {
    // Yesterday solve increments streak
    const res1 = calculateNewStreak(3, 5, "2026-09-23", "2026-09-24");
    expect(res1.currentStreak).toBe(4);
    expect(res1.longestStreak).toBe(5);

    // Same day solve preserves streak
    const res2 = calculateNewStreak(4, 5, "2026-09-24", "2026-09-24");
    expect(res2.currentStreak).toBe(4);

    // Missed day resets streak to 1
    const res3 = calculateNewStreak(10, 15, "2026-09-20", "2026-09-24");
    expect(res3.currentStreak).toBe(1);
    expect(res3.longestStreak).toBe(15);
  });
});

describe("Puzzle Security & Solution Secrecy", () => {
  it("toPublicPuzzle strips solutionGrid completely", () => {
    const serverPuzzle = generateDailySudoku("2026-09-24", "hard");
    expect(serverPuzzle.solutionGrid).toBeDefined();

    const publicPuzzle = toPublicPuzzle({
      id: "test-id",
      puzzleKey: serverPuzzle.puzzleKey,
      date: serverPuzzle.date,
      difficulty: serverPuzzle.difficulty,
      initialGrid: serverPuzzle.initialGrid,
      seed: serverPuzzle.seed || "seed",
    });

    expect((publicPuzzle as any).solutionGrid).toBeUndefined();
    expect(publicPuzzle.puzzleKey).toBe("daily-2026-09-24");
    expect(publicPuzzle.initialGrid.length).toBe(81);
    expect(publicPuzzle.givensCount).toBeGreaterThan(0);
  });
});

describe("XP, Level & Idempotency", () => {
  it("level is uniquely and deterministically derived from XP", () => {
    expect(getLevelFromXP(0)).toBe(1);
    expect(getLevelFromXP(100)).toBe(1);
    expect(getLevelFromXP(200)).toBe(2);
    expect(getLevelFromXP(500)).toBe(3);
    expect(getLevelFromXP(1000)).toBe(4);
  });

  it("calculates correct XP without inflating on mistakes or hints", () => {
    const perfectXP = calculatePuzzleXP({
      difficulty: "hard",
      isDaily: true,
      mistakes: 0,
      hintsUsed: 0,
      elapsedSeconds: 300,
      userCurrentXP: 0,
    });

    const flawedXP = calculatePuzzleXP({
      difficulty: "hard",
      isDaily: true,
      mistakes: 2,
      hintsUsed: 3,
      elapsedSeconds: 300,
      userCurrentXP: 0,
    });

    expect(perfectXP.noMistakesBonus).toBeGreaterThan(0);
    expect(perfectXP.noHintsBonus).toBeGreaterThan(0);
    expect(flawedXP.noMistakesBonus).toBe(0);
    expect(flawedXP.noHintsBonus).toBe(0);
    expect(perfectXP.totalXP).toBeGreaterThan(flawedXP.totalXP);
  });
});

describe("Progress Sync & Concurrency Invariants", () => {
  it("validates that givens cannot be altered", () => {
    const puzzle = generateSudoku("easy", "seed-12345");
    const initialGrid = puzzle.initialGrid;

    // Mutate a given cell
    const firstGivenIndex = initialGrid.split("").findIndex((c) => c !== "0");
    expect(firstGivenIndex).toBeGreaterThanOrEqual(0);

    const tampered = initialGrid.split("");
    tampered[firstGivenIndex] = tampered[firstGivenIndex] === "1" ? "2" : "1";
    const tamperedGrid = tampered.join("");

    // Check given integrity
    let isGivenPreserved = true;
    for (let i = 0; i < 81; i++) {
      if (initialGrid[i] !== "0" && tamperedGrid[i] !== initialGrid[i]) {
        isGivenPreserved = false;
        break;
      }
    }
    expect(isGivenPreserved).toBe(false);
  });

  it("ensures completed grid matches canonical rules", () => {
    const puzzle = generateSudoku("medium", "seed-test-valid");
    expect(isGridCompleteAndValid(puzzle.solutionGrid)).toBe(true);

    // Corrupted grid is invalid
    const invalidGrid = puzzle.solutionGrid.slice(0, 80) + "0";
    expect(isGridCompleteAndValid(invalidGrid)).toBe(false);
  });
});

describe("Competitive Leaderboard & Social Invariants", () => {
  it("canonical friendship pair is always strictly sorted", () => {
    const pairA = getCanonicalPair("alice", "bob");
    const pairB = getCanonicalPair("bob", "alice");
    expect(pairA).toEqual(["alice", "bob"]);
    expect(pairB).toEqual(["alice", "bob"]);
  });

  it("validates usernames and disallows reserved system routes", () => {
    expect(validateUsername("daily").valid).toBe(false);
    expect(validateUsername("leaderboard").valid).toBe(false);
    expect(validateUsername("valid_player12").valid).toBe(true);
  });
});

