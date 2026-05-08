import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getDocAndVerify(id: string, userId: string) {
  return prisma.clientDoc.findFirst({
    where: { id, client: { project: { userId } } },
  });
}

// PATCH /api/client-docs/files/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const doc = await getDocAndVerify(id, session.user.id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.clientDoc.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.folderId !== undefined && { folderId: body.folderId }),
      ...(body.order !== undefined && { order: body.order }),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/client-docs/files/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const doc = await getDocAndVerify(id, session.user.id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.clientDoc.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
