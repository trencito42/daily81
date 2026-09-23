import { describe, it, expect } from "vitest";
import { validateUsername, normalizeUsername } from "../../auth/username";
import { getCanonicalPair } from "../friends";
import { generateSudoku, generateDailySudoku } from "../../sudoku/generator";

describe("Username System", () => {
  it("validates proper usernames", () => {
    expect(validateUsername("steve81").isValid).toBe(true);
    expect(validateUsername("alex_sudoku").isValid).toBe(true);
    expect(validateUsername("player1").isValid).toBe(true);
  });

  it("rejects invalid usernames", () => {
    // Too short (< 3)
    expect(validateUsername("ab").isValid).toBe(false);
    // Too long (> 20)
    expect(validateUsername("supercalifragilisticexpialidocious").isValid).toBe(false);
    // Spaces
    expect(validateUsername("steve 81").isValid).toBe(false);
    // Special symbols
    expect(validateUsername("steve@81").isValid).toBe(false);
    expect(validateUsername("steve!").isValid).toBe(false);
    // Reserved words
    expect(validateUsername("admin").isValid).toBe(false);
    expect(validateUsername("daily").isValid).toBe(false);
    expect(validateUsername("leaderboard").isValid).toBe(false);
  });

  it("normalizes username case-insensitively", () => {
    expect(normalizeUsername("Steve81")).toBe("steve81");
    expect(normalizeUsername("  Alex_99  ")).toBe("alex_99");
  });
});

describe("Friendship & Mutual Relations", () => {
  it("enforces canonical ordering for friendship pair", () => {
    const pair1 = getCanonicalPair("user_aaa", "user_zzz");
    const pair2 = getCanonicalPair("user_zzz", "user_aaa");

    expect(pair1).toEqual(["user_aaa", "user_zzz"]);
    expect(pair2).toEqual(["user_aaa", "user_zzz"]);
    expect(pair1).toEqual(pair2);
  });
});

describe("Deterministic Challenge Puzzles", () => {
  it("generates identical puzzle sequences for two players given the same seed", () => {
    const challengeSeed = "challenge-1727136000-847291";

    const round1Player1 = generateSudoku("hard", `${challengeSeed}-round-1`);
    const round1Player2 = generateSudoku("hard", `${challengeSeed}-round-1`);

    expect(round1Player1.initialGrid).toBe(round1Player2.initialGrid);
    expect(round1Player1.solutionGrid).toBe(round1Player2.solutionGrid);

    const round2Player1 = generateSudoku("hard", `${challengeSeed}-round-2`);
    const round2Player2 = generateSudoku("hard", `${challengeSeed}-round-2`);

    expect(round2Player1.initialGrid).toBe(round2Player2.initialGrid);
    expect(round2Player1.initialGrid).not.toBe(round1Player1.initialGrid);
  });

  it("rematch creates a fresh new puzzle seed", () => {
    const seed1 = `challenge-${Date.now()}-1`;
    const seed2 = `challenge-${Date.now() + 10}-2`;

    const p1 = generateSudoku("medium", `${seed1}-round-1`);
    const p2 = generateSudoku("medium", `${seed2}-round-1`);

    expect(p1.initialGrid).not.toBe(p2.initialGrid);
  });

  it("Daily Duel matches today's daily puzzle", () => {
    const today = "2026-09-24";
    const dailyP = generateDailySudoku(today, "hard");
    expect(dailyP.puzzleKey).toBe(`daily-${today}`);
    expect(dailyP.initialGrid.length).toBe(81);
    expect(dailyP.solutionGrid.length).toBe(81);
  });
});
