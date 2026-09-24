import { NextResponse } from "next/server";
import { Difficulty } from "@/lib/sudoku/types";
import { getOrCreatePlayPuzzle } from "@/lib/puzzles/puzzleService";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const difficultyParam = (searchParams.get("difficulty") || "medium").toLowerCase() as Difficulty;
    const seed = searchParams.get("seed") || undefined;

    const validDifficulties: Difficulty[] = ["easy", "medium", "hard", "expert"];
    const difficulty = validDifficulties.includes(difficultyParam) ? difficultyParam : "medium";

    const { publicPuzzle } = await getOrCreatePlayPuzzle(difficulty, seed);

    return NextResponse.json({ puzzle: publicPuzzle });
  } catch (err) {
    console.error("Generate puzzle error:", err);
    return NextResponse.json({ error: "Could not generate new puzzle" }, { status: 500 });
  }
}

