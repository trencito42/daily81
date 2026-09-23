import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { removeFriend } from "@/lib/friends/friends";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { friendId } = await req.json();
    if (!friendId) {
      return NextResponse.json({ error: "Friend ID is required" }, { status: 400 });
    }

    await removeFriend(session.id, friendId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Remove friend error:", err);
    return NextResponse.json({ error: "Failed to remove friend" }, { status: 500 });
  }
}
