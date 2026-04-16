import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const OFFSET_MS: Record<string, number> = {
  "30min": 30 * 60 * 1000,
  "1h":    60 * 60 * 1000,
  "24h":   24 * 60 * 60 * 1000,
};

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find events with reminder not yet sent, in the future, where reminder time has passed
  const events = await prisma.calendarEvent.findMany({
    where: {
      reminder: true,
      reminderSentAt: null,
      startAt: { gt: now },
    },
    include: {
      user: { include: { pushSubscriptions: true } },
    },
  });

  let sent = 0;

  for (const event of events) {
    const offsetMs = OFFSET_MS[event.reminderOffset ?? "1h"] ?? OFFSET_MS["1h"];
    const reminderTime = new Date(event.startAt.getTime() - offsetMs);

    if (reminderTime > now) continue; // not yet time

    const subs = event.user.pushSubscriptions;
    if (subs.length === 0) continue;

    const startStr = event.startAt.toLocaleString("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "short",
    });

    const payload = JSON.stringify({
      eventId: event.id,
      title: `Przypomnienie: ${event.title}`,
      body: `Wydarzenie o ${startStr}`,
    });

    const deadSubs: string[] = [];

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          );
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            deadSubs.push(sub.endpoint);
          }
        }
      })
    );

    // Remove expired subscriptions
    if (deadSubs.length > 0) {
      await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: deadSubs } } });
    }

    await prisma.calendarEvent.update({
      where: { id: event.id },
      data: { reminderSentAt: now },
    });

    sent++;
  }

  return NextResponse.json({ sent });
}
