import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; replyId: string }> }
) {
  const { id, replyId } = await params;
  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Brak treści" }, { status: 400 });

  const comment = await prisma.listProductComment.findUnique({ where: { id } });
  if (!comment) return NextResponse.json({ error: "Nie znaleziono komentarza" }, { status: 404 });

  const reply = await prisma.listProductReply.update({
    where: { id: replyId },
    data: { content: content.trim() },
  });

  await pusherServer.trigger(`list-product-${comment.productId}`, "reply-updated", {
    commentId: id,
    reply,
  });

  return NextResponse.json(reply);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; replyId: string }> }
) {
  const { id, replyId } = await params;

  const comment = await prisma.listProductComment.findUnique({ where: { id } });
  if (!comment) {
    return NextResponse.json({ error: "Nie znaleziono komentarza" }, { status: 404 });
  }

  await prisma.listProductReply.delete({ where: { id: replyId } });

  await pusherServer.trigger(`list-product-${comment.productId}`, "reply-deleted", {
    commentId: id,
    replyId,
  });

  return NextResponse.json({ success: true });
}
