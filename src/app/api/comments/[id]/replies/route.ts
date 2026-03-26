import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { content, author } = await req.json();

  if (!content || !author) {
    return NextResponse.json({ error: "Brakujące pola" }, { status: 400 });
  }

  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) {
    return NextResponse.json({ error: "Nie znaleziono komentarza" }, { status: 404 });
  }

  const reply = await prisma.reply.create({
    data: { commentId: id, content, author },
  });

  await pusherServer.trigger(`render-${comment.renderId}`, "comment-reply", {
    commentId: id,
    reply: { ...reply, createdAt: reply.createdAt.toISOString() },
  });

  // Notify client via share channel if designer replied
  const render = await prisma.render.findUnique({
    where: { id: comment.renderId },
    include: { project: { select: { shareToken: true, user: { select: { notifyClientOnReply: true } } } } },
  });

  if (render?.project.user.notifyClientOnReply) {
    await pusherServer.trigger(`share-${render.project.shareToken}`, "new-reply", {
      renderId: comment.renderId,
      commentId: id,
      author,
    });
  }

  return NextResponse.json(reply, { status: 201 });
}

