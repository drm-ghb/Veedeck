import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/payment-groups — create group
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { clientId, parentId, name } = body;

  if (!clientId || !name) {
    return NextResponse.json({ error: "clientId, name required" }, { status: 400 });
  }

  const client = await prisma.projectClient.findFirst({
    where: { id: clientId, project: { userId: session.user.id } },
  });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const count = await prisma.paymentGroup.count({ where: { clientId } });
  const group = await prisma.paymentGroup.create({
    data: {
      clientId,
      parentId: parentId ?? null,
      name,
      order: count,
    },
  });

  return NextResponse.json(group, { status: 201 });
}
