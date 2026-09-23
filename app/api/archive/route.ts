import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getTodayDateString } from "@/lib/daily/streak";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const todayStr = getTodayDateString();
    const [todayYear, todayMonth] = todayStr.split("-");

    const year = searchParams.get("year") || todayYear;
    const month = (searchParams.get("month") || todayMonth).padStart(2, "0");

    const session = await getSession(req);
    let completedDates: string[] = [];

    if (session) {
      try {
        const completions = await prisma.dailyCompletion.findMany({
          where: {
            userId: session.id,
            date: {
              startsWith: `${year}-${month}`,
            },
          },
          select: {
            date: true,
            elapsedSeconds: true,
            mistakes: true,
          },
        });
        completedDates = completions.map((c) => c.date);
      } catch {
        // Fallback
      }
    }

    const daysInMonth = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
    const days = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, "0");
      const fullDate = `${year}-${month}-${dayStr}`;
      const isCompleted = completedDates.includes(fullDate);
      const isToday = fullDate === todayStr;
      const isFuture = fullDate > todayStr;

      days.push({
        day: d,
        date: fullDate,
        isCompleted,
        isToday,
        isFuture,
        difficulty: "hard",
      });
    }

    return NextResponse.json({
      year,
      month,
      todayStr,
      days,
      completedDates,
    });
  } catch (err) {
    console.error("Archive error:", err);
    return NextResponse.json({ error: "Failed to load archive" }, { status: 500 });
  }
}
