import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getPuzzleByKey } from "@/lib/puzzles/puzzleService";

export const dynamic = "force-dynamic";

interface ProgressSessionInput {
  id?: string | null;
  notesData?: string | null;
  puzzleKey?: string | null;
  date?: string | null;
  difficulty?: string | null;
  currentGrid?: string | null;
  elapsedSeconds?: number | null;
  mistakes?: number | null;
  hintsUsed?: number | null;
  isStarted?: boolean | null;
  startedAt?: Date | null;
  completed?: boolean | null;
  completedAt?: Date | null;
  version?: number | null;
  xpAwarded?: number | null;
  updatedAt?: Date | null;
  [key: string]: unknown;
}

interface ProgressPuzzleInput {
  date?: string | null;
  difficulty?: string | null;
}

async function formatProgress(session: ProgressSessionInput | null | undefined, puzzleKey: string, puzzle?: ProgressPuzzleInput | null) {
  if (!session) {
    return {
      puzzleKey,
      currentGrid: "",
      notes: {},
      elapsedSeconds: 0,
      mistakes: 0,
      hintsUsed: 0,
      isStarted: false,
      completed: false,
      completedAt: null,
      version: 1,
      xpAwarded: 0,
    };
  }
  let parsedNotes = {};
  if (session.notesData) {
    try {
      parsedNotes = typeof session.notesData === "string" ? JSON.parse(session.notesData) : session.notesData;
    } catch {
      parsedNotes = {};
    }
  }

  const isDaily = Boolean(puzzle?.date || session.puzzleKey?.startsWith("daily-") || puzzleKey.startsWith("daily-"));
  const date = puzzle?.date || session.date || (puzzleKey.startsWith("daily-") ? puzzleKey.replace("daily-", "") : null);
  const difficulty = puzzle?.difficulty || (isDaily ? "hard" : "medium");
  const elapsedSeconds = session.elapsedSeconds ?? 0;
  const mistakes = session.mistakes ?? 0;
  const hintsUsed = session.hintsUsed ?? 0;
  const leaderboardEligible = hintsUsed === 0 && mistakes === 0 && elapsedSeconds >= 15;

  let rank: number | null = null;
  if (session.completed && isDaily && date && leaderboardEligible) {
    try {
      const faster = await prisma.dailyCompletion.count({
        where: {
          date,
          hintsUsed: 0,
          mistakes: 0,
          elapsedSeconds: { gte: 15, lt: elapsedSeconds },
        },
      });
      rank = faster + 1;
    } catch {
      rank = null;
    }
  }

  return {
    sessionId: session.id,
    puzzleKey: session.puzzleKey || puzzleKey,
    currentGrid: session.currentGrid,
    notes: parsedNotes,
    elapsedSeconds,
    mistakes,
    hintsUsed,
    isStarted: session.isStarted,
    startedAt: session.startedAt,
    version: session.version,
    updatedAt: session.updatedAt,
    completed: Boolean(session.completed),
    completedAt: session.completedAt,
    xpAwarded: session.xpAwarded ?? 0,
    difficulty,
    date,
    isDaily,
    leaderboardEligible,
    rank,
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
      // Check DailyCompletion fallback
      if (puzzle.date) {
        const dailyCompletion = await prisma.dailyCompletion.findUnique({
          where: {
            user_daily_unique: {
              userId: sessionUser.id,
              date: puzzle.date,
            },
          },
        });
        if (dailyCompletion) {
          const eligible = dailyCompletion.hintsUsed === 0 && dailyCompletion.mistakes === 0 && dailyCompletion.elapsedSeconds >= 15;
          let rank: number | null = null;
          if (eligible) {
            try {
              const faster = await prisma.dailyCompletion.count({
                where: {
                  date: puzzle.date,
                  hintsUsed: 0,
                  mistakes: 0,
                  elapsedSeconds: { gte: 15, lt: dailyCompletion.elapsedSeconds },
                },
              });
              rank = faster + 1;
            } catch {}
          }
          return NextResponse.json({
            progress: {
              sessionId: dailyCompletion.id,
              puzzleKey,
              currentGrid: puzzle.initialGrid,
              notes: {},
              elapsedSeconds: dailyCompletion.elapsedSeconds,
              mistakes: dailyCompletion.mistakes,
              hintsUsed: dailyCompletion.hintsUsed,
              isStarted: true,
              startedAt: dailyCompletion.completedAt,
              version: 1,
              updatedAt: dailyCompletion.completedAt,
              completed: true,
              completedAt: dailyCompletion.completedAt,
              xpAwarded: dailyCompletion.xpAwarded,
              difficulty: puzzle.difficulty,
              date: puzzle.date,
              isDaily: true,
              leaderboardEligible: eligible,
              rank,
            },
          });
        }
      }
      return NextResponse.json({ progress: null }, { status: 200 });
    }

    const formatted = await formatProgress(session, puzzleKey, puzzle);
    return NextResponse.json({ progress: formatted });
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

    // 4. Validate notes format strictly
    let notesDataStr = "{}";
    if (notes !== undefined && notes !== null) {
      if (typeof notes !== "object" || Array.isArray(notes)) {
        return NextResponse.json({ error: "Invalid notes payload: must be an object" }, { status: 400 });
      }
      const rawEntries = Object.entries(notes);
      if (rawEntries.length > 81) {
        return NextResponse.json({ error: "Invalid notes payload: too many cell entries" }, { status: 400 });
      }
      const cleanNotes: Record<string, number[]> = {};
      for (const [key, val] of rawEntries) {
        const cellIdx = parseInt(key, 10);
        if (isNaN(cellIdx) || cellIdx < 0 || cellIdx > 80) {
          return NextResponse.json({ error: `Invalid cell index in notes: ${key}` }, { status: 400 });
        }
        if (!Array.isArray(val)) {
          return NextResponse.json({ error: `Invalid note values for cell ${key}: must be array` }, { status: 400 });
        }
        if (val.length > 9) {
          return NextResponse.json({ error: `Too many notes for cell ${key}` }, { status: 400 });
        }
        const noteNums = Array.from(new Set(val.map(Number))).filter((n) => Number.isInteger(n) && n >= 1 && n <= 9);
        if (noteNums.length > 0) {
          cleanNotes[String(cellIdx)] = noteNums.sort((a, b) => a - b);
        }
      }
      notesDataStr = JSON.stringify(cleanNotes);
      if (notesDataStr.length > 4096) {
        return NextResponse.json({ error: "Notes payload too large" }, { status: 400 });
      }
    }

    const elapsed = Math.min(864000, Math.max(0, Math.floor(Number(elapsedSeconds) || 0)));
    const mistakeCount = Math.min(1000, Math.max(0, Math.floor(Number(mistakes) || 0)));
    const hintCount = Math.min(81, Math.max(0, Math.floor(Number(hintsUsed) || 0)));

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
        const formatted = await formatProgress(existing, puzzleKey, puzzle);
        return NextResponse.json(
          {
            conflict: true,
            message: "Puzzle is already completed on server",
            progress: formatted,
          },
          { status: 409 }
        );
      }

      const clientExpectedVer = typeof expectedVersion === "number" ? expectedVersion : existing.version;

      // Monotonic guards
      const finalHints = Math.max(existing.hintsUsed, hintCount);
      const finalMistakes = Math.max(existing.mistakes, mistakeCount);
      const finalElapsed = Math.max(existing.elapsedSeconds, elapsed);

      // ATOMIC UPDATE with version condition
      const updateResult = await prisma.gameSession.updateMany({
        where: {
          id: existing.id,
          version: clientExpectedVer,
          completed: false,
        },
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

      if (updateResult.count === 0) {
        // Fetch canonical current state for conflict reconciliation
        const latestSession = await prisma.gameSession.findUnique({
          where: { id: existing.id },
        });

        const formatted = await formatProgress(latestSession, puzzleKey, puzzle);
        return NextResponse.json(
          {
            conflict: true,
            message: "Progress version mismatch or session completed",
            progress: formatted,
          },
          { status: 409 }
        );
      }

      const updated = await prisma.gameSession.findUnique({
        where: { id: existing.id },
      });

      const formatted = await formatProgress(updated, puzzleKey, puzzle);
      return NextResponse.json({
        success: true,
        progress: formatted,
      });
    }

    // Create new session safely
    try {
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

      const formatted = await formatProgress(created, puzzleKey, puzzle);
      return NextResponse.json({
        success: true,
        progress: formatted,
      });
    } catch {
      // If concurrent insert happened, fetch existing and return conflict
      const concurrentExisting = await prisma.gameSession.findUnique({
        where: {
          user_puzzle_session_unique: {
            userId: sessionUser.id,
            puzzleId: puzzle.id,
          },
        },
      });
      const formatted = await formatProgress(concurrentExisting, puzzleKey, puzzle);
      return NextResponse.json(
        {
          conflict: true,
          message: "Session already created",
          progress: formatted,
        },
        { status: 409 }
      );
    }
  } catch (err) {
    console.error("PUT progress error:", err);
    return NextResponse.json({ error: "Failed to save progress" }, { status: 500 });
  }
}
