import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status } = await req.json();

  const comment = await prisma.comment.update({
    where: { id },
    data: { status },
  });

  await pusherServer.trigger(
    `render-${comment.renderId}`,
    "comment-updated",
    comment
  );

  return NextResponse.json(comment);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  await prisma.comment.delete({ where: { id } });
  await pusherServer.trigger(
    `render-${comment.renderId}`,
    "comment-deleted",
    { id }
  );

  return NextResponse.json({ success: true });
}
