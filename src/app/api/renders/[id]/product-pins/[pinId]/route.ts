import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; pinId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);
  const { id, pinId } = await params;

  const pin = await prisma.renderProductPin.findUnique({
    where: { id: pinId },
    include: { render: { include: { project: { select: { userId: true } } } } },
  });

  if (!pin || pin.renderId !== id || pin.render.project.userId !== userId) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  await prisma.renderProductPin.delete({ where: { id: pinId } });
  return NextResponse.json({ ok: true });
}
