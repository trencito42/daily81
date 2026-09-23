import { Difficulty } from "./types";

export const BOARD_SIZE = 9;
export const CELL_COUNT = 81;
export const BLOCK_SIZE = 3;

export const DIFFICULTY_CONFIG: Record<
  Difficulty,
  {
    name: string;
    description: string;
    minGivens: number;
    maxGivens: number;
    targetGivens: number;
    baseXP: number;
  }
> = {
  easy: {
    name: "Easy",
    description: "Gentle logic for quick flow",
    minGivens: 36,
    maxGivens: 40,
    targetGivens: 38,
    baseXP: 50,
  },
  medium: {
    name: "Medium",
    description: "Balanced deduction & scanning",
    minGivens: 30,
    maxGivens: 34,
    targetGivens: 32,
    baseXP: 80,
  },
  hard: {
    name: "Hard",
    description: "Deep chains & candidate elimination",
    minGivens: 26,
    maxGivens: 29,
    targetGivens: 28,
    baseXP: 120,
  },
  expert: {
    name: "Expert",
    description: "Minimal clues, rigorous math deduction",
    minGivens: 22,
    maxGivens: 25,
    targetGivens: 24,
    baseXP: 180,
  },
};

export const DEFAULT_SETTINGS = {
  sound: false,
  haptics: true,
  autoRemoveNotes: true,
  highlightMatching: true,
  highlightRelated: true,
  showTimer: true,
  showMistakes: true,
};
