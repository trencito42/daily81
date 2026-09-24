import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getTodayDateString } from "@/lib/daily/streak";

export const dynamic = "force-dynamic";

function formatDisplayName(displayName?: string | null, id?: string): string {
  if (displayName && displayName.trim().length > 0) {
    const clean = displayName.trim();
    if (!clean.includes("@")) return clean;
    return clean.split("@")[0];
  }
  return id ? `player_${id.slice(-4)}` : "player";
}

function getStartOfWeekUTC(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  // Monday = 1, Sunday = 0 -> adjust so Monday is first day of week
  const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff, 0, 0, 0, 0));
  return start;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "daily";
    const scope = searchParams.get("scope") || "global"; // global | friends
    const dateParam = searchParams.get("date") || getTodayDateString();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    const session = await getSession(req);
    const currentUserId = session?.id || null;

    let friendUserIds: string[] | null = null;
    if (scope === "friends" && currentUserId) {
      const friendships = await prisma.friendship.findMany({
        where: {
          OR: [{ userId1: currentUserId }, { userId2: currentUserId }],
        },
        select: { userId1: true, userId2: true },
      });
      const ids = friendships.map((f) => (f.userId1 === currentUserId ? f.userId2 : f.userId1));
      friendUserIds = [...ids, currentUserId];
    }

    // 1. DAILY LEADERBOARD
    if (type === "daily") {
      // Find eligible completions (hintsUsed == 0, mistakes == 0, elapsedSeconds >= 15 for competitive integrity)
      const whereCondition: {
        date: string;
        hintsUsed: number;
        mistakes: number;
        elapsedSeconds: { gte: number };
        userId?: { in: string[] };
      } = {
        date: dateParam,
        hintsUsed: 0,
        mistakes: 0,
        elapsedSeconds: { gte: 15 },
      };

      if (friendUserIds) {
        whereCondition.userId = { in: friendUserIds };
      }

      const [totalCount, completions] = await Promise.all([
        prisma.dailyCompletion.count({ where: whereCondition }),
        prisma.dailyCompletion.findMany({
          where: whereCondition,
          orderBy: [
            { elapsedSeconds: "asc" },
            { completedAt: "asc" },
          ],
          skip,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                level: true,
              },
            },
          },
        }),
      ]);

      let userEntry: {
        rank: number;
        displayName: string;
        elapsedSeconds: number;
        mistakes: number;
        level: number;
      } | null = null;

      // If user is logged in, find their exact rank
      if (currentUserId) {
        const userCompletion = await prisma.dailyCompletion.findUnique({
          where: {
            user_daily_unique: {
              userId: currentUserId,
              date: dateParam,
            },
          },
          include: {
            user: { select: { id: true, displayName: true, level: true } },
          },
        });

        if (userCompletion && userCompletion.hintsUsed === 0 && userCompletion.mistakes === 0 && userCompletion.elapsedSeconds >= 15) {
          const betterCount = await prisma.dailyCompletion.count({
            where: {
              date: dateParam,
              hintsUsed: 0,
              mistakes: 0,
              elapsedSeconds: { gte: 15 },
              OR: [
                { elapsedSeconds: { lt: userCompletion.elapsedSeconds } },
                {
                  elapsedSeconds: userCompletion.elapsedSeconds,
                  completedAt: { lt: userCompletion.completedAt },
                },
              ],
            },
          });

          userEntry = {
            rank: betterCount + 1,
            displayName: formatDisplayName(userCompletion.user.displayName, userCompletion.user.id),
            elapsedSeconds: userCompletion.elapsedSeconds,
            mistakes: userCompletion.mistakes,
            level: userCompletion.user.level,
          };
        }
      }

      const entries = completions.map((c, idx) => ({
        rank: skip + idx + 1,
        userId: c.userId,
        username: c.user.username,
        displayName: formatDisplayName(c.user.displayName, c.user.id),
        level: c.user.level,
        elapsedSeconds: c.elapsedSeconds,
        mistakes: c.mistakes,
        isCurrentUser: currentUserId === c.userId,
        completedAt: c.completedAt,
      }));

      return NextResponse.json({
        type: "daily",
        date: dateParam,
        totalCount,
        page,
        limit,
        entries,
        userEntry,
      });
    }

    // 2. WEEKLY XP LEADERBOARD
    if (type === "weekly-xp") {
      const startOfWeek = getStartOfWeekUTC();

      const whereWeekly: { createdAt: { gte: Date }; userId?: { in: string[] } } = {
        createdAt: { gte: startOfWeek },
      };
      if (friendUserIds) {
        whereWeekly.userId = { in: friendUserIds };
      }

      // Aggregate XP events created in current week
      const weeklyEvents = await prisma.xpEvent.groupBy({
        by: ["userId"],
        where: whereWeekly,
        _sum: {
          amount: true,
        },
        orderBy: {
          _sum: {
            amount: "desc",
          },
        },
        take: limit,
      });

      const userIds = weeklyEvents.map((e: { userId: string }) => e.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true, displayName: true, level: true },
      });

      const userMap = new Map(users.map((u) => [u.id, u]));

      const entries = weeklyEvents.map((item: { userId: string; _sum: { amount: number | null } }, idx: number) => {
        const u = userMap.get(item.userId);
        return {
          rank: idx + 1,
          userId: item.userId,
          username: u?.username || null,
          displayName: formatDisplayName(u?.displayName, item.userId),
          level: u?.level || 1,
          weeklyXP: item._sum.amount || 0,
          isCurrentUser: currentUserId === item.userId,
        };
      });

      // User's own weekly rank
      let userEntry = null;
      if (currentUserId) {
        const userSum = await prisma.xpEvent.aggregate({
          where: {
            userId: currentUserId,
            createdAt: { gte: startOfWeek },
          },
          _sum: { amount: true },
        });

        const userXP = userSum._sum.amount || 0;
        if (userXP > 0) {
          const userObj = await prisma.user.findUnique({
            where: { id: currentUserId },
            select: { displayName: true, level: true },
          });

          // Count users with higher weekly XP
          const higherCount = await prisma.xpEvent.groupBy({
            by: ["userId"],
            where: {
              createdAt: { gte: startOfWeek },
              userId: friendUserIds ? { in: friendUserIds } : undefined,
            },
            _sum: { amount: true },
            having: {
              amount: {
                _sum: { gt: userXP },
              },
            },
          });

          userEntry = {
            rank: higherCount.length + 1,
            displayName: formatDisplayName(userObj?.displayName, currentUserId),
            level: userObj?.level || 1,
            weeklyXP: userXP,
          };
        }
      }

      return NextResponse.json({
        type: "weekly-xp",
        weekStart: startOfWeek.toISOString(),
        entries,
        userEntry,
      });
    }

    // 3. ALL-TIME XP LEADERBOARD
    if (type === "all-time-xp") {
      const whereAllTime: { xp: { gt: number }; id?: { in: string[] } } = {
        xp: { gt: 0 },
      };
      if (friendUserIds) {
        whereAllTime.id = { in: friendUserIds };
      }

      const [totalCount, users] = await Promise.all([
        prisma.user.count({ where: whereAllTime }),
        prisma.user.findMany({
          where: whereAllTime,
          orderBy: [{ xp: "desc" }, { level: "desc" }, { createdAt: "asc" }],
          skip,
          take: limit,
          select: {
            id: true,
            username: true,
            displayName: true,
            xp: true,
            level: true,
            createdAt: true,
          },
        }),
      ]);

      let userEntry = null;
      if (currentUserId) {
        const user = await prisma.user.findUnique({
          where: { id: currentUserId },
          select: { id: true, username: true, displayName: true, xp: true, level: true },
        });

        if (user && user.xp > 0) {
          const higherCount = await prisma.user.count({
            where: {
              id: friendUserIds ? { in: friendUserIds } : undefined,
              OR: [
                { xp: { gt: user.xp } },
                { xp: user.xp, level: { gt: user.level } },
              ],
            },
          });

          userEntry = {
            rank: higherCount + 1,
            displayName: formatDisplayName(user.displayName, user.id),
            level: user.level,
            xp: user.xp,
          };
        }
      }

      const entries = users.map((u, idx) => ({
        rank: skip + idx + 1,
        userId: u.id,
        username: u.username,
        displayName: formatDisplayName(u.displayName, u.id),
        level: u.level,
        xp: u.xp,
        isCurrentUser: currentUserId === u.id,
      }));

      return NextResponse.json({
        type: "all-time-xp",
        totalCount,
        page,
        limit,
        entries,
        userEntry,
      });
    }

    // 4. STREAK LEADERBOARD
    if (type === "streak") {
      const whereStreak: { currentStreak: { gt: number }; id?: { in: string[] } } = {
        currentStreak: { gt: 0 },
      };
      if (friendUserIds) {
        whereStreak.id = { in: friendUserIds };
      }

      const [totalCount, users] = await Promise.all([
        prisma.user.count({ where: whereStreak }),
        prisma.user.findMany({
          where: whereStreak,
          orderBy: [
            { currentStreak: "desc" },
            { longestStreak: "desc" },
            { xp: "desc" },
          ],
          skip,
          take: limit,
          select: {
            id: true,
            username: true,
            displayName: true,
            currentStreak: true,
            longestStreak: true,
            level: true,
          },
        }),
      ]);

      let userEntry = null;
      if (currentUserId) {
        const user = await prisma.user.findUnique({
          where: { id: currentUserId },
          select: {
            id: true,
            username: true,
            displayName: true,
            currentStreak: true,
            longestStreak: true,
            level: true,
          },
        });

        if (user && user.currentStreak > 0) {
          const higherCount = await prisma.user.count({
            where: {
              id: friendUserIds ? { in: friendUserIds } : undefined,
              OR: [
                { currentStreak: { gt: user.currentStreak } },
                {
                  currentStreak: user.currentStreak,
                  longestStreak: { gt: user.longestStreak },
                },
              ],
            },
          });

          userEntry = {
            rank: higherCount + 1,
            displayName: formatDisplayName(user.displayName, user.id),
            level: user.level,
            currentStreak: user.currentStreak,
            longestStreak: user.longestStreak,
          };
        }
      }

      const entries = users.map((u, idx) => ({
        rank: skip + idx + 1,
        userId: u.id,
        username: u.username,
        displayName: formatDisplayName(u.displayName, u.id),
        level: u.level,
        currentStreak: u.currentStreak,
        longestStreak: u.longestStreak,
        isCurrentUser: currentUserId === u.id,
      }));

      return NextResponse.json({
        type: "streak",
        totalCount,
        page,
        limit,
        entries,
        userEntry,
      });
    }

    return NextResponse.json({ error: "Invalid leaderboard type" }, { status: 400 });
  } catch (err) {
    console.error("Leaderboard API error:", err);
    return NextResponse.json({ error: "Failed to load leaderboard" }, { status: 500 });
  }
}
