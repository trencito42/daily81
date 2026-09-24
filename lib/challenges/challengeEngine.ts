import { prisma } from "@/lib/db/prisma";
import { generateSudoku, generateDailySudoku } from "@/lib/sudoku/generator";
import { isGridCompleteAndValid } from "@/lib/sudoku/validate";
import { getTodayDateString } from "@/lib/daily/streak";
import { Difficulty } from "@/lib/sudoku/types";
import { isBlocked, areFriends } from "@/lib/friends/friends";
import { awardXp } from "@/lib/xp/reward";

export type ChallengeMode = "duel" | "best_of_3" | "time_attack" | "sprint" | "daily_duel";

export interface CreateChallengeParams {
  challengerId: string;
  opponentId: string;
  mode: ChallengeMode;
  difficulty: Difficulty;
  timeLimitMinutes?: number; // 15, 30, 60
  sprintCount?: number; // 3, 5
  note?: string;
}

export async function createChallenge(params: CreateChallengeParams) {
  const { challengerId, opponentId, mode, difficulty, timeLimitMinutes, sprintCount, note } = params;

  if (challengerId === opponentId) {
    return { success: false, error: "You cannot challenge yourself." };
  }

  // Check blocks
  const blocked = await isBlocked(challengerId, opponentId);
  if (blocked) {
    return { success: false, error: "Unable to send challenge." };
  }

  // Check opponent settings
  const opponent = await prisma.user.findUnique({
    where: { id: opponentId },
    select: { id: true, allowChallengesFrom: true, displayName: true },
  });

  if (!opponent) {
    return { success: false, error: "Opponent not found." };
  }

  if (opponent.allowChallengesFrom === "none") {
    return { success: false, error: "This player is not accepting challenges." };
  }

  if (opponent.allowChallengesFrom === "friends") {
    const friends = await areFriends(challengerId, opponentId);
    if (!friends) {
      return { success: false, error: "This player only accepts challenges from friends." };
    }
  }

  const seed = `challenge-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Determine round count
  let roundCount = 1;
  if (mode === "best_of_3") roundCount = 3;
  if (mode === "sprint") roundCount = sprintCount === 5 ? 5 : 3;
  if (mode === "time_attack") roundCount = 15; // Pre-generate up to 15 puzzles for sequence

  const challenge = await prisma.challenge.create({
    data: {
      challengerId,
      opponentId,
      mode,
      difficulty,
      timeLimitMinutes: mode === "time_attack" ? timeLimitMinutes || 15 : null,
      sprintCount: mode === "sprint" ? (sprintCount === 5 ? 5 : 3) : null,
      note: note ? note.slice(0, 100) : null,
      seed,
      status: "pending",
      expiresAt,
    },
  });

  // Generate deterministic rounds
  if (mode === "daily_duel") {
    const today = getTodayDateString();
    const dailyPuzzle = generateDailySudoku(today, "hard");

    await prisma.challengeRound.create({
      data: {
        challengeId: challenge.id,
        roundNumber: 1,
        puzzleKey: dailyPuzzle.puzzleKey,
        initialGrid: dailyPuzzle.initialGrid,
        solutionGrid: dailyPuzzle.solutionGrid,
      },
    });

    // Check if challenger already solved today's daily puzzle legitimately
    const existingDaily = await prisma.dailyCompletion.findUnique({
      where: {
        user_daily_unique: {
          userId: challengerId,
          date: today,
        },
      },
    });

    if (existingDaily && existingDaily.hintsUsed === 0) {
      await prisma.challengeAttempt.create({
        data: {
          challengeId: challenge.id,
          userId: challengerId,
          roundNumber: 1,
          startedAt: existingDaily.completedAt,
          completedAt: existingDaily.completedAt,
          elapsedSeconds: existingDaily.elapsedSeconds,
          mistakes: existingDaily.mistakes,
          hintsUsed: 0,
          isCompleted: true,
        },
      });
    }
  } else {
    // Generate predetermined puzzles for each round
    for (let r = 1; r <= roundCount; r++) {
      const roundSeed = `${seed}-round-${r}`;
      const puzzle = generateSudoku(difficulty, roundSeed);

      await prisma.challengeRound.create({
        data: {
          challengeId: challenge.id,
          roundNumber: r,
          puzzleKey: `ch-${challenge.id}-r${r}`,
          initialGrid: puzzle.initialGrid,
          solutionGrid: puzzle.solutionGrid,
        },
      });
    }
  }

  // Create notification for opponent
  const challenger = await prisma.user.findUnique({
    where: { id: challengerId },
    select: { displayName: true },
  });

  const modeNames: Record<ChallengeMode, string> = {
    duel: "Sudoku Duel",
    best_of_3: "Best of 3 Duel",
    time_attack: `${timeLimitMinutes || 15}m Time Attack`,
    sprint: `${sprintCount || 3}-Puzzle Sprint`,
    daily_duel: "Daily Sudoku Duel",
  };

  await prisma.notification.create({
    data: {
      userId: opponentId,
      type: "challenge_received",
      title: "new challenge invite",
      message: `${challenger?.displayName || "A player"} challenged you to a ${modeNames[mode]} (${difficulty}).`,
      link: `/challenges/${challenge.id}`,
    },
  });

  return { success: true, challengeId: challenge.id };
}

export async function respondChallenge(challengeId: string, userId: string, action: "accept" | "decline" | "cancel") {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: {
      challenger: { select: { id: true, displayName: true } },
      opponent: { select: { id: true, displayName: true } },
    },
  });

  if (!challenge) {
    return { success: false, error: "Challenge not found." };
  }

  if (action === "cancel") {
    if (challenge.challengerId !== userId) {
      return { success: false, error: "Only the challenger can cancel this invitation." };
    }
    await prisma.challenge.update({
      where: { id: challengeId },
      data: { status: "cancelled" },
    });
    return { success: true, action: "cancelled" };
  }

  if (challenge.opponentId !== userId) {
    return { success: false, error: "Unauthorized response." };
  }

  if (challenge.status !== "pending") {
    return { success: false, error: `Challenge is already ${challenge.status}.` };
  }

  if (action === "decline") {
    await prisma.challenge.update({
      where: { id: challengeId },
      data: { status: "declined" },
    });
    return { success: true, action: "declined" };
  }

  // Accept
  await prisma.challenge.update({
    where: { id: challengeId },
    data: { status: "active" },
  });

  // If daily duel and opponent already solved today's puzzle, link it
  if (challenge.mode === "daily_duel") {
    const today = getTodayDateString();
    const existingDaily = await prisma.dailyCompletion.findUnique({
      where: {
        user_daily_unique: {
          userId,
          date: today,
        },
      },
    });

    if (existingDaily && existingDaily.hintsUsed === 0) {
      await prisma.challengeAttempt.upsert({
        where: {
          challenge_user_round_unique: {
            challengeId,
            userId,
            roundNumber: 1,
          },
        },
        update: {
          isCompleted: true,
          elapsedSeconds: existingDaily.elapsedSeconds,
          mistakes: existingDaily.mistakes,
          completedAt: existingDaily.completedAt,
        },
        create: {
          challengeId,
          userId,
          roundNumber: 1,
          startedAt: existingDaily.completedAt,
          completedAt: existingDaily.completedAt,
          elapsedSeconds: existingDaily.elapsedSeconds,
          mistakes: existingDaily.mistakes,
          hintsUsed: 0,
          isCompleted: true,
        },
      });

      // Check if duel is now complete
      await evaluateChallengeCompletion(challengeId);
    }
  }

  await prisma.notification.create({
    data: {
      userId: challenge.challengerId,
      type: "challenge_accepted",
      title: "challenge accepted",
      message: `${challenge.opponent.displayName} accepted your challenge!`,
      link: `/challenges/${challenge.id}`,
    },
  });

  return { success: true, action: "accepted" };
}

export async function startChallengeRound(params: {
  challengeId: string;
  userId: string;
  roundNumber: number;
}) {
  const { challengeId, userId, roundNumber } = params;

  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
  });

  if (!challenge || (challenge.status !== "active" && challenge.status !== "pending")) {
    return { success: false, error: "Challenge is not active." };
  }

  if (challenge.challengerId !== userId && challenge.opponentId !== userId) {
    return { success: false, error: "Unauthorized." };
  }

  const attempt = await prisma.challengeAttempt.upsert({
    where: {
      challenge_user_round_unique: {
        challengeId,
        userId,
        roundNumber,
      },
    },
    update: {
      startedAt: new Date(),
    },
    create: {
      challengeId,
      userId,
      roundNumber,
      startedAt: new Date(),
      isCompleted: false,
    },
  });

  return { success: true, startedAt: attempt.startedAt };
}

export async function submitChallengeRoundAttempt(params: {
  challengeId: string;
  userId: string;
  roundNumber: number;
  finalGrid: string;
  elapsedSeconds?: number;
  mistakes?: number;
  hintsUsed?: number;
}) {
  const { challengeId, userId, roundNumber, finalGrid, mistakes = 0, hintsUsed = 0 } = params;

  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: {
      rounds: { where: { roundNumber } },
    },
  });

  if (!challenge || (challenge.status !== "active" && challenge.status !== "pending")) {
    return { success: false, error: "Challenge is not active." };
  }

  if (challenge.challengerId !== userId && challenge.opponentId !== userId) {
    return { success: false, error: "You are not a participant in this challenge." };
  }

  const round = challenge.rounds[0];
  if (!round) {
    return { success: false, error: "Challenge round not found." };
  }

  // 1. Verify solution server-side
  const isValid = isGridCompleteAndValid(finalGrid);
  if (!isValid || finalGrid !== round.solutionGrid) {
    return { success: false, error: "Submitted solution is invalid." };
  }

  const existingAttempt = await prisma.challengeAttempt.findUnique({
    where: {
      challenge_user_round_unique: {
        challengeId,
        userId,
        roundNumber,
      },
    },
  });

  const now = new Date();
  const startTime = existingAttempt?.startedAt || now;
  const authoritativeElapsed = Math.max(1, Math.round((now.getTime() - startTime.getTime()) / 1000));

  // Anti-cheat flag: solve faster than 15s is flagged
  const isFlagged = authoritativeElapsed < 15;

  // 3. Upsert attempt record
  await prisma.challengeAttempt.upsert({
    where: {
      challenge_user_round_unique: {
        challengeId,
        userId,
        roundNumber,
      },
    },
    update: {
      completedAt: now,
      elapsedSeconds: authoritativeElapsed,
      mistakes: Math.max(0, mistakes),
      hintsUsed: Math.max(0, hintsUsed),
      finalGrid,
      isCompleted: true,
      isFlagged,
    },
    create: {
      challengeId,
      userId,
      roundNumber,
      startedAt: startTime,
      completedAt: now,
      elapsedSeconds: authoritativeElapsed,
      mistakes: Math.max(0, mistakes),
      hintsUsed: Math.max(0, hintsUsed),
      finalGrid,
      isCompleted: true,
      isFlagged,
    },
  });

  // Evaluate challenge completion
  const evalResult = await evaluateChallengeCompletion(challengeId);

  return { success: true, isComplete: evalResult.isComplete, winnerId: evalResult.winnerId };
}

export async function evaluateChallengeCompletion(challengeId: string) {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: {
      rounds: true,
      attempts: { where: { isCompleted: true } },
      challenger: { select: { id: true, displayName: true } },
      opponent: { select: { id: true, displayName: true } },
    },
  });

  if (!challenge || challenge.status === "completed") {
    return { isComplete: challenge?.status === "completed", winnerId: challenge?.winnerId };
  }

  const u1 = challenge.challengerId;
  const u2 = challenge.opponentId;

  // Disqualify flagged runs from winning
  const u1Attempts = challenge.attempts.filter((a) => a.userId === u1 && !a.isFlagged);
  const u2Attempts = challenge.attempts.filter((a) => a.userId === u2 && !a.isFlagged);

  const u1Flagged = challenge.attempts.some((a) => a.userId === u1 && a.isFlagged);
  const u2Flagged = challenge.attempts.some((a) => a.userId === u2 && a.isFlagged);

  const mode = challenge.mode as ChallengeMode;
  let isComplete = false;
  let winnerId: string | null = null;
  let isTie = false;

  // 1. DUEL & DAILY DUEL
  if (mode === "duel" || mode === "daily_duel") {
    const a1 = u1Attempts.find((a) => a.roundNumber === 1);
    const a2 = u2Attempts.find((a) => a.roundNumber === 1);

    if (a1 && a2) {
      isComplete = true;
      if (a1.elapsedSeconds < a2.elapsedSeconds) {
        winnerId = u1;
      } else if (a2.elapsedSeconds < a1.elapsedSeconds) {
        winnerId = u2;
      } else if (a1.mistakes < a2.mistakes) {
        winnerId = u1;
      } else if (a2.mistakes < a1.mistakes) {
        winnerId = u2;
      } else {
        isTie = true;
      }
    } else if (u1Flagged && a2) {
      isComplete = true;
      winnerId = u2;
    } else if (u2Flagged && a1) {
      isComplete = true;
      winnerId = u1;
    }
  }

  // 2. BEST OF 3
  if (mode === "best_of_3") {
    let u1RoundsWon = 0;
    let u2RoundsWon = 0;

    for (let r = 1; r <= 3; r++) {
      const a1 = u1Attempts.find((a) => a.roundNumber === r);
      const a2 = u2Attempts.find((a) => a.roundNumber === r);
      if (a1 && a2) {
        if (a1.elapsedSeconds < a2.elapsedSeconds) u1RoundsWon++;
        else if (a2.elapsedSeconds < a1.elapsedSeconds) u2RoundsWon++;
        else if (a1.mistakes < a2.mistakes) u1RoundsWon++;
        else if (a2.mistakes < a1.mistakes) u2RoundsWon++;
      }
    }

    if (u1RoundsWon >= 2) {
      isComplete = true;
      winnerId = u1;
    } else if (u2RoundsWon >= 2) {
      isComplete = true;
      winnerId = u2;
    } else if (u1Attempts.length === 3 && u2Attempts.length === 3) {
      isComplete = true;
      if (u1RoundsWon > u2RoundsWon) winnerId = u1;
      else if (u2RoundsWon > u1RoundsWon) winnerId = u2;
      else isTie = true;
    }
  }

  // 3. SPRINT
  if (mode === "sprint") {
    const totalRounds = challenge.sprintCount || 3;
    if (u1Attempts.length >= totalRounds && u2Attempts.length >= totalRounds) {
      isComplete = true;
      const totalTime1 = u1Attempts.reduce((acc, a) => acc + a.elapsedSeconds, 0);
      const totalTime2 = u2Attempts.reduce((acc, a) => acc + a.elapsedSeconds, 0);

      if (totalTime1 < totalTime2) winnerId = u1;
      else if (totalTime2 < totalTime1) winnerId = u2;
      else isTie = true;
    }
  }

  // 4. TIME ATTACK (Derive count strictly from completed valid DB rounds)
  if (mode === "time_attack") {
    const u1SolvedCount = u1Attempts.filter((a) => a.roundNumber >= 1).length;
    const u2SolvedCount = u2Attempts.filter((a) => a.roundNumber >= 1).length;

    const u1Finished = challenge.attempts.some((a) => a.userId === u1 && a.roundNumber === 0);
    const u2Finished = challenge.attempts.some((a) => a.userId === u2 && a.roundNumber === 0);

    if (u1Finished && u2Finished) {
      isComplete = true;
      if (u1SolvedCount > u2SolvedCount) winnerId = u1;
      else if (u2SolvedCount > u1SolvedCount) winnerId = u2;
      else isTie = true;
    }
  }

  if (isComplete) {
    await prisma.challenge.update({
      where: { id: challengeId },
      data: {
        status: "completed",
        winnerId,
        isTie,
      },
    });

    // Centrally award XP
    const reward1 = winnerId === u1 ? 25 : 10;
    const reward2 = winnerId === u2 ? 25 : 10;

    await Promise.all([
      awardXp({
        userId: u1,
        amount: reward1,
        reason: "challenge_completion",
        idempotencyKey: `challenge-${challengeId}-${u1}`,
      }),
      awardXp({
        userId: u2,
        amount: reward2,
        reason: "challenge_completion",
        idempotencyKey: `challenge-${challengeId}-${u2}`,
      }),
      prisma.notification.create({
        data: {
          userId: u1,
          type: "challenge_completed",
          title: "challenge finished",
          message: isTie
            ? `Your challenge vs ${challenge.opponent.displayName} resulted in a tie!`
            : winnerId === u1
            ? `You won the challenge against ${challenge.opponent.displayName}!`
            : `${challenge.opponent.displayName} won the challenge.`,
          link: `/challenges/${challengeId}`,
        },
      }),
      prisma.notification.create({
        data: {
          userId: u2,
          type: "challenge_completed",
          title: "challenge finished",
          message: isTie
            ? `Your challenge vs ${challenge.challenger.displayName} resulted in a tie!`
            : winnerId === u2
            ? `You won the challenge against ${challenge.challenger.displayName}!`
            : `${challenge.challenger.displayName} won the challenge.`,
          link: `/challenges/${challengeId}`,
        },
      }),
    ]);
  }

  return { isComplete, winnerId, isTie };
}

