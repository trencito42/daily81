export type Difficulty = "easy" | "medium" | "hard" | "expert";

export interface PublicSudokuPuzzle {
  id?: string;
  puzzleKey: string;
  date?: string | null;
  difficulty: Difficulty;
  initialGrid: string; // 81 characters '0'-'9', '0' for empty
  seed?: string;
  givensCount: number;
}

export interface ServerSudokuPuzzle extends PublicSudokuPuzzle {
  seed: string;
  solutionGrid: string; // 81 characters '1'-'9' (SERVER ONLY)
}

// Client-safe default alias
export type SudokuPuzzle = PublicSudokuPuzzle;

export interface CellPosition {
  row: number; // 0-8
  col: number; // 0-8
  index: number; // 0-80
}

export interface CellState {
  index: number;
  row: number;
  col: number;
  block: number;
  value: number; // 0 = empty, 1-9
  given: boolean;
  notes: number[]; // e.g. [1, 3, 5]
  isMistake?: boolean;
}

export interface SudokuMove {
  index: number;
  prevValue: number;
  newValue: number;
  prevNotes: number[];
  newNotes: number[];
  removedPeerNotes?: { index: number; notes: number[] }[];
  timestamp: number;
}

export interface SudokuGameState {
  puzzle: PublicSudokuPuzzle;
  cells: CellState[];
  selectedIndex: number | null;
  pencilMode: boolean;
  mistakes: number;
  hintsUsed: number;
  elapsedSeconds: number;
  isStarted: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  history: SudokuMove[];
  historyIndex: number;
  startTime?: number;
  completedAt?: string;
  xpAwarded?: number;
}

export interface XPBreakdown {
  baseXP: number;
  noMistakesBonus: number;
  noHintsBonus: number;
  dailyBonus: number;
  speedBonus: number;
  totalXP: number;
  prevLevel: number;
  newLevel: number;
  prevXP: number;
  newXP: number;
  levelUp: boolean;
}

export interface CompletionResult {
  elapsedSeconds: number;
  mistakes: number;
  hintsUsed: number;
  xpAwarded: number;
  completedAt?: string | Date | null;
  leaderboardEligible?: boolean;
  dateStr?: string | null;
  difficulty: Difficulty;
  isDaily: boolean;
  rank?: number | null;
  xpBreakdown?: XPBreakdown | null;
}

export interface UserStats {
  totalSolved: number;
  totalTimeSeconds: number;
  averageTimeSeconds: number;
  bestTimeSeconds: number;
  accuracyRate: number;
  currentStreak: number;
  longestStreak: number;
  difficultyCounts: Record<Difficulty, number>;
  totalMistakes: number;
  totalHints: number;
  dailyPuzzlesCompleted: number;
}

export interface GameSettings {
  sound: boolean;
  haptics: boolean;
  autoRemoveNotes: boolean;
  highlightMatching: boolean;
  highlightRelated: boolean;
  showTimer: boolean;
  showMistakes: boolean;
}
