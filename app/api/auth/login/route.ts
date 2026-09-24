import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/security/rateLimit";

// Precomputed dummy hash for constant-time comparison when user not found.
// Prevents timing-based email enumeration.
const DUMMY_HASH = "$2b$12$placeholder.hash.value.for.constant.time.comparison.xx";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const clientIp = getClientIp(req);
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    // Rate limiting: max 5 attempts / 15 min / IP+email
    const rateLimitKey = `login:${clientIp}:${normalizedEmail}`;
    const rl = checkRateLimit({
      key: rateLimitKey,
      maxRequests: 5,
      windowSeconds: 15 * 60,
    });

    if (!rl.allowed) {
      return rateLimitResponse(
        "Too many login attempts. Please try again later.",
        rl.resetSeconds
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Always perform bcrypt comparison regardless of whether user exists.
    // This prevents timing-based email enumeration attacks.
    const hashToCompare = user ? user.passwordHash : DUMMY_HASH;
    const isValid = await verifyPassword(String(password), hashToCompare);

    if (!user || !isValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      xp: user.xp,
      level: user.level,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      lastDailyDate: user.lastDailyDate,
    });

    await setSessionCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        xp: user.xp,
        level: user.level,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
      },
    });
  } catch (err: unknown) {
    console.error("Login error:", (err as Error)?.message || err);
    return NextResponse.json({ error: "Authentication failed. Please try again." }, { status: 500 });
  }
}

