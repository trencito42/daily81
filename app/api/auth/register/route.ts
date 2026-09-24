import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { getLevelFromXP } from "@/lib/xp/progression";
import { sendWelcomeEmail } from "@/lib/email/mailer";
import { validateUsername } from "@/lib/auth/username";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const clientIp = getClientIp(req);

    // Rate limiting: max 5 registrations / hour / IP
    const rateLimitKey = `register:${clientIp}`;
    const rl = checkRateLimit({
      key: rateLimitKey,
      maxRequests: 5,
      windowSeconds: 3600,
    });

    if (!rl.allowed) {
      return rateLimitResponse(
        "Too many registration attempts from this IP. Please try again later.",
        rl.resetSeconds
      );
    }

    const { email, password, displayName, username, guestProfile } = await req.json();


    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user with email exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingEmail) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    // Determine & validate username
    let desiredUsername = username ? String(username).trim().toLowerCase() : "";
    if (!desiredUsername) {
      const base = (displayName || normalizedEmail.split("@")[0]).toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 14) || "player";
      desiredUsername = `${base}_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const userValidation = validateUsername(desiredUsername);
    if (!userValidation.valid) {
      return NextResponse.json({ error: userValidation.error }, { status: 400 });
    }

    const existingUsername = await prisma.user.findUnique({
      where: { username: userValidation.normalized },
    });

    if (existingUsername) {
      return NextResponse.json({ error: "This username is already taken" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const initialDisplayName = displayName ? String(displayName).trim() : userValidation.normalized;

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        username: userValidation.normalized,
        passwordHash,
        displayName: initialDisplayName,
        xp: 0,
        level: 1,
        currentStreak: 0,
        longestStreak: 0,
        lastDailyDate: null,
      },
    });

    // Send welcome email in background
    sendWelcomeEmail(user.email, user.displayName).catch((err) => {
      console.warn("Welcome email error:", err);
    });

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
    console.error("Register error:", (err as Error)?.message || err);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
