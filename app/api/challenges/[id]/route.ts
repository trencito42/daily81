import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
  respondChallenge,
  startChallengeRound,
  submitChallengeRoundAttempt,
  evaluateChallengeCompletion,
} from "@/lib/challenges/challengeEngine";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  const resolvedParams = await params;
  const challengeId = resolvedParams.id;
  const session = await getSession(req);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        challenger: {
          select: { id: true, username: true, displayName: true, level: true, xp: true },
        },
        opponent: {
          select: { id: true, username: true, displayName: true, level: true, xp: true },
        },
        rounds: {
          select: {
            id: true,
            roundNumber: true,
            puzzleKey: true,
            initialGrid: true,
            // DO NOT expose solutionGrid to client!
          },
          orderBy: { roundNumber: "asc" },
        },
        attempts: {
          select: {
            id: true,
            userId: true,
            roundNumber: true,
            elapsedSeconds: true,
            puzzlesSolved: true,
            mistakes: true,
            hintsUsed: true,
            isCompleted: true,
            startedAt: true,
            completedAt: true,
          },
        },
      },
    });

    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    const currentUserId = session.id;
    const isParticipant = currentUserId === challenge.challengerId || currentUserId === challenge.opponentId;

    if (!isParticipant) {
      return NextResponse.json({ error: "Access denied. Private challenge." }, { status: 403 });
    }

    // Check expiration and persist if expired
    if ((challenge.status === "pending" || challenge.status === "active") && challenge.expiresAt < new Date()) {
      await prisma.challenge.update({
        where: { id: challengeId },
        data: { status: "expired" },
      });
      challenge.status = "expired";
    }

    return NextResponse.json({
      challenge,
      isParticipant,
      currentUserId,
    });
  } catch (err) {
    console.error("Fetch challenge error:", err);
    return NextResponse.json({ error: "Failed to fetch challenge" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: RouteParams) {
  const resolvedParams = await params;
  const challengeId = resolvedParams.id;
  const session = await getSession(req);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    // 1. Accept / Decline / Cancel Challenge
    if (action === "respond") {
      const { responseAction } = body;
      const res = await respondChallenge(challengeId, session.id, responseAction);
      if (!res.success) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, action: res.action });
    }

    // 2. Start Round (records server start time)
    if (action === "start_round") {
      const { roundNumber } = body;
      const res = await startChallengeRound({
        challengeId,
        userId: session.id,
        roundNumber: Number(roundNumber) || 1,
      });
      if (!res.success) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, startedAt: res.startedAt, isCompleted: res.isCompleted });
    }

    // 3. Submit Round Attempt
    if (action === "submit_attempt") {
      const { roundNumber, finalGrid, mistakes, hintsUsed } = body;

      if (!finalGrid || typeof roundNumber !== "number") {
        return NextResponse.json({ error: "Invalid attempt data: finalGrid and roundNumber are required" }, { status: 400 });
      }

      const res = await submitChallengeRoundAttempt({
        challengeId,
        userId: session.id,
        roundNumber,
        finalGrid,
        mistakes: Number(mistakes) || 0,
        hintsUsed: Number(hintsUsed) || 0,
      });

      if (!res.success) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        isComplete: res.isComplete,
        winnerId: res.winnerId,
      });
    }

    // 4. Time Attack Finish (Derives solve count strictly from valid DB rounds)
    if (action === "time_attack_finish") {
      const completedRounds = await prisma.challengeAttempt.findMany({
        where: {
          challengeId,
          userId: session.id,
          roundNumber: { gte: 1 },
          isCompleted: true,
          isFlagged: false,
        },
      });

      const solvedCount = completedRounds.length;
      const totalElapsed = completedRounds.reduce((acc, r) => acc + r.elapsedSeconds, 0);
      const totalMistakes = completedRounds.reduce((acc, r) => acc + r.mistakes, 0);

      await prisma.challengeAttempt.upsert({
        where: {
          challenge_user_round_unique: {
            challengeId,
            userId: session.id,
            roundNumber: 0,
          },
        },
        update: {
          isCompleted: true,
          puzzlesSolved: solvedCount,
          elapsedSeconds: totalElapsed,
          mistakes: totalMistakes,
          completedAt: new Date(),
        },
        create: {
          challengeId,
          userId: session.id,
          roundNumber: 0,
          isCompleted: true,
          puzzlesSolved: solvedCount,
          elapsedSeconds: totalElapsed,
          mistakes: totalMistakes,
          completedAt: new Date(),
        },
      });

      const evalResult = await evaluateChallengeCompletion(challengeId);
      return NextResponse.json({
        success: true,
        isComplete: evalResult.isComplete,
        winnerId: evalResult.winnerId,
        puzzlesSolved: solvedCount,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Challenge action error:", err);
    return NextResponse.json({ error: "Failed to process challenge action" }, { status: 500 });
  }
}
