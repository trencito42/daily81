import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { isGridCompleteAndValid } from "@/lib/sudoku/validate";
import { calculatePuzzleXP, getLevelFromXP } from "@/lib/xp/progression";
import { calculateNewStreak, isFutureDate } from "@/lib/daily/streak";
import { Difficulty } from "@/lib/sudoku/types";
import { getPuzzleByKey } from "@/lib/puzzles/puzzleService";
import { logUserActivity } from "@/lib/activity/activity";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getSession(req);
    const body = await req.json();

    const {
      puzzleKey,
      finalGrid,
      // These are accepted for display convenience but NEVER used for authority:
      elapsedSeconds = 0,
      mistakes = 0,
      hintsUsed = 0,
    } = body;

    if (!puzzleKey || !finalGrid || typeof finalGrid !== "string" || finalGrid.length !== 81) {
      return NextResponse.json({ error: "Invalid puzzle submission" }, { status: 400 });
    }

    // 1. Validate grid completeness and Sudoku rules
    const isValid = isGridCompleteAndValid(finalGrid);
    if (!isValid) {
      return NextResponse.json({ error: "Grid solution is invalid or incomplete" }, { status: 400 });
    }

    // 2. Fetch canonical puzzle by puzzleKey — NEVER create from client-supplied params
    const puzzle = await getPuzzleByKey(puzzleKey);

    if (!puzzle) {
      return NextResponse.json({ error: "Canonical puzzle not found" }, { status: 404 });
    }

    // 3. Verify submitted grid matches server's canonical solution
    if (puzzle.solutionGrid !== finalGrid) {
      return NextResponse.json({ error: "Submitted solution does not match canonical puzzle" }, { status: 400 });
    }

    // Derive ALL authoritative metadata from DB — never trust client fields
    const canonicalIsDaily = puzzle.date !== null;
    const canonicalDate = puzzle.date;
    const canonicalDifficulty = (puzzle.difficulty || "medium") as Difficulty;

    if (canonicalDate && isFutureDate(canonicalDate)) {
      return NextResponse.json({ error: "Cannot submit future daily puzzle" }, { status: 400 });
    }

    // --- Guest path ---
    if (!session) {
      const xpBreakdown = calculatePuzzleXP({
        difficulty: canonicalDifficulty,
        isDaily: canonicalIsDaily,
        mistakes: Number(mistakes) || 0,
        hintsUsed: Number(hintsUsed) || 0,
        elapsedSeconds: Number(elapsedSeconds) || 0,
        userCurrentXP: 0,
      });

      return NextResponse.json({ success: true, xpBreakdown });
    }

    // --- Authenticated path ---
    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Require an existing GameSession (must have been autosaved/started)
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

    // IDEMPOTENT RETRY: already completed → return cached result
    if (existingSession.completed) {
      const xpBreakdown = calculatePuzzleXP({
        difficulty: canonicalDifficulty,
        isDaily: canonicalIsDaily,
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

    // Build idempotency key from canonical server values
    const idempotencyKey = canonicalIsDaily && canonicalDate
      ? `daily-${user.id}-${canonicalDate}`
      : `puzzle-${user.id}-${puzzle.id}`;

    // Authoritative counters come from GameSession; elapsed is max(server, client) with sanity cap
    const authoritativeMistakes = existingSession.mistakes;
    const authoritativeHints = existingSession.hintsUsed;
    const authoritativeElapsed = Math.max(
      existingSession.elapsedSeconds,
      Math.min(864000, Math.floor(Number(elapsedSeconds) || 0))
    );

    const xpBreakdown = calculatePuzzleXP({
      difficulty: canonicalDifficulty,
      isDaily: canonicalIsDaily,
      mistakes: authoritativeMistakes,
      hintsUsed: authoritativeHints,
      elapsedSeconds: authoritativeElapsed,
      userCurrentXP: user.xp,
    });

    const xpAmount = xpBreakdown.totalXP;
    const newTotalXP = user.xp + xpAmount;
    const newLevel = getLevelFromXP(newTotalXP);

    const transactionResult = await prisma.$transaction(async (tx) => {
      // 1. Mark GameSession completed (atomic)
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

      // 2. Daily completion & streak (only for canonical Daily puzzles)
      if (canonicalIsDaily && canonicalDate) {
        const existingDaily = await tx.dailyCompletion.findUnique({
          where: {
            user_daily_unique: {
              userId: user.id,
              date: canonicalDate,
            },
          },
        });

        if (!existingDaily) {
          await tx.dailyCompletion.create({
            data: {
              userId: user.id,
              puzzleId: puzzle.id,
              date: canonicalDate,
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
            canonicalDate
          );
          updatedStreak = streakResult.currentStreak;
          updatedLongest = streakResult.longestStreak;
          updatedLastDaily = canonicalDate;
        }
      }

      // 3. XP event with idempotency key (upsert is safe for retries)
      await tx.xpEvent.upsert({
        where: { idempotencyKey },
        update: {},
        create: {
          userId: user.id,
          gameSessionId: existingSession.id,
          amount: xpAmount,
          reason: canonicalIsDaily ? "daily_completion" : "puzzle_completion",
          idempotencyKey,
        },
      });

      // 4. Update user XP, level, and streak atomically
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

      return { sessionUpdated, updatedUser };
    });

    // Non-critical activity log (fire-and-forget)
    if (canonicalIsDaily && canonicalDate) {
      logUserActivity(user.id, "daily_solved", {
        date: canonicalDate,
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
