import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getOwnedProduct(id: string, userId: string) {
  return prisma.product.findFirst({ where: { id, userId } });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const product = await getOwnedProduct(id, session.user.id);
  if (!product) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const body = await req.json();
  const { name, url, imageUrl, price, manufacturer, color, size, description, deliveryTime, quantity, category } = body;

  if (name !== undefined && !name?.trim()) return NextResponse.json({ error: "Nazwa jest wymagana" }, { status: 400 });

  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(url !== undefined ? { url: url || null } : {}),
      ...(imageUrl !== undefined ? { imageUrl: imageUrl || null } : {}),
      ...(price !== undefined ? { price: price || null } : {}),
      ...(manufacturer !== undefined ? { manufacturer: manufacturer || null } : {}),
      ...(color !== undefined ? { color: color || null } : {}),
      ...(size !== undefined ? { size: size || null } : {}),
      ...(description !== undefined ? { description: description || null } : {}),
      ...(deliveryTime !== undefined ? { deliveryTime: deliveryTime || null } : {}),
      ...(quantity !== undefined ? { quantity: typeof quantity === "number" && quantity >= 1 ? quantity : 1 } : {}),
      ...(category !== undefined ? { category: category || null } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const product = await getOwnedProduct(id, session.user.id);
  if (!product) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
