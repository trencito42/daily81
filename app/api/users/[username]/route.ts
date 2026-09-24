import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { areFriends, isBlocked, getHeadToHeadStats } from "@/lib/friends/friends";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ username: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  const resolvedParams = await params;
  const username = resolvedParams.username.toLowerCase().trim();
  const session = await getSession(req);
  const currentUserId = session?.id || null;

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { id: username },
        ],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        level: true,
        xp: true,
        currentStreak: true,
        longestStreak: true,
        lastDailyDate: true,
        statsVisibility: true,
        activityVisibility: true,
        allowChallengesFrom: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isSelf = currentUserId === user.id;

    // Check relationship if viewer is logged in
    let isFriend = false;
    let blocked = false;
    let pendingRequest: "incoming" | "outgoing" | null = null;
    let headToHead = null;

    if (currentUserId && !isSelf) {
      blocked = await isBlocked(currentUserId, user.id);
      if (blocked) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      isFriend = await areFriends(currentUserId, user.id);

      const request = await prisma.friendRequest.findFirst({
        where: {
          OR: [
            { senderId: currentUserId, receiverId: user.id, status: "pending" },
            { senderId: user.id, receiverId: currentUserId, status: "pending" },
          ],
        },
      });

      if (request) {
        pendingRequest = request.senderId === currentUserId ? "outgoing" : "incoming";
      }

      headToHead = await getHeadToHeadStats(currentUserId, user.id);
    }

    // Determine if detailed stats are visible
    const canViewStats =
      isSelf ||
      user.statsVisibility === "public" ||
      (user.statsVisibility === "friends" && isFriend);

    let stats = null;
    if (canViewStats) {
      const [completions, sessions] = await Promise.all([
        prisma.dailyCompletion.findMany({
          where: { userId: user.id },
          select: { id: true },
        }),
        prisma.gameSession.findMany({
          where: { userId: user.id, completed: true },
          include: { puzzle: { select: { difficulty: true } } },
        }),
      ]);

      const totalSolved = sessions.length;
      let totalTime = 0;
      let bestTime = 0;
      const difficultyCounts = { easy: 0, medium: 0, hard: 0, expert: 0 };

      sessions.forEach((s) => {
        totalTime += s.elapsedSeconds;
        if (bestTime === 0 || (s.elapsedSeconds > 0 && s.elapsedSeconds < bestTime)) {
          bestTime = s.elapsedSeconds;
        }
        const diff = (s.puzzle.difficulty || "medium") as keyof typeof difficultyCounts;
        if (difficultyCounts[diff] !== undefined) {
          difficultyCounts[diff] += 1;
        }
      });

      stats = {
        totalSolved,
        averageTimeSeconds: totalSolved > 0 ? Math.round(totalTime / totalSolved) : 0,
        bestTimeSeconds: bestTime,
        difficultyCounts,
        dailyPuzzlesCompleted: completions.length,
      };
    }

    // Compute ranks
    const [xpRank, streakRank] = await Promise.all([
      prisma.user.count({ where: { xp: { gt: user.xp } } }),
      prisma.user.count({ where: { currentStreak: { gt: user.currentStreak } } }),
    ]);

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        level: user.level,
        xp: user.xp,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        createdAt: user.createdAt,
        statsVisibility: user.statsVisibility,
        allowChallengesFrom: user.allowChallengesFrom,
        xpRank: xpRank + 1,
        streakRank: streakRank + 1,
      },
      stats,
      relationship: {
        isSelf,
        isFriend,
        pendingRequest,
        headToHead,
      },
    });
  } catch (err) {
    console.error("Fetch user profile error:", err);
    return NextResponse.json({ error: "Failed to fetch user profile" }, { status: 500 });
  }
}
