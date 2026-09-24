import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getPuzzleByKey } from "@/lib/puzzles/puzzleService";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getSession(req);
    const clientIp = getClientIp(req);

    // Rate limiting: max 30 hint requests / min / user (or IP for guests)
    const rateLimitKey = `hint:${session?.id || clientIp}`;
    const rl = checkRateLimit({
      key: rateLimitKey,
      maxRequests: 30,
      windowSeconds: 60,
    });

    if (!rl.allowed) {
      return rateLimitResponse("Too many hint requests. Please try again later.", rl.resetSeconds);
    }

    const body = await req.json();
    const puzzleKey = body.puzzleKey;
    const cellIndex = typeof body.cellIndex === "number" ? body.cellIndex : body.index;

    if (!puzzleKey || typeof cellIndex !== "number") {
      return NextResponse.json({ error: "Invalid hint request" }, { status: 400 });
    }

    if (cellIndex < 0 || cellIndex > 80) {
      return NextResponse.json({ error: "Cell index out of bounds" }, { status: 400 });
    }

    const puzzle = await getPuzzleByKey(puzzleKey);
    if (!puzzle) {
      return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
    }

    const value = parseInt(puzzle.solutionGrid[cellIndex], 10);

    // If authenticated: ensure GameSession exists and increment hintsUsed immediately
    // If no session exists yet, create one now with hintsUsed: 1 so no hints can be obtained "for free" before starting
    if (session) {
      const existingSession = await prisma.gameSession.findUnique({
        where: {
          user_puzzle_session_unique: {
            userId: session.id,
            puzzleId: puzzle.id,
          },
        },
      });

      if (existingSession) {
        if (!existingSession.completed) {
          await prisma.gameSession.update({
            where: { id: existingSession.id },
            data: {
              hintsUsed: { increment: 1 },
              version: { increment: 1 },
              isStarted: true,
            },
          });
        }
      } else {
        // Create active GameSession with initial hint recorded
        await prisma.gameSession.create({
          data: {
            userId: session.id,
            puzzleId: puzzle.id,
            puzzleKey,
            currentGrid: puzzle.initialGrid,
            notesData: "{}",
            elapsedSeconds: 0,
            mistakes: 0,
            hintsUsed: 1,
            isStarted: true,
            startedAt: new Date(),
            version: 1,
            completed: false,
          },
        });
      }
    } else {
      // NOTE: For unauthenticated guests, hints cannot be tracked server-side in Prisma.
      // However, unauthenticated guests are completely excluded from leaderboards (/api/leaderboard
      // strictly queries DailyCompletion foreign-keyed to registered User models).
    }

    return NextResponse.json({
      success: true,
      cellIndex,
      index: cellIndex,
      value,
      number: value,
    });
  } catch (err) {
    console.error("Hint reveal error:", err);
    return NextResponse.json({ error: "Failed to reveal hint" }, { status: 500 });
  }
}


