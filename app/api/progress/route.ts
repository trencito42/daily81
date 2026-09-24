import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ activeSessions: [] });
    }

    const activeSessions = await prisma.gameSession.findMany({
      where: {
        userId: session.id,
        completed: false,
      },
      include: {
        puzzle: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });

    return NextResponse.json({
      activeSessions: activeSessions.map((s) => ({
        sessionId: s.id,
        puzzleKey: s.puzzleKey || s.puzzle.puzzleKey,
        puzzle: {
          id: s.puzzle.id,
          puzzleKey: s.puzzle.puzzleKey,
          date: s.puzzle.date,
          difficulty: s.puzzle.difficulty,
          initialGrid: s.puzzle.initialGrid,
          givensCount: s.puzzle.initialGrid.split("").filter((c) => c !== "0").length,
          // seed intentionally omitted — server only
        },
        elapsedSeconds: s.elapsedSeconds,
        mistakes: s.mistakes,
        hintsUsed: s.hintsUsed,
        version: s.version,
        updatedAt: s.updatedAt,
      })),
    });
  } catch (err) {
    console.error("Fetch active progress list error:", err);
    return NextResponse.json({ activeSessions: [] });
  }
}
