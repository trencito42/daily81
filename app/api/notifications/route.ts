import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  getUserNotifications,
  getUnreadNotificationsCount,
  markNotificationsAsRead,
} from "@/lib/notifications/notifications";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ authenticated: false, notifications: [], unreadCount: 0 });
  }

  try {
    const [notifications, unreadCount] = await Promise.all([
      getUserNotifications(session.id),
      getUnreadNotificationsCount(session.id),
    ]);

    return NextResponse.json({
      authenticated: true,
      notifications,
      unreadCount,
    });
  } catch (err) {
    console.error("Fetch notifications error:", err);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await markNotificationsAsRead(session.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Mark notifications read error:", err);
    return NextResponse.json({ error: "Failed to mark notifications read" }, { status: 500 });
  }
}
