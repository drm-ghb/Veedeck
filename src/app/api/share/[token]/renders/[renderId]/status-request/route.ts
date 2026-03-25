import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; renderId: string }> }
) {
  const { token, renderId } = await params;

  const project = await prisma.project.findUnique({
    where: { shareToken: token },
    select: { id: true, userId: true, title: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  const render = await prisma.render.findUnique({
    where: { id: renderId },
    select: { projectId: true, name: true },
  });

  if (!render || render.projectId !== project.id) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const { clientName } = await req.json();

  const request = await prisma.statusChangeRequest.create({
    data: {
      renderId,
      renderName: render.name,
      clientName: clientName || "Klient",
      projectId: project.id,
      shareToken: token,
      status: "PENDING",
    },
  });

  const renderUrl = `/projects/${project.id}/renders/${renderId}`;
  const message = `${request.clientName} prosi o zmianę statusu pliku „${render.name}" na „Do weryfikacji" w projekcie „${project.title}"`;

  const notification = await prisma.notification.create({
    data: {
      userId: project.userId,
      message,
      link: renderUrl,
      type: "status_request",
      requestId: request.id,
      projectId: project.id,
      projectTitle: project.title,
    },
  });

  await pusherServer.trigger(`user-${project.userId}`, "new-notification", {
    ...notification,
    createdAt: notification.createdAt.toISOString(),
  });

  return NextResponse.json({ requestId: request.id });
}
