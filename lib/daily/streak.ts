/**
 * Canonical UTC calendar date string YYYY-MM-DD
 */
export function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Checks if a date string is in the future compared to UTC today
 */
export function isFutureDate(dateStr: string): boolean {
  const today = getTodayDateString();
  return dateStr > today;
}

/**
 * Returns formatted human date e.g. "Sep 24, 2026"
 */
export function formatNotebookDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    return date.toLocaleDateString("en-US", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Parses YYYY-MM-DD into UTC epoch days count for exact integer arithmetic
 */
export function dateStrToEpochDays(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

/**
 * Calculates new streak given previous streak state and the completed daily puzzle date
 */
export function calculateNewStreak(
  currentStreak: number,
  longestStreak: number,
  lastDailyDate: string | null,
  completedDate: string
): { currentStreak: number; longestStreak: number; streakIncreased: boolean } {
  if (lastDailyDate === completedDate) {
    // Already completed today
    return { currentStreak, longestStreak, streakIncreased: false };
  }

  if (!lastDailyDate) {
    // First daily puzzle ever completed
    const newStreak = 1;
    return {
      currentStreak: newStreak,
      longestStreak: Math.max(longestStreak, newStreak),
      streakIncreased: true,
    };
  }

  const lastDays = dateStrToEpochDays(lastDailyDate);
  const thisDays = dateStrToEpochDays(completedDate);
  const diffDays = thisDays - lastDays;

  let newStreak: number;
  if (diffDays === 1) {
    // Consecutive day
    newStreak = currentStreak + 1;
  } else if (diffDays === 0) {
    newStreak = currentStreak;
  } else if (diffDays < 0) {
    // Solving an archived past date doesn't increment or break the current streak
    return { currentStreak, longestStreak, streakIncreased: false };
  } else {
    // Streak broken (gap of 2 or more days), reset to 1
    newStreak = 1;
  }

  const newLongest = Math.max(longestStreak, newStreak);
  return {
    currentStreak: newStreak,
    longestStreak: newLongest,
    streakIncreased: newStreak > currentStreak,
  };
}
