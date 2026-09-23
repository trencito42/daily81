import { generateDailySudoku } from "@/lib/sudoku/generator";
import { getTodayDateString } from "@/lib/daily/streak";
import { SudokuGame } from "@/components/game/SudokuGame";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

interface DailyPageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function DailyPage({ searchParams }: DailyPageProps) {
  const resolvedParams = await searchParams;
  const dateStr = resolvedParams?.date && /^\d{4}-\d{2}-\d{2}$/.test(resolvedParams.date)
    ? resolvedParams.date
    : getTodayDateString();

  const puzzle = generateDailySudoku(dateStr, "hard");

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
        initialPuzzle={puzzle}
        isDaily={true}
        dateStr={dateStr}
        userStreak={userStreak}
      />
    </div>
  );
}
