import { NextResponse } from "next/server";
import { clearSessionCookie, getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}

export async function GET(req: Request) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ user: null });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        xp: true,
        level: true,
        currentStreak: true,
        longestStreak: true,
        lastDailyDate: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ user: null });
    }

    const solvedCount = await prisma.gameSession.count({
      where: {
        userId: user.id,
        completed: true,
      },
    });

    return NextResponse.json({
      user: {
        ...user,
        solvedCount,
      },
    });
  } catch (err) {
    console.error("Fetch user error:", err);
    return NextResponse.json({ user: null });
  }
}
