import { prisma } from "@/lib/db/prisma";

export async function logUserActivity(userId: string, type: "daily_solved" | "level_up" | "streak_milestone" | "challenge_won", metadata?: Record<string, unknown>) {
  try {
    await prisma.userActivity.create({
      data: {
        userId,
        type,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (err) {
    console.warn("Log activity error:", err);
  }
}

export async function getFriendsActivity(userId: string, limit: number = 15) {
  // 1. Get friend IDs
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ userId1: userId }, { userId2: userId }],
    },
    select: { userId1: true, userId2: true },
  });

  const friendIds = friendships.map((f) => (f.userId1 === userId ? f.userId2 : f.userId1));
  if (friendIds.length === 0) return [];

  // 2. Fetch recent public activities of friends
  const activities = await prisma.userActivity.findMany({
    where: {
      userId: { in: friendIds },
      user: {
        activityVisibility: { in: ["public", "friends"] },
      },
    },
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
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return activities.map((a) => ({
    id: a.id,
    userId: a.userId,
    user: a.user,
    type: a.type,
    metadata: a.metadata ? JSON.parse(a.metadata) : null,
    createdAt: a.createdAt,
  }));
}
