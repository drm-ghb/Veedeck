import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { extraDays, isFree } = body;

  const target = await prisma.user.findUnique({ where: { id }, select: { email: true, trialEndsAt: true, isFree: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {};

  if (typeof isFree === "boolean") {
    updateData.isFree = isFree;
  }

  if (typeof extraDays === "number" && extraDays !== 0) {
    const base = target.trialEndsAt && target.trialEndsAt > new Date()
      ? target.trialEndsAt
      : new Date();
    updateData.trialEndsAt = new Date(base.getTime() + extraDays * 24 * 60 * 60 * 1000);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { trialEndsAt: true, isFree: true },
  });

  await logActivity({
    level: "info",
    action: "ADMIN_TRIAL_UPDATE",
    message: `Admin zaktualizował trial/free dla: ${target.email}`,
    userId: session.user.id,
    meta: { targetUserId: id, ...updateData },
  });

  return NextResponse.json(updated);
}
