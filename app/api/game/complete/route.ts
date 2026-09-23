import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { isGridCompleteAndValid } from "@/lib/sudoku/validate";
import { calculatePuzzleXP } from "@/lib/xp/progression";
import { calculateNewStreak } from "@/lib/daily/streak";
import { Difficulty } from "@/lib/sudoku/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getSession(req);
    const body = await req.json();

    const {
      puzzleKey,
      difficulty,
      date,
      isDaily,
      finalGrid,
      elapsedSeconds = 0,
      mistakes = 0,
      hintsUsed = 0,
    } = body;

    if (!puzzleKey || !finalGrid || typeof finalGrid !== "string") {
      return NextResponse.json({ error: "Invalid puzzle submission" }, { status: 400 });
    }

    // 1. Validate grid server-side
    const isValid = isGridCompleteAndValid(finalGrid);
    if (!isValid) {
      return NextResponse.json({ error: "Grid solution is invalid or incomplete" }, { status: 400 });
    }

    // 2. Fetch puzzle from DB if present
    let puzzle = null;
    try {
      puzzle = await prisma.puzzle.findUnique({
        where: { puzzleKey },
      });
    } catch {
      // Offline fallback
    }

    // If puzzle is in DB, verify grid against solution
    if (puzzle && puzzle.solutionGrid !== finalGrid) {
      return NextResponse.json({ error: "Submitted solution does not match puzzle" }, { status: 400 });
    }

    // If not authenticated, return valid calculation
    if (!session) {
      const xpBreakdown = calculatePuzzleXP({
        difficulty: (difficulty || "medium") as Difficulty,
        isDaily: Boolean(isDaily),
        mistakes: Number(mistakes),
        hintsUsed: Number(hintsUsed),
        elapsedSeconds: Number(elapsedSeconds),
        userCurrentXP: 0,
      });

      return NextResponse.json({
        success: true,
        xpBreakdown,
      });
    }

    // Authenticated user processing
    const user = await prisma.user.findUnique({
      where: { id: session.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if daily puzzle already completed by this user
    let alreadyCompletedDaily = false;
    if (isDaily && date && puzzle) {
      const existingDaily = await prisma.dailyCompletion.findUnique({
        where: {
          user_daily_unique: {
            userId: user.id,
            date,
          },
        },
      });
      if (existingDaily) {
        alreadyCompletedDaily = true;
      }
    }

    // Compute XP
    const xpBreakdown = calculatePuzzleXP({
      difficulty: (difficulty || "medium") as Difficulty,
      isDaily: Boolean(isDaily) && !alreadyCompletedDaily,
      mistakes: Number(mistakes),
      hintsUsed: Number(hintsUsed),
      elapsedSeconds: Number(elapsedSeconds),
      userCurrentXP: user.xp,
    });

    const xpToAdd = alreadyCompletedDaily ? 0 : xpBreakdown.totalXP;

    // Calculate streak if daily
    let newCurrentStreak = user.currentStreak;
    let newLongestStreak = user.longestStreak;
    let newLastDailyDate = user.lastDailyDate;

    if (isDaily && date && !alreadyCompletedDaily) {
      const streakResult = calculateNewStreak(
        user.currentStreak,
        user.longestStreak,
        user.lastDailyDate,
        date
      );
      newCurrentStreak = streakResult.currentStreak;
      newLongestStreak = streakResult.longestStreak;
      newLastDailyDate = date;
    }

    // Update user in DB
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        xp: user.xp + xpToAdd,
        level: xpBreakdown.newLevel,
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        lastDailyDate: newLastDailyDate,
      },
    });

    // Record daily completion record if daily & puzzle exists
    if (isDaily && date && puzzle && !alreadyCompletedDaily) {
      try {
        await prisma.dailyCompletion.create({
          data: {
            userId: user.id,
            puzzleId: puzzle.id,
            date,
            elapsedSeconds: Number(elapsedSeconds),
            mistakes: Number(mistakes),
            hintsUsed: Number(hintsUsed),
            xpAwarded: xpToAdd,
          },
        });
      } catch {
        // Ignore duplicate insert race condition
      }
    }

    // Record game session
    let savedSessionId: string | null = null;
    if (puzzle) {
      try {
        const sessionRec = await prisma.gameSession.create({
          data: {
            userId: user.id,
            puzzleId: puzzle.id,
            currentGrid: finalGrid,
            elapsedSeconds: Number(elapsedSeconds),
            mistakes: Number(mistakes),
            hintsUsed: Number(hintsUsed),
            completed: true,
            completedAt: new Date(),
            xpAwarded: xpToAdd,
          },
        });
        savedSessionId = sessionRec.id;
      } catch {
        // Ignore
      }
    }

    // Record auditable XP transaction event
    if (xpToAdd > 0) {
      try {
        await prisma.xpEvent.create({
          data: {
            userId: user.id,
            gameSessionId: savedSessionId,
            amount: xpToAdd,
            reason: isDaily ? "daily_completion" : "puzzle_completion",
          },
        });
      } catch {
        // Ignore
      }
    }

    return NextResponse.json({
      success: true,
      xpBreakdown,
      user: {
        id: updatedUser.id,
        xp: updatedUser.xp,
        level: updatedUser.level,
        currentStreak: updatedUser.currentStreak,
        longestStreak: updatedUser.longestStreak,
      },
    });
  } catch (err) {
    console.error("Game complete error:", err);
    return NextResponse.json({ error: "Failed to process puzzle completion" }, { status: 500 });
  }
}
