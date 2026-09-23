import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getLevelFromXP } from "@/lib/xp/progression";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { guestProfile } = await req.json();
    if (!guestProfile || typeof guestProfile.xp !== "number") {
      return NextResponse.json({ error: "Invalid guest profile" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const mergedXP = user.xp + guestProfile.xp;
    const mergedCurrentStreak = Math.max(user.currentStreak, guestProfile.currentStreak || 0);
    const mergedLongestStreak = Math.max(user.longestStreak, guestProfile.longestStreak || 0);
    const mergedLevel = getLevelFromXP(mergedXP);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        xp: mergedXP,
        level: mergedLevel,
        currentStreak: mergedCurrentStreak,
        longestStreak: mergedLongestStreak,
        lastDailyDate: user.lastDailyDate || guestProfile.lastDailyDate || null,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        email: updated.email,
        displayName: updated.displayName,
        xp: updated.xp,
        level: updated.level,
        currentStreak: updated.currentStreak,
        longestStreak: updated.longestStreak,
      },
    });
  } catch (err) {
    console.error("Merge error:", err);
    return NextResponse.json({ error: "Failed to merge progress" }, { status: 500 });
  }
}
