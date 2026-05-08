import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getFolderAndVerify(id: string, userId: string) {
  return prisma.clientDocFolder.findFirst({
    where: { id, client: { project: { userId } } },
  });
}

// PATCH /api/client-docs/folders/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const folder = await getFolderAndVerify(id, session.user.id);
  if (!folder) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.clientDocFolder.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.order !== undefined && { order: body.order }),
    },
    include: { docs: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json(updated);
}

// DELETE /api/client-docs/folders/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const folder = await getFolderAndVerify(id, session.user.id);
  if (!folder) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Move docs out of folder before deleting
  await prisma.clientDoc.updateMany({ where: { folderId: id }, data: { folderId: null } });
  await prisma.clientDocFolder.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
