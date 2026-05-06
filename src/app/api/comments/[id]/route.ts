import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = getWorkspaceUserId(session);

  const { id } = await params;
  const body = await req.json();
  const { viewedByDesigner, status, content, authorName } = body;

  const comment = await prisma.comment.findUnique({
    where: { id },
    select: {
      renderId: true,
      author: true,
      render: { select: { project: { select: { userId: true } } } },
    },
  });

  if (!comment) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  const isOwner = comment.render.project.userId === userId;
  const isAuthor = content !== undefined && comment.author === authorName;

  if (!isOwner && !isAuthor) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const updated = await prisma.comment.update({
    where: { id },
    data: {
      ...(isOwner && viewedByDesigner !== undefined ? { viewedByDesigner } : {}),
      ...(isOwner && status !== undefined ? { status } : {}),
      ...(content !== undefined ? { content: content.trim() } : {}),
    },
    include: { replies: true },
  });

  if (status !== undefined || content !== undefined) {
    await pusherServer.trigger(`render-${comment.renderId}`, "comment-updated", updated);
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id } = await params;

  const comment = await prisma.comment.findUnique({
    where: { id },
    select: {
      renderId: true,
      author: true,
      render: { select: { project: { select: { userId: true } } } },
    },
  });

  if (!comment) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  // Allow: project owner (designer) OR authorName match from body (for clients)
  if (session?.user?.id) {
    const userId = getWorkspaceUserId(session);
    if (comment.render.project.userId !== userId) {
      // Check if client user authored it — no userId on Comment, check via body
      let body: { authorName?: string } = {};
      try { body = await req.json(); } catch { /* no body */ }
      if (body.authorName !== comment.author) {
        return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
      }
    }
  }
  // No session: allow (share-link clients — frontend gating is the protection)

  await prisma.comment.delete({ where: { id } });
  await pusherServer.trigger(`render-${comment.renderId}`, "comment-deleted", { id });

  return NextResponse.json({ success: true });
}
