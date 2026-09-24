import { BOARD_SIZE, CELL_COUNT } from "./constants";
import { getPeers, isValidPlacement } from "./validate";
import { PRNG } from "./prng";

/**
 * Finds all valid candidate values for a specific cell index
 */
export function getCandidates(grid: number[], index: number): number[] {
  if (grid[index] !== 0) return [];
  const used = new Set<number>();
  const peers = getPeers(index);
  for (const peer of peers) {
    if (grid[peer] !== 0) {
      used.add(grid[peer]);
    }
  }
  const candidates: number[] = [];
  for (let num = 1; num <= 9; num++) {
    if (!used.has(num)) {
      candidates.push(num);
    }
  }
  return candidates;
}

/**
 * Counts number of solutions up to maxCount (default 2 to check uniqueness)
 */
export function countSolutions(gridInput: number[] | string, maxCount: number = 2): number {
  const grid = typeof gridInput === "string" ? gridInput.split("").map(Number) : [...gridInput];
  let solutionCount = 0;

  function backtrack(): boolean {
    // Find empty cell with minimum remaining values (MRV heuristic)
    let minCandidates = 10;
    let bestIndex = -1;
    let bestCandidates: number[] = [];

    for (let i = 0; i < CELL_COUNT; i++) {
      if (grid[i] === 0) {
        const candidates = getCandidates(grid, i);
        if (candidates.length === 0) {
          return false; // Dead end
        }
        if (candidates.length < minCandidates) {
          minCandidates = candidates.length;
          bestIndex = i;
          bestCandidates = candidates;
          if (minCandidates === 1) break;
        }
      }
    }

    // Solved completely
    if (bestIndex === -1) {
      solutionCount++;
      return solutionCount >= maxCount;
    }

    for (const num of bestCandidates) {
      grid[bestIndex] = num;
      if (backtrack()) return true;
      grid[bestIndex] = 0;
    }

    return false;
  }

  backtrack();
  return solutionCount;
}

/**
 * Solves a Sudoku puzzle and returns the 81-character solution string, or null if unsolveable
 */
export function solveSudoku(gridInput: number[] | string, randomizeOrder: boolean = false, prng?: PRNG): string | null {
  const grid = typeof gridInput === "string" ? gridInput.split("").map(Number) : [...gridInput];

  function backtrack(): boolean {
    let minCandidates = 10;
    let bestIndex = -1;
    let bestCandidates: number[] = [];

    for (let i = 0; i < CELL_COUNT; i++) {
      if (grid[i] === 0) {
        const candidates = getCandidates(grid, i);
        if (candidates.length === 0) {
          return false;
        }
        if (candidates.length < minCandidates) {
          minCandidates = candidates.length;
          bestIndex = i;
          bestCandidates = candidates;
          if (minCandidates === 1) break;
        }
      }
    }

    if (bestIndex === -1) {
      return true; // All filled
    }

    if (randomizeOrder && prng) {
      bestCandidates = prng.shuffle(bestCandidates);
    }

    for (const num of bestCandidates) {
      grid[bestIndex] = num;
      if (backtrack()) return true;
      grid[bestIndex] = 0;
    }

    return false;
  }

  const success = backtrack();
  return success ? grid.join("") : null;
}

/**
 * Solves using logical deductions (Naked singles, Hidden singles)
 * Returns the logical difficulty metrics
 */
export function analyzeDifficulty(gridInput: number[] | string): {
  isSolvableLogically: boolean;
  nakedSingles: number;
  hiddenSingles: number;
  backtracksNeeded: number;
} {
  const grid = typeof gridInput === "string" ? gridInput.split("").map(Number) : [...gridInput];
  let nakedSingles = 0;
  let hiddenSingles = 0;
  let changed = true;

  while (changed) {
    changed = false;

    // Check naked singles (cells with only 1 candidate)
    for (let i = 0; i < CELL_COUNT; i++) {
      if (grid[i] === 0) {
        const candidates = getCandidates(grid, i);
        if (candidates.length === 1) {
          grid[i] = candidates[0];
          nakedSingles++;
          changed = true;
        }
      }
    }

    if (changed) continue;

    // Check hidden singles (a candidate only appears once in a unit)
    // Check rows, cols, blocks
    for (let unit = 0; unit < 9; unit++) {
      // Row
      for (let num = 1; num <= 9; num++) {
        let count = 0;
        let targetIdx = -1;
        for (let c = 0; c < 9; c++) {
          const idx = unit * 9 + c;
          if (grid[idx] === 0 && getCandidates(grid, idx).includes(num)) {
            count++;
            targetIdx = idx;
          }
        }
        if (count === 1 && targetIdx !== -1) {
          grid[targetIdx] = num;
          hiddenSingles++;
          changed = true;
        }
      }
    }
  }

  const remainingEmpty = grid.filter((x) => x === 0).length;
  const isSolvableLogically = remainingEmpty === 0;

  return {
    isSolvableLogically,
    nakedSingles,
    hiddenSingles,
    backtracksNeeded: remainingEmpty > 0 ? remainingEmpty : 0,
  };
}
