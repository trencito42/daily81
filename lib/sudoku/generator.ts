import { CELL_COUNT, DIFFICULTY_CONFIG, BLOCK_SIZE, BOARD_SIZE } from "./constants";
import { Difficulty, ServerSudokuPuzzle } from "./types";
import { PRNG } from "./prng";
import { countSolutions, solveSudoku } from "./solver";
import { getIndex } from "./validate";
import { createHmac } from "crypto";

/** Current generator algorithm version. Increment when algorithm changes. */
const GENERATOR_VERSION = 1;

/**
 * Generates a full solved 9x9 Sudoku board deterministically using a PRNG
 */
function generateFullBoard(prng: PRNG): string {
  const grid = new Array(CELL_COUNT).fill(0);

  // Fill the three diagonal 3x3 blocks (independent, cannot conflict with each other)
  for (let b = 0; b < BOARD_SIZE; b += BLOCK_SIZE) {
    const nums = prng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    let idx = 0;
    for (let r = 0; r < BLOCK_SIZE; r++) {
      for (let c = 0; c < BLOCK_SIZE; c++) {
        grid[getIndex(b + r, b + c)] = nums[idx++];
      }
    }
  }

  // Solve the remaining cells using the seedable PRNG
  const solution = solveSudoku(grid, true, prng);
  if (!solution) {
    // Fallback in rare edge case
    return solveSudoku(new Array(CELL_COUNT).fill(0), true, prng)!;
  }
  return solution;
}

/**
 * Generates a playable Sudoku puzzle with a guaranteed UNIQUE solution
 */
export function generateSudoku(difficulty: Difficulty, seedInput?: string, date?: string | null): ServerSudokuPuzzle {
  const seed = seedInput || `daily81-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
  const prng = new PRNG(seed);
  const config = DIFFICULTY_CONFIG[difficulty];

  // 1. Generate a full valid solved board
  const solution = generateFullBoard(prng);
  const grid = solution.split("").map(Number);

  // 2. Generate a randomized order of cell indices to remove
  const indices = prng.shuffle(Array.from({ length: CELL_COUNT }, (_, i) => i));

  let currentGivens = CELL_COUNT;
  const targetGivens = config.targetGivens;

  // 3. Remove cells one by one, ensuring uniqueness is preserved
  for (const idx of indices) {
    if (currentGivens <= targetGivens) {
      break;
    }

    const temp = grid[idx];
    grid[idx] = 0;

    // Check if puzzle still has exactly one solution
    const solutions = countSolutions(grid, 2);
    if (solutions !== 1) {
      // Not unique, restore the value
      grid[idx] = temp;
    } else {
      currentGivens--;
    }
  }

  const initialGrid = grid.join("");
  const puzzleKey = date ? `daily-${date}` : `puzzle-${PRNG.hashString(seed).toString(16)}`;

  return {
    puzzleKey,
    date: date || null,
    difficulty,
    initialGrid,
    solutionGrid: solution,
    seed,
    givensCount: currentGivens,
  };
}

/**
 * Derives a non-reversible HMAC-SHA256 seed for the Daily puzzle.
 * The raw DAILY_SEED_PEPPER NEVER enters the puzzle record, logs, or client.
 * Only the hex digest is used as the PRNG seed.
 */
function deriveDailySeed(dateStr: string, pepper: string): string {
  const message = `daily81:${dateStr}:v${GENERATOR_VERSION}`;
  return createHmac("sha256", pepper).update(message).digest("hex");
}

/**
 * Generates the official Daily Sudoku for a specific YYYY-MM-DD date.
 * Deterministic for all players via server-side DAILY_SEED_PEPPER.
 * Pepper is never stored or exposed — only the HMAC digest is used as seed.
 */
export function generateDailySudoku(dateStr: string, difficulty: Difficulty = "hard"): ServerSudokuPuzzle {
  const pepper = process.env.DAILY_SEED_PEPPER;
  if (!pepper && process.env.NODE_ENV === "production") {
    throw new Error("DAILY_SEED_PEPPER environment variable is required in production");
  }
  // Use HMAC digest as seed so pepper is never embedded in stored data
  const seed = pepper
    ? deriveDailySeed(dateStr, pepper)
    : `daily81-fallback-dev-${dateStr}`;
  return generateSudoku(difficulty, seed, dateStr);
}
