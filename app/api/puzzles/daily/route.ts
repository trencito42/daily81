import { NextResponse } from "next/server";
import { getOrCreateDailyPuzzle } from "@/lib/puzzles/puzzleService";
import { getTodayDateString } from "@/lib/daily/streak";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date") || getTodayDateString();

    // Validate format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return NextResponse.json({ error: "Invalid date format. Expected YYYY-MM-DD." }, { status: 400 });
    }

    const { publicPuzzle } = await getOrCreateDailyPuzzle(dateParam);
    return NextResponse.json({ puzzle: publicPuzzle });
  } catch (err: any) {
    console.error("Daily puzzle error:", err);
    const status = err.message?.includes("future") ? 400 : 500;
    return NextResponse.json({ error: err.message || "Could not generate daily puzzle" }, { status });
  }
}
