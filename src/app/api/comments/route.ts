import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export async function POST(req: NextRequest) {
  const { renderId, title, content, posX, posY, author } = await req.json();

  if (!renderId || !content || posX === undefined || posY === undefined || !author) {
    return NextResponse.json({ error: "Brakujące pola" }, { status: 400 });
  }

  const comment = await prisma.comment.create({
    data: { renderId, title: title || null, content, posX, posY, author },
  });

  await pusherServer.trigger(`render-${renderId}`, "new-comment", comment);

  const render = await prisma.render.findUnique({
    where: { id: renderId },
    include: { project: { select: { userId: true, id: true, title: true } } },
  });

  if (render?.project?.userId) {
    const notif = await prisma.notification.create({
      data: {
        userId: render.project.userId,
        message: `${author} dodał komentarz w projekcie "${render.project.title}"`,
        link: `/projects/${render.project.id}/renders/${renderId}`,
        projectId: render.project.id,
        projectTitle: render.project.title,
      },
    });
    await pusherServer.trigger(`user-${render.project.userId}`, "new-notification", notif);
  }

  return NextResponse.json(comment, { status: 201 });
}
