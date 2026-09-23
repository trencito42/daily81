import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ authenticated: false, stats: null });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      include: {
        sessions: {
          where: { completed: true },
          include: { puzzle: true },
        },
        dailyCompletions: true,
      },
    });

    if (!user) {
      return NextResponse.json({ authenticated: false, stats: null });
    }

    const completedSessions = user.sessions;
    const totalSolved = completedSessions.length + user.dailyCompletions.length;
    let totalTimeSeconds = 0;
    let bestTimeSeconds = 0;
    let totalMistakes = 0;
    let totalHints = 0;

    const difficultyCounts = {
      easy: 0,
      medium: 0,
      hard: 0,
      expert: 0,
    };

    completedSessions.forEach((s) => {
      totalTimeSeconds += s.elapsedSeconds;
      totalMistakes += s.mistakes;
      totalHints += s.hintsUsed;
      if (bestTimeSeconds === 0 || (s.elapsedSeconds > 0 && s.elapsedSeconds < bestTimeSeconds)) {
        bestTimeSeconds = s.elapsedSeconds;
      }
      const diff = (s.puzzle.difficulty || "medium") as keyof typeof difficultyCounts;
      if (difficultyCounts[diff] !== undefined) {
        difficultyCounts[diff] += 1;
      }
    });

    user.dailyCompletions.forEach((dc) => {
      totalTimeSeconds += dc.elapsedSeconds;
      totalMistakes += dc.mistakes;
      totalHints += dc.hintsUsed;
      if (bestTimeSeconds === 0 || (dc.elapsedSeconds > 0 && dc.elapsedSeconds < bestTimeSeconds)) {
        bestTimeSeconds = dc.elapsedSeconds;
      }
      difficultyCounts.hard += 1;
    });

    const averageTimeSeconds = totalSolved > 0 ? Math.round(totalTimeSeconds / totalSolved) : 0;
    const totalActions = totalSolved * 81;
    const accuracyRate =
      totalActions > 0
        ? Math.max(0, Math.round(((totalActions - totalMistakes) / totalActions) * 1000) / 10)
        : 100;

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        xp: user.xp,
        level: user.level,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
      },
      stats: {
        totalSolved,
        totalTimeSeconds,
        averageTimeSeconds,
        bestTimeSeconds,
        accuracyRate,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        difficultyCounts,
        totalMistakes,
        totalHints,
        dailyPuzzlesCompleted: user.dailyCompletions.length,
      },
    });
  } catch (err) {
    console.error("Stats API error:", err);
    return NextResponse.json({ authenticated: false, stats: null });
  }
}
