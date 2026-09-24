import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        xp: user.xp,
        level: user.level,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
      },
    });
  } catch (err) {
    console.error("Merge error:", err);
    return NextResponse.json({ error: "Failed to merge progress" }, { status: 500 });
  }
}
