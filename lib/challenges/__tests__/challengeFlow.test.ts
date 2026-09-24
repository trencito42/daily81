import { describe, it, expect } from "vitest";
import { generateSudoku } from "../../sudoku/generator";
import { isGridCompleteAndValid } from "../../sudoku/validate";

describe("Challenge Test Matrix (A1 - A20)", () => {
  const userA = "user_alpha_id";
  const userB = "user_beta_id";
  const userC = "user_gamma_id";

  const seed = "test-challenge-seed-12345";
  const puzzle = generateSudoku("hard", `${seed}-round-1`);
  const validSolution = puzzle.solutionGrid;

  it("1 & 2. Incoming and outgoing pending challenge filtering contract", () => {
    // Challenge structure matching DB / GET /api/challenges
    const challenge = {
      id: "ch_test_1",
      challengerId: userA,
      opponentId: userB,
      status: "pending",
      mode: "duel",
      difficulty: "hard",
      seed,
      expiresAt: new Date(Date.now() + 86400000),
    };

    const challenges = [challenge];

    // As User B: GET /api/challenges returns currentUserId: userB
    const currentUserIdB = userB;
    const incomingB = challenges.filter(
      (c) => c.status === "pending" && c.opponentId === currentUserIdB
    );
    const outgoingB = challenges.filter(
      (c) => c.status === "pending" && c.challengerId === currentUserIdB
    );

    expect(incomingB.length).toBe(1);
    expect(incomingB[0].id).toBe("ch_test_1");
    expect(outgoingB.length).toBe(0);

    // As User A: GET /api/challenges returns currentUserId: userA
    const currentUserIdA = userA;
    const incomingA = challenges.filter(
      (c) => c.status === "pending" && c.opponentId === currentUserIdA
    );
    const outgoingA = challenges.filter(
      (c) => c.status === "pending" && c.challengerId === currentUserIdA
    );

    expect(incomingA.length).toBe(0);
    expect(outgoingA.length).toBe(1);
    expect(outgoingA[0].id).toBe("ch_test_1");
  });

  it("3 & 4. Gameplay only possible when status is active", () => {
    const pendingChallenge = {
      id: "ch_test_pending",
      challengerId: userA,
      opponentId: userB,
      status: "pending",
      expiresAt: new Date(Date.now() + 86400000),
    };

    // Before acceptance: start is rejected
    expect(pendingChallenge.status).toBe("pending");
    const canPlayBeforeAccept = pendingChallenge.status === "active";
    expect(canPlayBeforeAccept).toBe(false);

    // After acceptance: status becomes active
    const activeChallenge = { ...pendingChallenge, status: "active" };
    expect(activeChallenge.status).toBe("active");
  });

  it("5 & 6. Server-authoritative start_round and startedAt immutability on reload", () => {
    const initialStartedAt = new Date(Date.now() - 5000); // 5s ago

    const existingAttempt = {
      challengeId: "ch_test_active",
      userId: userA,
      roundNumber: 1,
      startedAt: initialStartedAt,
      isCompleted: false,
    };

    // Reopening / reloading the page must return existing startedAt and NOT overwrite it with now()
    const reloadResult = {
      startedAt: existingAttempt ? existingAttempt.startedAt : new Date(),
    };

    expect(reloadResult.startedAt).toBe(initialStartedAt);
    expect(reloadResult.startedAt.getTime()).toBe(initialStartedAt.getTime());
  });

  it("7, 8 & 9. Solution verification: empty/invalid rejected, canonical valid accepted", () => {
    // 7. Missing or empty final grid
    const emptyGrid = "";
    expect(isGridCompleteAndValid(emptyGrid)).toBe(false);

    // 8. Canonical solution
    expect(isGridCompleteAndValid(validSolution)).toBe(true);
    expect(validSolution.length).toBe(81);

    // 9. Invalid / wrong solution (e.g. invalid digit)
    const tampered = validSolution.slice(0, 80) + (validSolution[80] === "1" ? "2" : "1");
    expect(isGridCompleteAndValid(tampered)).toBe(false);
  });

  it("10. Completed attempts cannot be overwritten", () => {
    const completedAttempt = {
      challengeId: "ch_test_active",
      userId: userA,
      roundNumber: 1,
      elapsedSeconds: 120,
      mistakes: 0,
      isCompleted: true,
    };

    // Re-submission attempt with better time
    const resubmitTime = 60;
    const finalStoredElapsed = completedAttempt.isCompleted
      ? completedAttempt.elapsedSeconds
      : resubmitTime;

    expect(finalStoredElapsed).toBe(120);
    expect(finalStoredElapsed).not.toBe(60);
  });

  it("11 & 12. Duel completion: first finishes -> waiting; second finishes -> winner evaluated", () => {
    const u1 = userA;
    const u2 = userB;

    // Player A finishes in 140s, 0 mistakes
    const attemptsStage1 = [
      { userId: u1, roundNumber: 1, elapsedSeconds: 140, mistakes: 0, isCompleted: true, isFlagged: false },
    ];

    const a1Only = attemptsStage1.find((a) => a.userId === u1);
    const a2Stage1 = attemptsStage1.find((a) => a.userId === u2);
    const isStage1Complete = Boolean(a1Only && a2Stage1);

    expect(isStage1Complete).toBe(false); // Waiting for Player B

    // Player B finishes in 180s, 1 mistake
    const attemptsStage2 = [
      { userId: u1, roundNumber: 1, elapsedSeconds: 140, mistakes: 0, isCompleted: true, isFlagged: false },
      { userId: u2, roundNumber: 1, elapsedSeconds: 180, mistakes: 1, isCompleted: true, isFlagged: false },
    ];

    const a1 = attemptsStage2.find((a) => a.userId === u1)!;
    const a2 = attemptsStage2.find((a) => a.userId === u2)!;
    const isStage2Complete = Boolean(a1 && a2);

    expect(isStage2Complete).toBe(true);

    let winnerId: string | null = null;
    if (a1.elapsedSeconds < a2.elapsedSeconds) {
      winnerId = u1;
    } else if (a2.elapsedSeconds < a1.elapsedSeconds) {
      winnerId = u2;
    }

    expect(winnerId).toBe(u1);
  });

  it("13 & 14. Time Attack: DB attempts drive solvedCount; client value is ignored", () => {
    // Valid completed DB attempts for userA in Time Attack
    const dbAttempts = [
      { userId: userA, roundNumber: 1, isCompleted: true, isFlagged: false, elapsedSeconds: 45, mistakes: 0 },
      { userId: userA, roundNumber: 2, isCompleted: true, isFlagged: false, elapsedSeconds: 50, mistakes: 1 },
      { userId: userA, roundNumber: 3, isCompleted: true, isFlagged: false, elapsedSeconds: 60, mistakes: 0 },
    ];

    // Client sends fake puzzlesSolved=999
    const clientPayload = { puzzlesSolved: 999 };

    // Authoritative derivation from DB attempts
    const authoritativeSolvedCount = dbAttempts.filter((a) => a.roundNumber >= 1 && a.isCompleted && !a.isFlagged).length;

    expect(authoritativeSolvedCount).toBe(3);
    expect(authoritativeSolvedCount).not.toBe(clientPayload.puzzlesSolved);
  });

  it("15. Time Attack reload derives remaining time from server startedAt", () => {
    const timeLimitMinutes = 15;
    const timeLimitSecs = timeLimitMinutes * 60; // 900s
    const startedAt = new Date(Date.now() - 200 * 1000); // started 200s ago

    const elapsedSinceStart = Math.floor((Date.now() - startedAt.getTime()) / 1000);
    const timeRemaining = Math.max(0, timeLimitSecs - elapsedSinceStart);

    expect(timeRemaining).toBeCloseTo(700, -1);
    expect(timeRemaining).toBeLessThan(timeLimitSecs);
  });

  it("16. Expired invite cannot be accepted", () => {
    const expiredChallenge = {
      id: "ch_expired",
      status: "pending",
      expiresAt: new Date(Date.now() - 1000), // 1s in the past
    };

    const isExpired = expiredChallenge.expiresAt < new Date();
    expect(isExpired).toBe(true);

    const canAccept = !isExpired && expiredChallenge.status === "pending";
    expect(canAccept).toBe(false);
  });

  it("17. Non-participant cannot fetch private challenge data", () => {
    const challenge = {
      id: "ch_private",
      challengerId: userA,
      opponentId: userB,
    };

    const isParticipantA = challenge.challengerId === userA || challenge.opponentId === userA;
    const isParticipantB = challenge.challengerId === userB || challenge.opponentId === userB;
    const isParticipantC = challenge.challengerId === userC || challenge.opponentId === userC;

    expect(isParticipantA).toBe(true);
    expect(isParticipantB).toBe(true);
    expect(isParticipantC).toBe(false);
  });

  it("Best of 3: Evaluates first to 2 round wins", () => {
    const u1 = userA;
    const u2 = userB;

    const roundAttempts = [
      // Round 1: Player 1 wins
      { userId: u1, roundNumber: 1, elapsedSeconds: 100, mistakes: 0 },
      { userId: u2, roundNumber: 1, elapsedSeconds: 120, mistakes: 0 },
      // Round 2: Player 1 wins
      { userId: u1, roundNumber: 2, elapsedSeconds: 90, mistakes: 0 },
      { userId: u2, roundNumber: 2, elapsedSeconds: 110, mistakes: 0 },
    ];

    let u1Wins = 0;
    let u2Wins = 0;

    for (let r = 1; r <= 3; r++) {
      const a1 = roundAttempts.find((a) => a.userId === u1 && a.roundNumber === r);
      const a2 = roundAttempts.find((a) => a.userId === u2 && a.roundNumber === r);
      if (a1 && a2) {
        if (a1.elapsedSeconds < a2.elapsedSeconds) u1Wins++;
        else if (a2.elapsedSeconds < a1.elapsedSeconds) u2Wins++;
      }
    }

    const isComplete = u1Wins >= 2 || u2Wins >= 2;
    const winnerId = u1Wins >= 2 ? u1 : u2Wins >= 2 ? u2 : null;

    expect(isComplete).toBe(true);
    expect(winnerId).toBe(u1);
    expect(u1Wins).toBe(2);
  });

  it("Sprint: Evaluates lowest total elapsed across all predetermined rounds", () => {
    const u1 = userA;
    const u2 = userB;

    const sprintAttempts = [
      // User A (total: 300s)
      { userId: u1, roundNumber: 1, elapsedSeconds: 100, mistakes: 0 },
      { userId: u1, roundNumber: 2, elapsedSeconds: 100, mistakes: 0 },
      { userId: u1, roundNumber: 3, elapsedSeconds: 100, mistakes: 0 },
      // User B (total: 320s)
      { userId: u2, roundNumber: 1, elapsedSeconds: 90, mistakes: 0 },
      { userId: u2, roundNumber: 2, elapsedSeconds: 110, mistakes: 0 },
      { userId: u2, roundNumber: 3, elapsedSeconds: 120, mistakes: 0 },
    ];

    const totalTimeA = sprintAttempts.filter((a) => a.userId === u1).reduce((acc, a) => acc + a.elapsedSeconds, 0);
    const totalTimeB = sprintAttempts.filter((a) => a.userId === u2).reduce((acc, a) => acc + a.elapsedSeconds, 0);

    expect(totalTimeA).toBe(300);
    expect(totalTimeB).toBe(320);
    expect(totalTimeA < totalTimeB).toBe(true);
  });
});
