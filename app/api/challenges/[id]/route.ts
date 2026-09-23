import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
  respondChallenge,
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

    // Check expiration
    if ((challenge.status === "pending" || challenge.status === "active") && challenge.expiresAt < new Date()) {
      await prisma.challenge.update({
        where: { id: challengeId },
        data: { status: "expired" },
      });
      challenge.status = "expired";
    }

    const currentUserId = session?.id || null;
    const isParticipant = currentUserId === challenge.challengerId || currentUserId === challenge.opponentId;

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

    // 2. Submit Round Attempt
    if (action === "submit_attempt") {
      const { roundNumber, finalGrid, elapsedSeconds, mistakes, hintsUsed } = body;

      if (!finalGrid || typeof roundNumber !== "number") {
        return NextResponse.json({ error: "Invalid attempt data" }, { status: 400 });
      }

      const res = await submitChallengeRoundAttempt({
        challengeId,
        userId: session.id,
        roundNumber,
        finalGrid,
        elapsedSeconds: Number(elapsedSeconds) || 0,
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

    // 3. Time Attack Finish
    if (action === "time_attack_finish") {
      const { puzzlesSolved, totalElapsedSeconds, totalMistakes } = body;

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
          puzzlesSolved: Number(puzzlesSolved) || 0,
          elapsedSeconds: Number(totalElapsedSeconds) || 0,
          mistakes: Number(totalMistakes) || 0,
          completedAt: new Date(),
        },
        create: {
          challengeId,
          userId: session.id,
          roundNumber: 0,
          isCompleted: true,
          puzzlesSolved: Number(puzzlesSolved) || 0,
          elapsedSeconds: Number(totalElapsedSeconds) || 0,
          mistakes: Number(totalMistakes) || 0,
          completedAt: new Date(),
        },
      });

      const evalResult = await evaluateChallengeCompletion(challengeId);
      return NextResponse.json({ success: true, isComplete: evalResult.isComplete, winnerId: evalResult.winnerId });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Challenge action error:", err);
    return NextResponse.json({ error: "Failed to process challenge action" }, { status: 500 });
  }
}
