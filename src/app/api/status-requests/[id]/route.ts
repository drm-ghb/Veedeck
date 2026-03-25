import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { action } = await req.json(); // "confirm" | "reject"

  const request = await prisma.statusChangeRequest.findUnique({ where: { id } });
  if (!request) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  const project = await prisma.project.findUnique({
    where: { id: request.projectId },
    select: { userId: true },
  });

  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "Prośba już rozpatrzona" }, { status: 409 });
  }

  const newStatus = action === "confirm" ? "CONFIRMED" : "REJECTED";

  await prisma.statusChangeRequest.update({
    where: { id },
    data: { status: newStatus },
  });

  if (action === "confirm") {
    await prisma.render.update({
      where: { id: request.renderId },
      data: { status: "REVIEW" },
    });
  }

  const resultMessage =
    action === "confirm"
      ? `Projektant potwierdził zmianę statusu pliku „${request.renderName}" na „Do weryfikacji".`
      : `Projektant odrzucił prośbę o zmianę statusu pliku „${request.renderName}". Status pozostaje „Zaakceptowany".`;

  await pusherServer.trigger(`share-${request.shareToken}`, "status-request-resolved", {
    requestId: id,
    renderId: request.renderId,
    result: newStatus,
    message: resultMessage,
    newRenderStatus: action === "confirm" ? "REVIEW" : "ACCEPTED",
  });

  return NextResponse.json({ status: newStatus });
}
