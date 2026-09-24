import { SudokuGameState, GameSettings, UserStats, Difficulty } from "../sudoku/types";
import { DEFAULT_SETTINGS } from "../sudoku/constants";
import { getLevelFromXP } from "../xp/progression";

const ACTIVE_GAME_KEY = "daily81_active_game";
const GUEST_STATS_KEY = "daily81_guest_stats";
const SETTINGS_KEY = "daily81_settings";
const COMPLETED_DAILY_DATES_KEY = "daily81_completed_dates";

export interface GuestProfile {
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastDailyDate: string | null;
  stats: UserStats;
  completedPuzzleKeys: string[];
}

const DEFAULT_GUEST_STATS: UserStats = {
  totalSolved: 0,
  totalTimeSeconds: 0,
  averageTimeSeconds: 0,
  bestTimeSeconds: 0,
  accuracyRate: 100,
  currentStreak: 0,
  longestStreak: 0,
  difficultyCounts: {
    easy: 0,
    medium: 0,
    hard: 0,
    expert: 0,
  },
  totalMistakes: 0,
  totalHints: 0,
  dailyPuzzlesCompleted: 0,
};

const DEFAULT_GUEST_PROFILE: GuestProfile = {
  xp: 0,
  level: 1,
  currentStreak: 0,
  longestStreak: 0,
  lastDailyDate: null,
  stats: DEFAULT_GUEST_STATS,
  completedPuzzleKeys: [],
};

export function loadSettings(): GameSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: GameSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}

export function getPuzzleStorageKey(puzzleKey?: string): string {
  return puzzleKey ? `daily81_game_${puzzleKey}` : ACTIVE_GAME_KEY;
}

export function saveActiveGame(game: SudokuGameState) {
  if (typeof window === "undefined" || !game.puzzle?.puzzleKey) return;
  try {
    const payload = JSON.stringify({
      puzzle: game.puzzle,
      cells: game.cells,
      selectedIndex: game.selectedIndex,
      pencilMode: game.pencilMode,
      mistakes: game.mistakes,
      hintsUsed: game.hintsUsed,
      elapsedSeconds: game.elapsedSeconds,
      isStarted: game.isStarted,
      isCompleted: game.isCompleted,
      savedAt: Date.now(),
    });

    // Save per-puzzle key
    localStorage.setItem(getPuzzleStorageKey(game.puzzle.puzzleKey), payload);
    // Also save default active pointer
    localStorage.setItem(ACTIVE_GAME_KEY, payload);
  } catch {
    // Storage quota
  }
}

export function loadActiveGame(puzzleKey?: string): Partial<SudokuGameState> | null {
  if (typeof window === "undefined") return null;
  try {
    if (puzzleKey) {
      const specific = localStorage.getItem(getPuzzleStorageKey(puzzleKey));
      if (specific) return JSON.parse(specific);
    }
    const raw = localStorage.getItem(ACTIVE_GAME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (puzzleKey && parsed.puzzle?.puzzleKey !== puzzleKey) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearActiveGame(puzzleKey?: string) {
  if (typeof window === "undefined") return;
  try {
    if (puzzleKey) {
      localStorage.removeItem(getPuzzleStorageKey(puzzleKey));
    }
    localStorage.removeItem(ACTIVE_GAME_KEY);
  } catch {
    // Ignore
  }
}


export function loadGuestProfile(): GuestProfile {
  if (typeof window === "undefined") return DEFAULT_GUEST_PROFILE;
  try {
    const raw = localStorage.getItem(GUEST_STATS_KEY);
    if (!raw) return DEFAULT_GUEST_PROFILE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_GUEST_PROFILE,
      ...parsed,
      stats: {
        ...DEFAULT_GUEST_STATS,
        ...(parsed.stats || {}),
      },
    };
  } catch {
    return DEFAULT_GUEST_PROFILE;
  }
}

export function saveGuestProfile(profile: GuestProfile) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GUEST_STATS_KEY, JSON.stringify(profile));
  } catch {
    // Storage quota
  }
}

export function recordGuestGameCompletion(params: {
  puzzleKey: string;
  difficulty: Difficulty;
  isDaily: boolean;
  dateStr?: string | null;
  elapsedSeconds: number;
  mistakes: number;
  hints: number;
  xpEarned: number;
}): GuestProfile {
  const profile = loadGuestProfile();
  const { puzzleKey, difficulty, isDaily, dateStr, elapsedSeconds, mistakes, hints, xpEarned } = params;

  // Prevent duplicate XP for same puzzle key
  const alreadyCompleted = profile.completedPuzzleKeys.includes(puzzleKey);
  const actualXPEarned = alreadyCompleted ? 0 : xpEarned;

  const newXP = profile.xp + actualXPEarned;
  const newLevel = getLevelFromXP(newXP);

  const stats = { ...profile.stats };
  stats.totalSolved += 1;
  stats.totalTimeSeconds += elapsedSeconds;
  stats.averageTimeSeconds = Math.round(stats.totalTimeSeconds / stats.totalSolved);
  stats.bestTimeSeconds = stats.bestTimeSeconds === 0 ? elapsedSeconds : Math.min(stats.bestTimeSeconds, elapsedSeconds);
  stats.difficultyCounts[difficulty] = (stats.difficultyCounts[difficulty] || 0) + 1;
  stats.totalMistakes += mistakes;
  stats.totalHints += hints;

  const totalActions = stats.totalSolved * 81;
  const totalErrors = stats.totalMistakes;
  stats.accuracyRate = totalActions > 0 ? Math.max(0, Math.round(((totalActions - totalErrors) / totalActions) * 1000) / 10) : 100;

  let currentStreak = profile.currentStreak;
  let longestStreak = profile.longestStreak;
  let lastDailyDate = profile.lastDailyDate;

  if (isDaily && dateStr) {
    stats.dailyPuzzlesCompleted += 1;
    if (lastDailyDate !== dateStr) {
      if (!lastDailyDate) {
        currentStreak = 1;
      } else {
        const lastDate = new Date(lastDailyDate);
        const thisDate = new Date(dateStr);
        const diffDays = Math.round((thisDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
        if (diffDays === 1) {
          currentStreak += 1;
        } else if (diffDays !== 0) {
          currentStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, currentStreak);
      lastDailyDate = dateStr;
    }
  }

  stats.currentStreak = currentStreak;
  stats.longestStreak = longestStreak;

  const updatedProfile: GuestProfile = {
    xp: newXP,
    level: newLevel,
    currentStreak,
    longestStreak,
    lastDailyDate,
    stats,
    completedPuzzleKeys: alreadyCompleted ? profile.completedPuzzleKeys : [...profile.completedPuzzleKeys, puzzleKey],
  };

  saveGuestProfile(updatedProfile);
  return updatedProfile;
}

export function getCompletedDailyDates(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(COMPLETED_DAILY_DATES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function markDailyDateCompleted(dateStr: string) {
  if (typeof window === "undefined") return;
  try {
    const dates = getCompletedDailyDates();
    if (!dates.includes(dateStr)) {
      dates.push(dateStr);
      localStorage.setItem(COMPLETED_DAILY_DATES_KEY, JSON.stringify(dates));
    }
  } catch {
    // Ignore
  }
}
