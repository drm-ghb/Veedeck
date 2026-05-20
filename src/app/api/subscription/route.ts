import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });
  const discounts = await prisma.discount.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { trialEndsAt: true, isFree: true },
  });

  return NextResponse.json({ subscription: sub, discounts, trialEndsAt: user?.trialEndsAt, isFree: user?.isFree });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { plan, billingName, billingEmail, cardLast4, cardBrand } = body;

  if (!["standard", "commercial", "enterprise"].includes(plan)) {
    return NextResponse.json({ error: "Nieprawidłowy plan" }, { status: 400 });
  }

  const sub = await prisma.subscription.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      plan,
      status: "active",
      billingName: billingName ?? null,
      billingEmail: billingEmail ?? null,
      cardLast4: cardLast4 ?? null,
      cardBrand: cardBrand ?? null,
    },
    update: {
      plan,
      status: "active",
      billingName: billingName ?? null,
      billingEmail: billingEmail ?? null,
      cardLast4: cardLast4 ?? null,
      cardBrand: cardBrand ?? null,
    },
  });

  return NextResponse.json({ subscription: sub });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.subscription.findUnique({ where: { userId: session.user.id } });
  if (!existing || existing.status !== "active") {
    return NextResponse.json({ error: "Brak aktywnej subskrypcji" }, { status: 400 });
  }

  const cancelAt = new Date();
  cancelAt.setDate(cancelAt.getDate() + 30);

  const sub = await prisma.subscription.update({
    where: { userId: session.user.id },
    data: { status: "cancelled", cancelAt },
  });

  return NextResponse.json({ subscription: sub });
}
