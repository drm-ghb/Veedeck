import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: session.user.id },
  });

  if (subs.length === 0) {
    return NextResponse.json({ error: "no_subscription" }, { status: 400 });
  }

  const payload = JSON.stringify({
    title: "Test powiadomień",
    body: "Powiadomienia push działają poprawnie ✓",
  });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  );

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length === subs.length) {
    return NextResponse.json({ error: "send_failed", details: (failed[0] as any).reason?.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sent: subs.length - failed.length });
}
