import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { respondFriendRequest } from "@/lib/friends/friends";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { requestId, action } = await req.json();
    if (!requestId || !["accept", "decline"].includes(action)) {
      return NextResponse.json({ error: "Invalid request action" }, { status: 400 });
    }

    const result = await respondFriendRequest(requestId, session.id, action);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, action: result.action });
  } catch (err) {
    console.error("Respond friend request error:", err);
    return NextResponse.json({ error: "Failed to respond to friend request" }, { status: 500 });
  }
}
