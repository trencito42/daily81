import { prisma } from "@/lib/db/prisma";
import { getLevelFromXP } from "./progression";
import { logUserActivity } from "@/lib/activity/activity";

export interface AwardXpParams {
  userId: string;
  amount: number;
  reason: string;
  idempotencyKey?: string;
  gameSessionId?: string;
}

export interface AwardXpResult {
  success: boolean;
  xp: number;
  level: number;
  xpAwarded: number;
  isNewLevel: boolean;
  alreadyAwarded: boolean;
}

/**
 * Centrally and idempotently awards XP to an authenticated user.
 * Guarantees that user.xp and user.level stay 100% in sync as single source of truth.
 */
export async function awardXp(params: AwardXpParams): Promise<AwardXpResult> {
  const { userId, amount, reason, idempotencyKey, gameSessionId } = params;

  if (amount <= 0) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true },
    });
    return {
      success: true,
      xp: user?.xp || 0,
      level: user?.level || 1,
      xpAwarded: 0,
      isNewLevel: false,
      alreadyAwarded: false,
    };
  }

  // 1. Check idempotency if key is provided
  if (idempotencyKey) {
    const existing = await prisma.xpEvent.findUnique({
      where: { idempotencyKey },
      include: { user: { select: { xp: true, level: true } } },
    });

    if (existing) {
      return {
        success: true,
        xp: existing.user.xp,
        level: existing.user.level,
        xpAwarded: 0,
        isNewLevel: false,
        alreadyAwarded: true,
      };
    }
  }

  // 2. Perform atomic transaction
  const result = await prisma.$transaction(async (tx) => {
    // Re-check idempotency inside transaction for race-condition prevention
    if (idempotencyKey) {
      const existingTx = await tx.xpEvent.findUnique({
        where: { idempotencyKey },
        include: { user: { select: { xp: true, level: true } } },
      });
      if (existingTx) {
        return {
          success: true,
          xp: existingTx.user.xp,
          level: existingTx.user.level,
          xpAwarded: 0,
          isNewLevel: false,
          alreadyAwarded: true,
        };
      }
    }

    const currentUser = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, xp: true, level: true },
    });

    if (!currentUser) {
      throw new Error("User not found for XP award");
    }

    const prevLevel = currentUser.level;
    const newXp = currentUser.xp + amount;
    const newLevel = getLevelFromXP(newXp);
    const isNewLevel = newLevel > prevLevel;

    // Create XP event
    await tx.xpEvent.create({
      data: {
        userId,
        amount,
        reason,
        idempotencyKey: idempotencyKey || null,
        gameSessionId: gameSessionId || null,
      },
    });

    // Update user XP and level atomically
    await tx.user.update({
      where: { id: userId },
      data: {
        xp: newXp,
        level: newLevel,
      },
    });

    return {
      success: true,
      xp: newXp,
      level: newLevel,
      xpAwarded: amount,
      isNewLevel,
      alreadyAwarded: false,
    };
  });

  if (result.isNewLevel) {
    await logUserActivity(userId, "level_up", { newLevel: result.level });
  }

  return result;
}
