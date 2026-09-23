import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createChallenge, ChallengeMode } from "@/lib/challenges/challengeEngine";
import { Difficulty } from "@/lib/sudoku/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ authenticated: false, challenges: [] });
  }

  try {
    const challenges = await prisma.challenge.findMany({
      where: {
        OR: [{ challengerId: session.id }, { opponentId: session.id }],
      },
      include: {
        challenger: {
          select: { id: true, username: true, displayName: true, level: true },
        },
        opponent: {
          select: { id: true, username: true, displayName: true, level: true },
        },
        attempts: {
          select: {
            id: true,
            userId: true,
            roundNumber: true,
            elapsedSeconds: true,
            puzzlesSolved: true,
            mistakes: true,
            isCompleted: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    });

    // Check expiration for any pending/active challenges
    const now = new Date();
    const updatedChallenges = challenges.map((c) => {
      if ((c.status === "pending" || c.status === "active") && c.expiresAt < now) {
        return { ...c, status: "expired" };
      }
      return c;
    });

    return NextResponse.json({
      authenticated: true,
      challenges: updatedChallenges,
    });
  } catch (err) {
    console.error("Get challenges error:", err);
    return NextResponse.json({ error: "Failed to load challenges" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { opponentId, targetUsername, mode, difficulty, timeLimitMinutes, sprintCount, note } = body;

    const target = (targetUsername || opponentId || "").trim();

    if (!target || !mode || !difficulty) {
      return NextResponse.json({ error: "Opponent, mode, and difficulty are required" }, { status: 400 });
    }

    const opponent = await prisma.user.findFirst({
      where: {
        OR: [
          { username: target.toLowerCase() },
          { id: target },
        ],
      },
      select: { id: true },
    });

    if (!opponent) {
      return NextResponse.json({ error: "Opponent not found" }, { status: 404 });
    }

    const validModes: ChallengeMode[] = ["duel", "best_of_3", "time_attack", "sprint", "daily_duel"];
    const validDifficulties: Difficulty[] = ["easy", "medium", "hard", "expert"];

    if (!validModes.includes(mode)) {
      return NextResponse.json({ error: "Invalid challenge mode" }, { status: 400 });
    }

    if (!validDifficulties.includes(difficulty)) {
      return NextResponse.json({ error: "Invalid difficulty" }, { status: 400 });
    }

    const result = await createChallenge({
      challengerId: session.id,
      opponentId: opponent.id,
      mode,
      difficulty,
      timeLimitMinutes: timeLimitMinutes ? parseInt(timeLimitMinutes, 10) : undefined,
      sprintCount: sprintCount ? parseInt(sprintCount, 10) : undefined,
      note,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, challengeId: result.challengeId });
  } catch (err) {
    console.error("Create challenge error:", err);
    return NextResponse.json({ error: "Failed to create challenge" }, { status: 500 });
  }
}
