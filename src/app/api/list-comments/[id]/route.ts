import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const comment = await prisma.listProductComment.findUnique({ where: { id } });
  if (!comment) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  await prisma.listProductComment.delete({ where: { id } });
  await pusherServer.trigger(`list-product-${comment.productId}`, "comment-deleted", { id });

  return NextResponse.json({ success: true });
}
