import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { isGridCompleteAndValid } from "@/lib/sudoku/validate";
import { calculatePuzzleXP } from "@/lib/xp/progression";
import { calculateNewStreak, getTodayDateString, isFutureDate } from "@/lib/daily/streak";
import { Difficulty } from "@/lib/sudoku/types";
import { awardXp } from "@/lib/xp/reward";
import { getPuzzleByKey, getOrCreateDailyPuzzle } from "@/lib/puzzles/puzzleService";
import { logUserActivity } from "@/lib/activity/activity";

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

    if (!puzzleKey || !finalGrid || typeof finalGrid !== "string" || finalGrid.length !== 81) {
      return NextResponse.json({ error: "Invalid puzzle submission" }, { status: 400 });
    }

    // 1. Validate grid completeness and validity
    const isValid = isGridCompleteAndValid(finalGrid);
    if (!isValid) {
      return NextResponse.json({ error: "Grid solution is invalid or incomplete" }, { status: 400 });
    }

    // 2. Fetch or resolve canonical puzzle
    let puzzle = await getPuzzleByKey(puzzleKey);
    if (!puzzle && isDaily && date) {
      if (isFutureDate(date)) {
        return NextResponse.json({ error: "Cannot submit future daily puzzle" }, { status: 400 });
      }
      const res = await getOrCreateDailyPuzzle(date);
      puzzle = res.puzzle;
    }

    if (!puzzle) {
      return NextResponse.json({ error: "Canonical puzzle not found" }, { status: 404 });
    }

    // 3. Verify submitted grid strictly matches the canonical solution
    if (puzzle.solutionGrid !== finalGrid) {
      return NextResponse.json({ error: "Submitted solution does not match canonical puzzle" }, { status: 400 });
    }

    // If unauthenticated guest: compute theoretical XP for display only
    if (!session) {
      const xpBreakdown = calculatePuzzleXP({
        difficulty: (puzzle.difficulty || difficulty || "medium") as Difficulty,
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

    // 4. Authenticated user processing
    const user = await prisma.user.findUnique({
      where: { id: session.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 5. Check if GameSession exists and if it was already completed
    const existingSession = await prisma.gameSession.findUnique({
      where: {
        user_puzzle_session_unique: {
          userId: user.id,
          puzzleId: puzzle.id,
        },
      },
    });

    const isAlreadyCompleted = existingSession?.completed ?? false;

    // Check DailyCompletion if daily
    let alreadyCompletedDaily = false;
    const dailyDate = isDaily && date ? date : puzzle.date;
    if (dailyDate) {
      if (isFutureDate(dailyDate)) {
        return NextResponse.json({ error: "Cannot submit future daily puzzle" }, { status: 400 });
      }
      const existingDaily = await prisma.dailyCompletion.findUnique({
        where: {
          user_daily_unique: {
            userId: user.id,
            date: dailyDate,
          },
        },
      });
      if (existingDaily) {
        alreadyCompletedDaily = true;
      }
    }

    // 6. Compute XP
    const shouldAwardXP = !isAlreadyCompleted && !(isDaily && alreadyCompletedDaily);
    const xpBreakdown = calculatePuzzleXP({
      difficulty: (puzzle.difficulty || difficulty || "medium") as Difficulty,
      isDaily: Boolean(isDaily) && !alreadyCompletedDaily,
      mistakes: Number(mistakes),
      hintsUsed: Number(hintsUsed),
      elapsedSeconds: Number(elapsedSeconds),
      userCurrentXP: user.xp,
    });

    const xpAmount = shouldAwardXP ? xpBreakdown.totalXP : 0;
    const idempotencyKey = isDaily && dailyDate
      ? `daily-${user.id}-${dailyDate}`
      : `puzzle-${user.id}-${puzzle.id}`;

    // 7. Atomically save GameSession
    const finalElapsed = Math.max(existingSession?.elapsedSeconds || 0, Math.floor(Number(elapsedSeconds) || 0));
    const finalMistakes = Math.max(existingSession?.mistakes || 0, Math.floor(Number(mistakes) || 0));
    const finalHints = Math.max(existingSession?.hintsUsed || 0, Math.floor(Number(hintsUsed) || 0));

    const gameSession = await prisma.gameSession.upsert({
      where: {
        user_puzzle_session_unique: {
          userId: user.id,
          puzzleId: puzzle.id,
        },
      },
      update: {
        currentGrid: finalGrid,
        elapsedSeconds: finalElapsed,
        mistakes: finalMistakes,
        hintsUsed: finalHints,
        completed: true,
        completedAt: existingSession?.completedAt || new Date(),
        xpAwarded: shouldAwardXP ? xpAmount : (existingSession?.xpAwarded || 0),
        version: { increment: 1 },
      },
      create: {
        userId: user.id,
        puzzleId: puzzle.id,
        puzzleKey: puzzle.puzzleKey,
        currentGrid: finalGrid,
        notesData: "{}",
        elapsedSeconds: finalElapsed,
        mistakes: finalMistakes,
        hintsUsed: finalHints,
        isStarted: true,
        startedAt: new Date(),
        completed: true,
        completedAt: new Date(),
        xpAwarded: xpAmount,
        version: 1,
      },
    });

    // 8. Record Daily completion & update streak if daily
    let updatedUserStats = {
      xp: user.xp,
      level: user.level,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      lastDailyDate: user.lastDailyDate,
    };

    if (dailyDate && !alreadyCompletedDaily) {
      try {
        await prisma.dailyCompletion.create({
          data: {
            userId: user.id,
            puzzleId: puzzle.id,
            date: dailyDate,
            elapsedSeconds: finalElapsed,
            mistakes: finalMistakes,
            hintsUsed: finalHints,
            xpAwarded: xpAmount,
          },
        });
      } catch {
        // Handled race condition
      }

      const streakResult = calculateNewStreak(
        user.currentStreak,
        user.longestStreak,
        user.lastDailyDate,
        dailyDate
      );

      const userAfterStreak = await prisma.user.update({
        where: { id: user.id },
        data: {
          currentStreak: streakResult.currentStreak,
          longestStreak: streakResult.longestStreak,
          lastDailyDate: dailyDate,
        },
      });

      updatedUserStats.currentStreak = userAfterStreak.currentStreak;
      updatedUserStats.longestStreak = userAfterStreak.longestStreak;
      updatedUserStats.lastDailyDate = userAfterStreak.lastDailyDate;

      await logUserActivity(user.id, "daily_solved", {
        date: dailyDate,
        elapsedSeconds: finalElapsed,
        streak: streakResult.currentStreak,
      });
    }

    // 9. Award XP via centralized service
    const xpResult = await awardXp({
      userId: user.id,
      amount: xpAmount,
      reason: isDaily ? "daily_completion" : "puzzle_completion",
      idempotencyKey,
      gameSessionId: gameSession.id,
    });

    return NextResponse.json({
      success: true,
      xpBreakdown: {
        ...xpBreakdown,
        totalXP: xpResult.xpAwarded,
        newLevel: xpResult.level,
        isNewLevel: xpResult.isNewLevel,
      },
      user: {
        id: user.id,
        xp: xpResult.xp,
        level: xpResult.level,
        currentStreak: updatedUserStats.currentStreak,
        longestStreak: updatedUserStats.longestStreak,
        lastDailyDate: updatedUserStats.lastDailyDate,
      },
    });
  } catch (err) {
    console.error("Game complete error:", err);
    return NextResponse.json({ error: "Failed to process puzzle completion" }, { status: 500 });
  }
}
