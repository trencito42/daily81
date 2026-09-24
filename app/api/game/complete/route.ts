import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { isGridCompleteAndValid } from "@/lib/sudoku/validate";
import { calculatePuzzleXP, getLevelFromXP } from "@/lib/xp/progression";
import { calculateNewStreak, getTodayDateString, isFutureDate } from "@/lib/daily/streak";
import { Difficulty } from "@/lib/sudoku/types";
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

    // Unauthenticated guest processing
    if (!session) {
      const xpBreakdown = calculatePuzzleXP({
        difficulty: (puzzle.difficulty || difficulty || "medium") as Difficulty,
        isDaily: Boolean(isDaily),
        mistakes: Number(mistakes) || 0,
        hintsUsed: Number(hintsUsed) || 0,
        elapsedSeconds: Number(elapsedSeconds) || 0,
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

    // Require an existing GameSession (must have been started)
    const existingSession = await prisma.gameSession.findUnique({
      where: {
        user_puzzle_session_unique: {
          userId: user.id,
          puzzleId: puzzle.id,
        },
      },
    });

    if (!existingSession) {
      return NextResponse.json({ error: "Active game session not found for this puzzle" }, { status: 400 });
    }

    const dailyDate = isDaily && date ? date : puzzle.date;
    if (dailyDate && isFutureDate(dailyDate)) {
      return NextResponse.json({ error: "Cannot submit future daily puzzle" }, { status: 400 });
    }

    // 5. IDEMPOTENT RETRY: If already completed, return original completion response
    if (existingSession.completed) {
      const xpBreakdown = calculatePuzzleXP({
        difficulty: (puzzle.difficulty || difficulty || "medium") as Difficulty,
        isDaily: Boolean(isDaily),
        mistakes: existingSession.mistakes,
        hintsUsed: existingSession.hintsUsed,
        elapsedSeconds: existingSession.elapsedSeconds,
        userCurrentXP: user.xp,
      });

      return NextResponse.json({
        success: true,
        xpBreakdown: {
          ...xpBreakdown,
          totalXP: existingSession.xpAwarded,
          newLevel: user.level,
          isNewLevel: false,
        },
        user: {
          id: user.id,
          xp: user.xp,
          level: user.level,
          currentStreak: user.currentStreak,
          longestStreak: user.longestStreak,
          lastDailyDate: user.lastDailyDate,
        },
      });
    }

    // 6. SINGLE ATOMIC TRANSACTION
    const idempotencyKey = isDaily && dailyDate
      ? `daily-${user.id}-${dailyDate}`
      : `puzzle-${user.id}-${puzzle.id}`;

    // Derive authoritative values
    const authoritativeMistakes = existingSession.mistakes;
    const authoritativeHints = existingSession.hintsUsed;
    const authoritativeElapsed = Math.max(existingSession.elapsedSeconds, Math.floor(Number(elapsedSeconds) || 0));

    const xpBreakdown = calculatePuzzleXP({
      difficulty: (puzzle.difficulty || difficulty || "medium") as Difficulty,
      isDaily: Boolean(isDaily),
      mistakes: authoritativeMistakes,
      hintsUsed: authoritativeHints,
      elapsedSeconds: authoritativeElapsed,
      userCurrentXP: user.xp,
    });

    const xpAmount = xpBreakdown.totalXP;
    const newTotalXP = user.xp + xpAmount;
    const newLevel = getLevelFromXP(newTotalXP);

    const transactionResult = await prisma.$transaction(async (tx) => {
      // 1. Mark GameSession completed
      const sessionUpdated = await tx.gameSession.update({
        where: { id: existingSession.id },
        data: {
          currentGrid: finalGrid,
          elapsedSeconds: authoritativeElapsed,
          mistakes: authoritativeMistakes,
          hintsUsed: authoritativeHints,
          completed: true,
          completedAt: new Date(),
          xpAwarded: xpAmount,
          version: { increment: 1 },
        },
      });

      let updatedStreak = user.currentStreak;
      let updatedLongest = user.longestStreak;
      let updatedLastDaily = user.lastDailyDate;

      // 2. Daily completion & streak
      if (dailyDate) {
        const existingDaily = await tx.dailyCompletion.findUnique({
          where: {
            user_daily_unique: {
              userId: user.id,
              date: dailyDate,
            },
          },
        });

        if (!existingDaily) {
          await tx.dailyCompletion.create({
            data: {
              userId: user.id,
              puzzleId: puzzle.id,
              date: dailyDate,
              elapsedSeconds: authoritativeElapsed,
              mistakes: authoritativeMistakes,
              hintsUsed: authoritativeHints,
              xpAwarded: xpAmount,
            },
          });

          const streakResult = calculateNewStreak(
            user.currentStreak,
            user.longestStreak,
            user.lastDailyDate,
            dailyDate
          );
          updatedStreak = streakResult.currentStreak;
          updatedLongest = streakResult.longestStreak;
          updatedLastDaily = dailyDate;
        }
      }

      // 3. Record XpEvent with idempotencyKey
      await tx.xpEvent.upsert({
        where: { idempotencyKey },
        update: {},
        create: {
          userId: user.id,
          gameSessionId: existingSession.id,
          amount: xpAmount,
          reason: isDaily ? "daily_completion" : "puzzle_completion",
          idempotencyKey,
        },
      });

      // 4. Update user xp, level, and streak in single commit
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          xp: newTotalXP,
          level: newLevel,
          currentStreak: updatedStreak,
          longestStreak: updatedLongest,
          lastDailyDate: updatedLastDaily,
        },
      });

      return {
        sessionUpdated,
        updatedUser,
      };
    });

    // Post-transaction non-critical activity log
    if (dailyDate) {
      logUserActivity(user.id, "daily_solved", {
        date: dailyDate,
        elapsedSeconds: authoritativeElapsed,
        streak: transactionResult.updatedUser.currentStreak,
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      xpBreakdown: {
        ...xpBreakdown,
        totalXP: xpAmount,
        newLevel: transactionResult.updatedUser.level,
        isNewLevel: transactionResult.updatedUser.level > user.level,
      },
      user: {
        id: user.id,
        xp: transactionResult.updatedUser.xp,
        level: transactionResult.updatedUser.level,
        currentStreak: transactionResult.updatedUser.currentStreak,
        longestStreak: transactionResult.updatedUser.longestStreak,
        lastDailyDate: transactionResult.updatedUser.lastDailyDate,
      },
    });
  } catch (err) {
    console.error("Game complete error:", err);
    return NextResponse.json({ error: "Failed to process puzzle completion" }, { status: 500 });
  }
}

