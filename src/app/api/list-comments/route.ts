import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "Brak productId" }, { status: 400 });

  const comments = await prisma.listProductComment.findMany({
    where: { productId },
    include: { replies: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}

export async function POST(req: NextRequest) {
  const { productId, content, author } = await req.json();

  if (!productId || !content || !author) {
    return NextResponse.json({ error: "Brakujące pola" }, { status: 400 });
  }

  const comment = await prisma.listProductComment.create({
    data: { productId, content, author },
    include: { replies: true },
  });

  await pusherServer.trigger(`list-product-${productId}`, "new-comment", comment);

  return NextResponse.json(comment, { status: 201 });
}
