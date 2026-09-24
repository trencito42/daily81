import { prisma } from "@/lib/db/prisma";
import { generateDailySudoku, generateSudoku } from "@/lib/sudoku/generator";
import { getTodayDateString, isFutureDate } from "@/lib/daily/streak";
import { Difficulty, SudokuPuzzle } from "@/lib/sudoku/types";
import type { Puzzle } from "@prisma/client";

export interface PublicPuzzle {
  id: string;
  puzzleKey: string;
  date: string | null;
  difficulty: Difficulty;
  initialGrid: string;
  seed: string;
  givensCount: number;
}

export function toPublicPuzzle(puzzle: {
  id: string;
  puzzleKey: string;
  date?: string | null;
  difficulty: string;
  initialGrid: string;
  seed: string;
}): PublicPuzzle {
  return {
    id: puzzle.id,
    puzzleKey: puzzle.puzzleKey,
    date: puzzle.date || null,
    difficulty: (puzzle.difficulty || "medium") as Difficulty,
    initialGrid: puzzle.initialGrid,
    seed: puzzle.seed,
    givensCount: puzzle.initialGrid.split("").filter((c) => c !== "0").length,
  };
}

/**
 * Resolves or deterministically generates the canonical Daily puzzle for a specific UTC date.
 * Strictly forbids future daily puzzle generation/access.
 */
export async function getOrCreateDailyPuzzle(dateStr?: string | null): Promise<{
  puzzle: Puzzle;
  publicPuzzle: PublicPuzzle;
}> {
  const date = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : getTodayDateString();

  if (isFutureDate(date)) {
    throw new Error("Cannot access future daily puzzle.");
  }

  const puzzleKey = `daily-${date}`;

  // 1. Try DB first
  const existing = await prisma.puzzle.findUnique({
    where: { puzzleKey },
  });

  if (existing) {
    return {
      puzzle: existing,
      publicPuzzle: toPublicPuzzle(existing),
    };
  }

  // 2. Generate deterministic puzzle
  const generated = generateDailySudoku(date, "hard");

  // 3. Upsert to DB
  const saved = await prisma.puzzle.upsert({
    where: { puzzleKey },
    update: {},
    create: {
      puzzleKey: generated.puzzleKey,
      date,
      difficulty: generated.difficulty,
      initialGrid: generated.initialGrid,
      solutionGrid: generated.solutionGrid,
      seed: generated.seed,
    },
  });

  return {
    puzzle: saved,
    publicPuzzle: toPublicPuzzle(saved),
  };
}

/**
 * Resolves or generates a canonical Sudoku puzzle for Play mode on a given difficulty.
 */
export async function getOrCreatePlayPuzzle(difficulty: Difficulty, seed?: string): Promise<{
  puzzle: {
    id: string;
    puzzleKey: string;
    date: string | null;
    difficulty: string;
    initialGrid: string;
    solutionGrid: string;
    seed: string;
  };
  publicPuzzle: PublicPuzzle;
}> {
  const validDifficulties: Difficulty[] = ["easy", "medium", "hard", "expert"];
  const diff = validDifficulties.includes(difficulty) ? difficulty : "medium";

  const generated = generateSudoku(diff, seed);

  // Upsert to DB so all sessions, validation, and completions use canonical row
  const saved = await prisma.puzzle.upsert({
    where: { puzzleKey: generated.puzzleKey },
    update: {},
    create: {
      puzzleKey: generated.puzzleKey,
      date: null,
      difficulty: generated.difficulty,
      initialGrid: generated.initialGrid,
      solutionGrid: generated.solutionGrid,
      seed: generated.seed,
    },
  });

  return {
    puzzle: saved,
    publicPuzzle: toPublicPuzzle(saved),
  };
}

/**
 * Fetches canonical DB puzzle by puzzleKey (never exposes solutionGrid to client).
 */
export async function getPuzzleByKey(puzzleKey: string) {
  return await prisma.puzzle.findUnique({
    where: { puzzleKey },
  });
}
