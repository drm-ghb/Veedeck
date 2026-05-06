import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

async function verifyProject(token: string, id: string) {
  const project = await prisma.project.findUnique({
    where: { shareToken: token },
    select: { archived: true, shareExpiresAt: true, discussion: { select: { id: true } } },
  });
  if (!project || project.archived) return null;
  if (project.shareExpiresAt && new Date() > new Date(project.shareExpiresAt)) return null;
  if (!project.discussion || project.discussion.id !== id) return null;
  return project;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; id: string; messageId: string }> }
) {
  const { token, id, messageId } = await params;
  const project = await verifyProject(token, id);
  if (!project) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const { content, authorName } = await req.json();
  if (!content?.trim() || !authorName?.trim()) return NextResponse.json({ error: "Brakujące pola" }, { status: 400 });

  const message = await prisma.discussionMessage.findUnique({ where: { id: messageId } });
  if (!message || message.discussionId !== id) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  if (message.authorName !== authorName.trim()) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const updated = await prisma.discussionMessage.update({
    where: { id: messageId },
    data: { content: content.trim(), editedAt: new Date() },
  });

  await pusherServer.trigger(`discussion-${id}`, "message-edited", {
    id: messageId,
    content: updated.content,
    editedAt: updated.editedAt,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; id: string; messageId: string }> }
) {
  const { token, id, messageId } = await params;
  const project = await verifyProject(token, id);
  if (!project) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const { authorName } = await req.json();
  if (!authorName?.trim()) return NextResponse.json({ error: "Brakujące pola" }, { status: 400 });

  const message = await prisma.discussionMessage.findUnique({ where: { id: messageId } });
  if (!message || message.discussionId !== id) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  if (message.authorName !== authorName.trim()) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  await prisma.discussionMessage.delete({ where: { id: messageId } });
  await pusherServer.trigger(`discussion-${id}`, "message-deleted", { id: messageId });

  return NextResponse.json({ success: true });
}
