import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string; renderId: string }> }
) {
  const { token, renderId } = await params;

  const project = await prisma.project.findUnique({ where: { shareToken: token } });
  if (!project) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const render = await prisma.render.findUnique({
    where: { id: renderId },
    select: { projectId: true },
  });
  if (!render || render.projectId !== project.id) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const pins = await prisma.renderProductPin.findMany({
    where: { renderId },
    include: {
      product: { select: { id: true, name: true, imageUrl: true, url: true, price: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(pins);
}
