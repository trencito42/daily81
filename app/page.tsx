import { getOrCreateDailyPuzzle } from "@/lib/puzzles/puzzleService";
import { SudokuGame } from "@/components/game/SudokuGame";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { publicPuzzle } = await getOrCreateDailyPuzzle();

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
