import { prisma } from "@/lib/db/prisma";

export function getCanonicalPair(id1: string, id2: string): [string, string] {
  return id1 < id2 ? [id1, id2] : [id2, id1];
}

export async function areFriends(userId1: string, userId2: string): Promise<boolean> {
  const [u1, u2] = getCanonicalPair(userId1, userId2);
  const friendship = await prisma.friendship.findUnique({
    where: {
      canonical_friendship_unique: {
        userId1: u1,
        userId2: u2,
      },
    },
  });
  return Boolean(friendship);
}

export async function isBlocked(userA: string, userB: string): Promise<boolean> {
  const block = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: userA, blockedId: userB },
        { blockerId: userB, blockedId: userA },
      ],
    },
  });
  return Boolean(block);
}

export async function getFriends(userId: string) {
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ userId1: userId }, { userId2: userId }],
    },
    include: {
      user1: {
        select: {
          id: true,
          username: true,
          displayName: true,
          level: true,
          xp: true,
          currentStreak: true,
          longestStreak: true,
          lastDailyDate: true,
        },
      },
      user2: {
        select: {
          id: true,
          username: true,
          displayName: true,
          level: true,
          xp: true,
          currentStreak: true,
          longestStreak: true,
          lastDailyDate: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return friendships.map((f) => {
    const friend = f.userId1 === userId ? f.user2 : f.user1;
    return {
      friendshipId: f.id,
      createdAt: f.createdAt,
      user: friend,
    };
  });
}

export async function getFriendRequests(userId: string) {
  const [incoming, outgoing] = await Promise.all([
    prisma.friendRequest.findMany({
      where: {
        receiverId: userId,
        status: "pending",
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            level: true,
            xp: true,
            currentStreak: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.friendRequest.findMany({
      where: {
        senderId: userId,
        status: "pending",
      },
      include: {
        receiver: {
          select: {
            id: true,
            username: true,
            displayName: true,
            level: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { incoming, outgoing };
}

export async function sendFriendRequest(senderId: string, targetQuery: string) {
  const query = targetQuery.trim().toLowerCase();

  // Find target user by username or ID
  const targetUser = await prisma.user.findFirst({
    where: {
      OR: [
        { username: query },
        { id: query },
      ],
    },
  });

  if (!targetUser) {
    return { success: false, error: "Player not found." };
  }

  if (targetUser.id === senderId) {
    return { success: false, error: "You cannot add yourself as a friend." };
  }

  // Check if blocked in either direction
  const blocked = await isBlocked(senderId, targetUser.id);
  if (blocked) {
    return { success: false, error: "Unable to send friend request." };
  }

  // Check if privacy allows friend requests
  if (!targetUser.allowFriendRequests) {
    return { success: false, error: "This player is not accepting friend requests." };
  }

  // Check if already friends
  const alreadyFriends = await areFriends(senderId, targetUser.id);
  if (alreadyFriends) {
    return { success: false, error: "You are already friends with this player." };
  }

  // Check if reverse request is pending -> auto accept!
  const reversePending = await prisma.friendRequest.findFirst({
    where: {
      senderId: targetUser.id,
      receiverId: senderId,
      status: "pending",
    },
  });

  if (reversePending) {
    const [u1, u2] = getCanonicalPair(senderId, targetUser.id);
    await prisma.$transaction([
      prisma.friendRequest.update({
        where: { id: reversePending.id },
        data: { status: "accepted" },
      }),
      prisma.friendship.upsert({
        where: {
          canonical_friendship_unique: {
            userId1: u1,
            userId2: u2,
          },
        },
        update: {},
        create: {
          userId1: u1,
          userId2: u2,
        },
      }),
      prisma.notification.create({
        data: {
          userId: targetUser.id,
          type: "friend_accepted",
          title: "friend request accepted",
          message: `You and ${targetUser.displayName} are now friends.`,
          link: "/friends",
        },
      }),
    ]);

    return { success: true, acceptedImmediately: true };
  }

  // Check if existing request row exists
  const existing = await prisma.friendRequest.findUnique({
    where: {
      friend_request_pair_unique: {
        senderId,
        receiverId: targetUser.id,
      },
    },
  });

  if (existing) {
    if (existing.status === "pending") {
      return { success: false, error: "Friend request already pending." };
    }
    // Reactivate request if previously declined or cancelled
    await prisma.friendRequest.update({
      where: { id: existing.id },
      data: { status: "pending" },
    });
  } else {
    // Create new friend request
    await prisma.friendRequest.create({
      data: {
        senderId,
        receiverId: targetUser.id,
        status: "pending",
      },
    });
  }

  const senderUser = await prisma.user.findUnique({
    where: { id: senderId },
    select: { displayName: true },
  });

  try {
    await prisma.notification.create({
      data: {
        userId: targetUser.id,
        type: "friend_request",
        title: "new friend request",
        message: `${senderUser?.displayName || "A player"} sent you a friend request.`,
        link: "/friends",
      },
    });
  } catch {
    // Non-blocking notification
  }

  return { success: true, acceptedImmediately: false };
}

export async function respondFriendRequest(requestId: string, receiverId: string, action: "accept" | "decline") {
  const request = await prisma.friendRequest.findUnique({
    where: { id: requestId },
    include: {
      sender: { select: { id: true, displayName: true } },
      receiver: { select: { id: true, displayName: true } },
    },
  });

  if (!request || request.receiverId !== receiverId || request.status !== "pending") {
    return { success: false, error: "Friend request not found or already resolved." };
  }

  if (action === "decline") {
    await prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: "declined" },
    });
    return { success: true, action: "declined" };
  }

  // Accept
  const [u1, u2] = getCanonicalPair(request.senderId, request.receiverId);

  await prisma.$transaction([
    prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: "accepted" },
    }),
    prisma.friendship.upsert({
      where: {
        canonical_friendship_unique: {
          userId1: u1,
          userId2: u2,
        },
      },
      update: {},
      create: {
        userId1: u1,
        userId2: u2,
      },
    }),
    prisma.notification.create({
      data: {
        userId: request.senderId,
        type: "friend_accepted",
        title: "friend request accepted",
        message: `${request.receiver.displayName} accepted your friend request.`,
        link: `/u/${request.receiver.id}`,
      },
    }),
  ]);

  return { success: true, action: "accepted" };
}

export async function removeFriend(userId: string, targetFriendId: string) {
  const [u1, u2] = getCanonicalPair(userId, targetFriendId);

  await prisma.friendship.deleteMany({
    where: {
      userId1: u1,
      userId2: u2,
    },
  });

  return { success: true };
}

export async function blockUser(blockerId: string, targetUserId: string) {
  if (blockerId === targetUserId) {
    return { success: false, error: "You cannot block yourself." };
  }

  const [u1, u2] = getCanonicalPair(blockerId, targetUserId);

  await prisma.$transaction([
    // Remove friendship if exists
    prisma.friendship.deleteMany({
      where: { userId1: u1, userId2: u2 },
    }),
    // Delete any pending requests
    prisma.friendRequest.deleteMany({
      where: {
        OR: [
          { senderId: blockerId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: blockerId },
        ],
      },
    }),
    // Create block record
    prisma.userBlock.upsert({
      where: {
        user_block_unique: {
          blockerId,
          blockedId: targetUserId,
        },
      },
      update: {},
      create: {
        blockerId,
        blockedId: targetUserId,
      },
    }),
  ]);

  return { success: true };
}

export async function unblockUser(blockerId: string, targetUserId: string) {
  await prisma.userBlock.deleteMany({
    where: {
      blockerId,
      blockedId: targetUserId,
    },
  });
  return { success: true };
}

export async function getHeadToHeadStats(userId1: string, userId2: string) {
  // Find all completed challenges involving both players
  const challenges = await prisma.challenge.findMany({
    where: {
      status: "completed",
      OR: [
        { challengerId: userId1, opponentId: userId2 },
        { challengerId: userId2, opponentId: userId1 },
      ],
    },
    include: {
      attempts: true,
    },
  });

  let user1Wins = 0;
  let user2Wins = 0;
  let ties = 0;

  let totalTime1 = 0;
  let timeCount1 = 0;
  let totalTime2 = 0;
  let timeCount2 = 0;

  for (const c of challenges) {
    if (c.isTie) {
      ties++;
    } else if (c.winnerId === userId1) {
      user1Wins++;
    } else if (c.winnerId === userId2) {
      user2Wins++;
    }

    const a1 = c.attempts.find((a) => a.userId === userId1 && a.isCompleted);
    if (a1 && a1.elapsedSeconds > 0) {
      totalTime1 += a1.elapsedSeconds;
      timeCount1++;
    }

    const a2 = c.attempts.find((a) => a.userId === userId2 && a.isCompleted);
    if (a2 && a2.elapsedSeconds > 0) {
      totalTime2 += a2.elapsedSeconds;
      timeCount2++;
    }
  }

  const avgTime1 = timeCount1 > 0 ? Math.round(totalTime1 / timeCount1) : 0;
  const avgTime2 = timeCount2 > 0 ? Math.round(totalTime2 / timeCount2) : 0;

  return {
    totalMatches: challenges.length,
    user1Wins,
    user2Wins,
    ties,
    avgTime1,
    avgTime2,
  };
}

export async function searchUsers(query: string, currentUserId?: string) {
  if (!query || query.trim().length < 2) return [];

  const clean = query.trim().toLowerCase();

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: clean } },
        { displayName: { contains: clean } },
      ],
      NOT: currentUserId ? { id: currentUserId } : undefined,
    },
    take: 12,
    select: {
      id: true,
      username: true,
      displayName: true,
      level: true,
      xp: true,
      currentStreak: true,
    },
  });

  if (!currentUserId || users.length === 0) {
    return users.map((u) => ({
      ...u,
      isFriend: false,
      hasPendingRequest: false,
    }));
  }

  const userIds = users.map((u) => u.id);

  // Check friendship status
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { userId1: currentUserId, userId2: { in: userIds } },
        { userId2: currentUserId, userId1: { in: userIds } },
      ],
    },
  });

  const friendIdSet = new Set<string>();
  for (const f of friendships) {
    friendIdSet.add(f.userId1 === currentUserId ? f.userId2 : f.userId1);
  }

  // Check pending friend requests
  const pendingRequests = await prisma.friendRequest.findMany({
    where: {
      status: "pending",
      OR: [
        { senderId: currentUserId, receiverId: { in: userIds } },
        { receiverId: currentUserId, senderId: { in: userIds } },
      ],
    },
  });

  const pendingIdSet = new Set<string>();
  for (const r of pendingRequests) {
    pendingIdSet.add(r.senderId === currentUserId ? r.receiverId : r.senderId);
  }

  return users.map((u) => ({
    ...u,
    isFriend: friendIdSet.has(u.id),
    hasPendingRequest: pendingIdSet.has(u.id),
  }));
}
