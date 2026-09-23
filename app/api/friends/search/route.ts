import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { searchUsers } from "@/lib/friends/friends";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    const session = await getSession(req);
    const users = await searchUsers(query, session?.id);

    return NextResponse.json({ users });
  } catch (err) {
    console.error("Search users error:", err);
    return NextResponse.json({ error: "Failed to search users" }, { status: 500 });
  }
}
