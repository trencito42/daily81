import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getFriends, getFriendRequests, sendFriendRequest } from "@/lib/friends/friends";
import { getFriendsActivity } from "@/lib/activity/activity";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ authenticated: false, friends: [], requests: { incoming: [], outgoing: [] } });
  }

  try {
    const [friends, requests, activity] = await Promise.all([
      getFriends(session.id),
      getFriendRequests(session.id),
      getFriendsActivity(session.id, 15),
    ]);

    return NextResponse.json({
      authenticated: true,
      friends,
      requests,
      activity,
    });
  } catch (err) {
    console.error("Get friends error:", err);
    return NextResponse.json({ error: "Failed to load friends" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { target } = await req.json();
    if (!target || typeof target !== "string") {
      return NextResponse.json({ error: "Target player is required" }, { status: 400 });
    }

    const result = await sendFriendRequest(session.id, target);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, acceptedImmediately: result.acceptedImmediately });
  } catch (err) {
    console.error("Send friend request error:", err);
    return NextResponse.json({ error: "Failed to send friend request" }, { status: 500 });
  }
}
