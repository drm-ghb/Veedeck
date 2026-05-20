import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { type, value, validFrom, validUntil, note } = body;

  if (!["percent", "amount"].includes(type) || typeof value !== "number" || value <= 0) {
    return NextResponse.json({ error: "Nieprawidłowe dane rabatu" }, { status: 400 });
  }

  const discount = await prisma.discount.create({
    data: {
      userId: id,
      type,
      value,
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validUntil: validUntil ? new Date(validUntil) : null,
      note: note ?? null,
    },
  });

  await logActivity({
    level: "info",
    action: "ADMIN_DISCOUNT_ADDED",
    message: `Admin dodał rabat ${type === "percent" ? value + "%" : value + " zł"} dla userId: ${id}`,
    userId: session.user.id,
  });

  return NextResponse.json(discount);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id: userId } = await params;
  const { discountId } = await req.json();

  await prisma.discount.deleteMany({ where: { id: discountId, userId } });

  return NextResponse.json({ success: true });
}
