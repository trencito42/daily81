import { NextResponse } from "next/server";
import { getPuzzleByKey } from "@/lib/puzzles/puzzleService";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
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
