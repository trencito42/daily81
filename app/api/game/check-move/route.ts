import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getPuzzleByKey } from "@/lib/puzzles/puzzleService";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getSession(req);
    const body = await req.json();
    const puzzleKey = body.puzzleKey;
    const cellIndex = typeof body.cellIndex === "number" ? body.cellIndex : body.index;
    const value = typeof body.value === "number" ? body.value : body.number;

    if (!puzzleKey || typeof cellIndex !== "number" || typeof value !== "number") {
      return NextResponse.json({ error: "Invalid move check payload" }, { status: 400 });
    }

    if (cellIndex < 0 || cellIndex > 80 || value < 1 || value > 9) {
      return NextResponse.json({ error: "Cell or value out of bounds" }, { status: 400 });
    }

    const puzzle = await getPuzzleByKey(puzzleKey);
    if (!puzzle) {
      return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
    }

    const expectedValue = parseInt(puzzle.solutionGrid[cellIndex], 10);
    const correct = expectedValue === value;

    // For authenticated users: track mistakes server-side on active GameSession
    if (session) {
      const existingSession = await prisma.gameSession.findUnique({
        where: {
          user_puzzle_session_unique: {
            userId: session.id,
            puzzleId: puzzle.id,
          },
        },
      });

      if (existingSession && !existingSession.completed) {
        if (!correct) {
          await prisma.gameSession.update({
            where: { id: existingSession.id },
            data: {
              mistakes: { increment: 1 },
              version: { increment: 1 },
            },
          });
        }
      }
    }

    return NextResponse.json({
      correct,
      valid: correct,
    });
  } catch (err) {
    console.error("Check move error:", err);
    return NextResponse.json({ error: "Failed to check move" }, { status: 500 });
  }
}

