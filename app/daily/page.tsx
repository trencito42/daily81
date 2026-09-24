import { getOrCreateDailyPuzzle } from "@/lib/puzzles/puzzleService";
import { getTodayDateString, isFutureDate } from "@/lib/daily/streak";
import { SudokuGame } from "@/components/game/SudokuGame";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";

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
          maxWidth: "440px",
          margin: "40px auto",
          padding: "24px 20px",
          textAlign: "center",
          border: "1.5px solid var(--ink-primary)",
          borderRadius: "255px 12px 225px 12px/12px 225px 12px 255px",
          backgroundColor: "var(--bg-paper)",
        }}
      >
        <h1 className="font-doodle" style={{ fontSize: "22px", marginBottom: "12px" }}>
          puzzle not available yet
        </h1>
        <p style={{ color: "var(--ink-secondary)", fontSize: "14px", lineHeight: "1.6", marginBottom: "20px" }}>
          The daily sudoku for {dateStr} belongs to the future and cannot be opened early.
        </p>
        <Link href="/daily" className="doodle-button doodle-button-sm active" style={{ textDecoration: "none" }}>
          today&apos;s puzzle →
        </Link>
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
