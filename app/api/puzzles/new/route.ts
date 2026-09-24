import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { Difficulty } from "@/lib/sudoku/types";
import { getOrCreatePlayPuzzle } from "@/lib/puzzles/puzzleService";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/security/rateLimit";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getSession(req);
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({
      key: `puzzles-new:${session?.id || clientIp}`,
      maxRequests: 20,
      windowSeconds: 60,
    });
    if (!rl.allowed) {
      return rateLimitResponse("Too many puzzle requests. Please slow down.", rl.resetSeconds);
    }

    const { searchParams } = new URL(req.url);
    const difficultyParam = (searchParams.get("difficulty") || "medium").toLowerCase() as Difficulty;

    const validDifficulties: Difficulty[] = ["easy", "medium", "hard", "expert"];
    const difficulty = validDifficulties.includes(difficultyParam) ? difficultyParam : "medium";

    // Entropy is always generated server-side. Client seed param is INTENTIONALLY REMOVED.
    const serverSeed = randomBytes(16).toString("hex");

    const { publicPuzzle } = await getOrCreatePlayPuzzle(difficulty, serverSeed);

    return NextResponse.json({ puzzle: publicPuzzle });
  } catch (err) {
    console.error("Generate puzzle error:", err);
    return NextResponse.json({ error: "Could not generate new puzzle" }, { status: 500 });
  }
}
