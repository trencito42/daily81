import { NextResponse } from "next/server";
import { generateDailySudoku } from "@/lib/sudoku/generator";
import { getTodayDateString } from "@/lib/daily/streak";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date") || getTodayDateString();

    // Validate format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return NextResponse.json({ error: "Invalid date format. Expected YYYY-MM-DD." }, { status: 400 });
    }

    const puzzleKey = `daily-${dateParam}`;

    // Try finding existing stored puzzle in DB or generate deterministically
    let dbPuzzle = null;
    try {
      dbPuzzle = await prisma.puzzle.findUnique({
        where: { puzzleKey },
      });
    } catch {
      // If DB is offline/unreachable, fallback seamlessly to deterministic generator
    }

    if (dbPuzzle) {
      return NextResponse.json({
        puzzle: {
          id: dbPuzzle.id,
          puzzleKey: dbPuzzle.puzzleKey,
          date: dbPuzzle.date,
          difficulty: dbPuzzle.difficulty,
          initialGrid: dbPuzzle.initialGrid,
          solutionGrid: dbPuzzle.solutionGrid,
          seed: dbPuzzle.seed,
          givensCount: dbPuzzle.initialGrid.split("").filter((c) => c !== "0").length,
        },
      });
    }

    // Generate deterministically
    const puzzle = generateDailySudoku(dateParam, "hard");

    // Store in DB in background if DB is connected
    try {
      await prisma.puzzle.create({
        data: {
          puzzleKey: puzzle.puzzleKey,
          date: dateParam,
          difficulty: puzzle.difficulty,
          initialGrid: puzzle.initialGrid,
          solutionGrid: puzzle.solutionGrid,
          seed: puzzle.seed,
        },
      });
    } catch {
      // Ignore if already created concurrently
    }

    return NextResponse.json({ puzzle });
  } catch (err) {
    console.error("Daily puzzle error:", err);
    return NextResponse.json({ error: "Could not generate daily puzzle" }, { status: 500 });
  }
}
