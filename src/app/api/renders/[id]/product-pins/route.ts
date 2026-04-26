import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

async function getAuthorizedRender(renderId: string, userId: string) {
  const render = await prisma.render.findUnique({
    where: { id: renderId },
    include: { project: { select: { userId: true } } },
  });
  if (!render || render.project.userId !== userId) return null;
  return render;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const render = await getAuthorizedRender(id, userId);
  if (!render) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const pins = await prisma.renderProductPin.findMany({
    where: { renderId: id },
    include: {
      product: { select: { id: true, name: true, imageUrl: true, url: true, price: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(pins);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const render = await getAuthorizedRender(id, userId);
  if (!render) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const { productId, posX, posY } = await req.json();
  if (!productId || posX == null || posY == null) {
    return NextResponse.json({ error: "Brakujące pola" }, { status: 400 });
  }

  // Verify product belongs to this designer
  const product = await prisma.product.findFirst({ where: { id: productId, userId } });
  if (!product) return NextResponse.json({ error: "Produkt nie istnieje" }, { status: 404 });

  // Anti-collision: min 3% euclidean distance from existing pins
  const existing = await prisma.renderProductPin.findMany({ where: { renderId: id } });
  const tooClose = existing.some((p) => {
    const dx = p.posX - posX;
    const dy = p.posY - posY;
    return Math.sqrt(dx * dx + dy * dy) < 3;
  });
  if (tooClose) {
    return NextResponse.json({ error: "Za blisko innego pinu" }, { status: 409 });
  }

  const pin = await prisma.renderProductPin.create({
    data: { renderId: id, productId, posX, posY },
    include: {
      product: { select: { id: true, name: true, imageUrl: true, url: true, price: true } },
    },
  });

  return NextResponse.json(pin, { status: 201 });
}
