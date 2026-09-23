/**
 * Normalizes date to YYYY-MM-DD string
 */
export function getTodayDateString(offsetHours: number = 0): string {
  const now = new Date();
  if (offsetHours !== 0) {
    now.setHours(now.getHours() + offsetHours);
  }
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns formatted human date e.g. "Sep 24, 2026"
 */
export function formatNotebookDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
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

  const lastDate = new Date(lastDailyDate);
  const thisDate = new Date(completedDate);
  const diffTime = thisDate.getTime() - lastDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

  let newStreak: number;
  if (diffDays === 1) {
    // Consecutive day
    newStreak = currentStreak + 1;
  } else if (diffDays === 0) {
    newStreak = currentStreak;
  } else {
    // Streak broken, reset to 1
    newStreak = 1;
  }

  const newLongest = Math.max(longestStreak, newStreak);
  return {
    currentStreak: newStreak,
    longestStreak: newLongest,
    streakIncreased: newStreak > currentStreak,
  };
}
