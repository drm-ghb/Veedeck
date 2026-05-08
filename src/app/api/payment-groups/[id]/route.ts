import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getGroupAndVerify(id: string, userId: string) {
  return prisma.paymentGroup.findFirst({
    where: { id, client: { project: { userId } } },
  });
}

// PATCH /api/payment-groups/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const group = await getGroupAndVerify(id, session.user.id);
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.paymentGroup.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.parentId !== undefined && { parentId: body.parentId }),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/payment-groups/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const group = await getGroupAndVerify(id, session.user.id);
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Cascade: move child payments to no group, delete child groups
  await prisma.payment.updateMany({ where: { groupId: id }, data: { groupId: null } });
  await prisma.paymentGroup.updateMany({ where: { parentId: id }, data: { parentId: null } });
  await prisma.paymentGroup.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
