import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, name, fileUrl, fileKey, roomId } = await req.json();

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
    include: { user: { select: { defaultRenderStatus: true } } },
  });

  if (!project) {
    return NextResponse.json({ error: "Projekt nie znaleziony" }, { status: 404 });
  }

  const count = await prisma.render.count({ where: { projectId } });
  const render = await prisma.render.create({
    data: {
      projectId,
      name,
      fileUrl,
      fileKey,
      order: count,
      roomId: roomId || null,
      status: project.user.defaultRenderStatus,
    },
  });

  return NextResponse.json(render, { status: 201 });
}
