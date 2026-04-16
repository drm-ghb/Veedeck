import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, attachmentId } = await params;
  const attachment = await prisma.noteAttachment.findUnique({
    where: { id: attachmentId },
    include: { note: { select: { userId: true } } },
  });
  if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (attachment.note.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (attachment.noteId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.noteAttachment.delete({ where: { id: attachmentId } });
  return new NextResponse(null, { status: 204 });
}
