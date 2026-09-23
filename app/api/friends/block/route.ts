import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { blockUser, unblockUser } from "@/lib/friends/friends";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { targetUserId, action } = await req.json();
    if (!targetUserId) {
      return NextResponse.json({ error: "Target user ID is required" }, { status: 400 });
    }

    if (action === "unblock") {
      await unblockUser(session.id, targetUserId);
      return NextResponse.json({ success: true, unblocked: true });
    }

    const res = await blockUser(session.id, targetUserId);
    if (!res.success) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, blocked: true });
  } catch (err) {
    console.error("Block user error:", err);
    return NextResponse.json({ error: "Failed to update block state" }, { status: 500 });
  }
}
