import { NextResponse } from "next/server";
import { generateSudoku } from "@/lib/sudoku/generator";
import { Difficulty } from "@/lib/sudoku/types";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const difficultyParam = (searchParams.get("difficulty") || "medium").toLowerCase() as Difficulty;

    const validDifficulties: Difficulty[] = ["easy", "medium", "hard", "expert"];
    const difficulty = validDifficulties.includes(difficultyParam) ? difficultyParam : "medium";

    const puzzle = generateSudoku(difficulty);

    // Save to DB if available
    try {
      await prisma.puzzle.create({
        data: {
          puzzleKey: puzzle.puzzleKey,
          date: null,
          difficulty: puzzle.difficulty,
          initialGrid: puzzle.initialGrid,
          solutionGrid: puzzle.solutionGrid,
          seed: puzzle.seed,
        },
      });
    } catch {
      // Offline fallback
    }

    return NextResponse.json({ puzzle });
  } catch (err) {
    console.error("Generate puzzle error:", err);
    return NextResponse.json({ error: "Could not generate new puzzle" }, { status: 500 });
  }
}
