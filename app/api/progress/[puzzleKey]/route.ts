import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getPuzzleByKey } from "@/lib/puzzles/puzzleService";

export const dynamic = "force-dynamic";

function formatProgress(session: any, puzzleKey: string) {
  let parsedNotes = {};
  if (session.notesData) {
    try {
      parsedNotes = typeof session.notesData === "string" ? JSON.parse(session.notesData) : session.notesData;
    } catch {
      parsedNotes = {};
    }
  }

  return {
    sessionId: session.id,
    puzzleKey: session.puzzleKey || puzzleKey,
    currentGrid: session.currentGrid,
    notes: parsedNotes,
    elapsedSeconds: session.elapsedSeconds,
    mistakes: session.mistakes,
    hintsUsed: session.hintsUsed,
    isStarted: session.isStarted,
    startedAt: session.startedAt,
    version: session.version,
    updatedAt: session.updatedAt,
    completed: session.completed,
    completedAt: session.completedAt,
  };
}

export async function GET(req: Request, { params }: { params: Promise<{ puzzleKey: string }> }) {
  try {
    const sessionUser = await getSession(req);
    if (!sessionUser) {
      return NextResponse.json({ progress: null }, { status: 200 });
    }

    const { puzzleKey } = await params;
    if (!puzzleKey) {
      return NextResponse.json({ error: "Missing puzzleKey" }, { status: 400 });
    }

    const puzzle = await getPuzzleByKey(puzzleKey);
    if (!puzzle) {
      return NextResponse.json({ progress: null }, { status: 200 });
    }

    const session = await prisma.gameSession.findUnique({
      where: {
        user_puzzle_session_unique: {
          userId: sessionUser.id,
          puzzleId: puzzle.id,
        },
      },
    });

    if (!session) {
      return NextResponse.json({ progress: null }, { status: 200 });
    }

    return NextResponse.json({ progress: formatProgress(session, puzzleKey) });
  } catch (err) {
    console.error("GET progress error:", err);
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ puzzleKey: string }> }) {
  try {
    const sessionUser = await getSession(req);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { puzzleKey } = await params;
    if (!puzzleKey) {
      return NextResponse.json({ error: "Missing puzzleKey" }, { status: 400 });
    }

    const body = await req.json();
    const {
      currentGrid,
      notes,
      elapsedSeconds = 0,
      mistakes = 0,
      hintsUsed = 0,
      isStarted = true,
      expectedVersion,
    } = body;

    // 1. Validate grid string
    if (typeof currentGrid !== "string" || currentGrid.length !== 81 || !/^[0-9]{81}$/.test(currentGrid)) {
      return NextResponse.json({ error: "Invalid currentGrid payload" }, { status: 400 });
    }

    // 2. Validate canonical puzzle
    const puzzle = await getPuzzleByKey(puzzleKey);
    if (!puzzle) {
      return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
    }

    // 3. Verify original givens are preserved
    for (let i = 0; i < 81; i++) {
      const given = puzzle.initialGrid[i];
      if (given !== "0" && currentGrid[i] !== given) {
        return NextResponse.json({ error: `Immutable given at index ${i} was altered` }, { status: 400 });
      }
    }

    // 4. Validate notes format
    const notesDataStr = typeof notes === "object" && notes !== null ? JSON.stringify(notes) : "{}";

    const elapsed = Math.max(0, Math.floor(Number(elapsedSeconds) || 0));
    const mistakeCount = Math.max(0, Math.floor(Number(mistakes) || 0));
    const hintCount = Math.max(0, Math.floor(Number(hintsUsed) || 0));

    // 5. Look up existing session
    const existing = await prisma.gameSession.findUnique({
      where: {
        user_puzzle_session_unique: {
          userId: sessionUser.id,
          puzzleId: puzzle.id,
        },
      },
    });

    if (existing) {
      // Completed sessions cannot be overwritten by incomplete active progress
      if (existing.completed) {
        return NextResponse.json(
          {
            conflict: true,
            message: "Puzzle is already completed on server",
            progress: formatProgress(existing, puzzleKey),
          },
          { status: 409 }
        );
      }

      // Optimistic concurrency check: if client sent an expectedVersion that is older than server's
      if (
        typeof expectedVersion === "number" &&
        expectedVersion !== -1 &&
        expectedVersion < existing.version
      ) {
        return NextResponse.json(
          {
            conflict: true,
            message: "Stale progress version",
            progress: formatProgress(existing, puzzleKey),
          },
          { status: 409 }
        );
      }

      // Monotonic guard: hints, mistakes, and elapsed cannot decrease
      const finalHints = Math.max(existing.hintsUsed, hintCount);
      const finalMistakes = Math.max(existing.mistakes, mistakeCount);
      const finalElapsed = Math.max(existing.elapsedSeconds, elapsed);

      const updated = await prisma.gameSession.update({
        where: { id: existing.id },
        data: {
          currentGrid,
          notesData: notesDataStr,
          elapsedSeconds: finalElapsed,
          mistakes: finalMistakes,
          hintsUsed: finalHints,
          isStarted: isStarted || existing.isStarted,
          version: { increment: 1 },
        },
      });

      return NextResponse.json({
        success: true,
        progress: formatProgress(updated, puzzleKey),
      });
    }

    // Create new session
    const created = await prisma.gameSession.create({
      data: {
        userId: sessionUser.id,
        puzzleId: puzzle.id,
        puzzleKey,
        currentGrid,
        notesData: notesDataStr,
        elapsedSeconds: elapsed,
        mistakes: mistakeCount,
        hintsUsed: hintCount,
        isStarted: Boolean(isStarted),
        startedAt: new Date(),
        version: 1,
        completed: false,
      },
    });

    return NextResponse.json({
      success: true,
      progress: formatProgress(created, puzzleKey),
    });
  } catch (err) {
    console.error("PUT progress error:", err);
    return NextResponse.json({ error: "Failed to save progress" }, { status: 500 });
  }
}
