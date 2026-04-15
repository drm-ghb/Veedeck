import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { viewedByDesigner } = await req.json();

  const comment = await prisma.listProductComment.findUnique({
    where: { id },
    select: { product: { select: { section: { select: { list: { select: { userId: true } } } } } } },
  });

  if (!comment) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  if (comment.product.section.list.userId !== session.user.id) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  await prisma.listProductComment.update({ where: { id }, data: { viewedByDesigner } });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const comment = await prisma.listProductComment.findUnique({
    where: { id },
    include: { product: { include: { section: { include: { list: { select: { id: true } } } } } } },
  });
  if (!comment) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  await prisma.listProductComment.delete({ where: { id } });
  await pusherServer.trigger(`list-product-${comment.productId}`, "comment-deleted", { id });
  await pusherServer.trigger(`shopping-list-${comment.product.section.list.id}`, "comment-activity", { productId: comment.productId, action: "deleted" });

  return NextResponse.json({ success: true });
}
