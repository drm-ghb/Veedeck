import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const note = await prisma.note.findUnique({ where: { id }, select: { userId: true } });
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (note.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const attachments = await prisma.noteAttachment.findMany({
    where: { noteId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(attachments);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const note = await prisma.note.findUnique({ where: { id }, select: { userId: true } });
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (note.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, url, key } = await req.json();
  if (!name || !url || !key) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const attachment = await prisma.noteAttachment.create({
    data: { noteId: id, name, url, key },
  });
  return NextResponse.json(attachment, { status: 201 });
}
