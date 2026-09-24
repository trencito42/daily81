import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "daily81_session";

function getSecretKey(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXTAUTH_SECRET is missing in production environment");
    }
    return new TextEncoder().encode("daily81-default-dev-secret-key-32-chars-long");
  }
  return new TextEncoder().encode(secret);
}

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastDailyDate: string | null;
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  const key = getSecretKey();
  return new SignJWT({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(key);
}

export async function verifySessionToken(token: string): Promise<{ id: string; email: string; displayName: string } | null> {
  try {
    const key = getSecretKey();
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    return payload as unknown as { id: string; email: string; displayName: string };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(request?: Request): Promise<{ id: string; email: string; displayName: string } | null> {
  try {
    if (request) {
      const cookieHeader = request.headers.get("cookie") || "";
      const match = cookieHeader.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
      if (match && match[1]) {
        return await verifySessionToken(decodeURIComponent(match[1]));
      }
    }

    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}
