import { BOARD_SIZE, CELL_COUNT, BLOCK_SIZE } from "./constants";

export function getRow(index: number): number {
  return Math.floor(index / BOARD_SIZE);
}

export function getCol(index: number): number {
  return index % BOARD_SIZE;
}

export function getBlock(index: number): number {
  const r = Math.floor(index / BOARD_SIZE);
  const c = index % BOARD_SIZE;
  return Math.floor(r / BLOCK_SIZE) * BLOCK_SIZE + Math.floor(c / BLOCK_SIZE);
}

export function getIndex(row: number, col: number): number {
  return row * BOARD_SIZE + col;
}

/**
 * Returns all indices sharing the same row, col, or 3x3 block (peers)
 */
export function getPeers(index: number): number[] {
  const row = getRow(index);
  const col = getCol(index);
  const blockRow = Math.floor(row / BLOCK_SIZE) * BLOCK_SIZE;
  const blockCol = Math.floor(col / BLOCK_SIZE) * BLOCK_SIZE;
  const peers = new Set<number>();

  for (let c = 0; c < BOARD_SIZE; c++) {
    const idx = getIndex(row, c);
    if (idx !== index) peers.add(idx);
  }

  for (let r = 0; r < BOARD_SIZE; r++) {
    const idx = getIndex(r, col);
    if (idx !== index) peers.add(idx);
  }

  for (let r = 0; r < BLOCK_SIZE; r++) {
    for (let c = 0; c < BLOCK_SIZE; c++) {
      const idx = getIndex(blockRow + r, blockCol + c);
      if (idx !== index) peers.add(idx);
    }
  }

  return Array.from(peers);
}

/**
 * Checks if placing a value at a given index violates Sudoku constraints
 */
export function isValidPlacement(grid: number[] | string, index: number, value: number): boolean {
  if (value < 1 || value > 9) return false;
  const numbers = typeof grid === "string" ? grid.split("").map(Number) : grid;
  const peers = getPeers(index);
  for (const peer of peers) {
    if (numbers[peer] === value) return false;
  }
  return true;
}

/**
 * Validates whether an entire 81-character grid is fully solved and valid
 */
export function isGridCompleteAndValid(grid: string | number[]): boolean {
  const numbers = typeof grid === "string" ? grid.split("").map(Number) : grid;
  if (numbers.length !== CELL_COUNT) return false;

  // Check all cells filled with 1-9
  for (let i = 0; i < CELL_COUNT; i++) {
    const val = numbers[i];
    if (val < 1 || val > 9) return false;
  }

  // Check rows
  for (let r = 0; r < BOARD_SIZE; r++) {
    const seen = new Set<number>();
    for (let c = 0; c < BOARD_SIZE; c++) {
      const val = numbers[getIndex(r, c)];
      if (seen.has(val)) return false;
      seen.add(val);
    }
  }

  // Check columns
  for (let c = 0; c < BOARD_SIZE; c++) {
    const seen = new Set<number>();
    for (let r = 0; r < BOARD_SIZE; r++) {
      const val = numbers[getIndex(r, c)];
      if (seen.has(val)) return false;
      seen.add(val);
    }
  }

  // Check 3x3 blocks
  for (let br = 0; br < BOARD_SIZE; br += BLOCK_SIZE) {
    for (let bc = 0; bc < BOARD_SIZE; bc += BLOCK_SIZE) {
      const seen = new Set<number>();
      for (let r = 0; r < BLOCK_SIZE; r++) {
        for (let c = 0; c < BLOCK_SIZE; c++) {
          const val = numbers[getIndex(br + r, bc + c)];
          if (seen.has(val)) return false;
          seen.add(val);
        }
      }
    }
  }

  return true;
}

/**
 * Finds all conflicting cells in a given grid state
 */
export function findConflicts(grid: number[]): Set<number> {
  const conflicts = new Set<number>();

  for (let i = 0; i < CELL_COUNT; i++) {
    const val = grid[i];
    if (val === 0) continue;

    const peers = getPeers(i);
    for (const peer of peers) {
      if (grid[peer] === val) {
        conflicts.add(i);
        conflicts.add(peer);
      }
    }
  }

  return conflicts;
}

/**
 * Parses an 81-char grid string into CellState array
 */
export function parseGridString(gridStr: string): import("./types").CellState[] {
  const cells: import("./types").CellState[] = [];
  const chars = gridStr.split("");

  for (let i = 0; i < CELL_COUNT; i++) {
    const val = parseInt(chars[i] || "0", 10);
    cells.push({
      index: i,
      row: getRow(i),
      col: getCol(i),
      block: getBlock(i),
      value: isNaN(val) ? 0 : val,
      given: val !== 0,
      notes: [],
      isMistake: false,
    });
  }

  return cells;
}

/**
 * Converts CellState array to 81-char string
 */
export function stringifyGrid(cells: import("./types").CellState[]): string {
  return cells.map((c) => c.value.toString()).join("");
}
