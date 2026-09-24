import { getOrCreateDailyPuzzle } from "@/lib/puzzles/puzzleService";
import { getTodayDateString, isFutureDate } from "@/lib/daily/streak";
import { SudokuGame } from "@/components/game/SudokuGame";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { DoodleEmptyState } from "@/components/doodle/DoodleEmptyState";

export const dynamic = "force-dynamic";

interface DailyPageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function DailyPage({ searchParams }: DailyPageProps) {
  const resolvedParams = await searchParams;
  const dateStr = resolvedParams?.date && /^\d{4}-\d{2}-\d{2}$/.test(resolvedParams.date)
    ? resolvedParams.date
    : getTodayDateString();

  if (isFutureDate(dateStr)) {
    return (
      <div
        style={{
          width: "100%",
          maxWidth: "var(--page-reading, 520px)",
          margin: "40px auto",
          padding: "0 16px",
          boxSizing: "border-box",
        }}
      >
        <DoodleEmptyState
          icon="calendar"
          title="puzzle not available yet"
          description={`The daily sudoku for ${dateStr} belongs to the future and cannot be opened early.`}
          actionLabel="today's puzzle →"
          actionHref="/daily"
        />
      </div>
    );
  }

  const { publicPuzzle } = await getOrCreateDailyPuzzle(dateStr);

  let userStreak = 0;
  try {
    const session = await getSession();
    if (session) {
      const user = await prisma.user.findUnique({
        where: { id: session.id },
        select: { currentStreak: true },
      });
      userStreak = user?.currentStreak || 0;
    }
  } catch {
    // Offline fallback
  }

  return (
    <div style={{ width: "100%", flex: 1, display: "flex", flexDirection: "column" }}>
      <SudokuGame
        initialPuzzle={publicPuzzle}
        isDaily={true}
        dateStr={publicPuzzle.date}
        userStreak={userStreak}
      />
    </div>
  );
}
