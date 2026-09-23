import { Difficulty, XPBreakdown } from "../sudoku/types";
import { DIFFICULTY_CONFIG } from "../sudoku/constants";

/**
 * Returns total cumulative XP required to reach a specific level (1-indexed)
 * Level 1: 0 XP
 * Level 2: 150 XP
 * Level 3: 350 XP
 * Level 4: 600 XP
 * Level 5: 900 XP
 * ...
 */
export function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  let total = 0;
  for (let lvl = 1; lvl < level; lvl++) {
    // Incremental requirement increases with level
    total += Math.round(100 + 50 * lvl + 15 * Math.pow(lvl, 1.2));
  }
  return total;
}

/**
 * Calculates current level from total cumulative XP
 */
export function getLevelFromXP(xp: number): number {
  if (xp <= 0) return 1;
  let level = 1;
  while (getXPForLevel(level + 1) <= xp) {
    level++;
  }
  return level;
}

/**
 * Returns level progress information: currentLevel, currentLevelXP, nextLevelXP, progressPercent
 */
export function getLevelProgress(xp: number): {
  level: number;
  currentLevelXP: number;
  nextLevelXP: number;
  xpInCurrentLevel: number;
  xpNeededForNext: number;
  progressPercent: number;
} {
  const level = getLevelFromXP(xp);
  const currentLevelThreshold = getXPForLevel(level);
  const nextLevelThreshold = getXPForLevel(level + 1);
  const xpInCurrentLevel = xp - currentLevelThreshold;
  const xpNeededForNext = nextLevelThreshold - currentLevelThreshold;
  const progressPercent = Math.min(100, Math.max(0, Math.round((xpInCurrentLevel / xpNeededForNext) * 100)));

  return {
    level,
    currentLevelXP: currentLevelThreshold,
    nextLevelXP: nextLevelThreshold,
    xpInCurrentLevel,
    xpNeededForNext,
    progressPercent,
  };
}

/**
 * Calculates XP earned from completing a puzzle
 */
export function calculatePuzzleXP(params: {
  difficulty: Difficulty;
  isDaily: boolean;
  mistakes: number;
  hintsUsed: number;
  elapsedSeconds: number;
  userCurrentXP: number;
}): XPBreakdown {
  const { difficulty, isDaily, mistakes, hintsUsed, elapsedSeconds, userCurrentXP } = params;
  const baseXP = DIFFICULTY_CONFIG[difficulty].baseXP;

  const noMistakesBonus = mistakes === 0 ? 30 : 0;
  const noHintsBonus = hintsUsed === 0 ? 20 : 0;
  const dailyBonus = isDaily ? 25 : 0;

  // Par times for speed bonus (in seconds)
  const parTimes: Record<Difficulty, number> = {
    easy: 300, // 5 min
    medium: 480, // 8 min
    hard: 720, // 12 min
    expert: 1080, // 18 min
  };

  let speedBonus = 0;
  if (elapsedSeconds < parTimes[difficulty]) {
    speedBonus = Math.min(25, Math.round(((parTimes[difficulty] - elapsedSeconds) / parTimes[difficulty]) * 25));
  }

  const totalXP = baseXP + noMistakesBonus + noHintsBonus + dailyBonus + speedBonus;
  const prevLevel = getLevelFromXP(userCurrentXP);
  const newXP = userCurrentXP + totalXP;
  const newLevel = getLevelFromXP(newXP);

  return {
    baseXP,
    noMistakesBonus,
    noHintsBonus,
    dailyBonus,
    speedBonus,
    totalXP,
    prevLevel,
    newLevel,
    prevXP: userCurrentXP,
    newXP,
    levelUp: newLevel > prevLevel,
  };
}
