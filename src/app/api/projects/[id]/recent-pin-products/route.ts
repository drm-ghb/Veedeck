import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  // Fetch recent pins across all renders of the project, newest first
  const pins = await prisma.renderProductPin.findMany({
    where: {
      render: { projectId: id },
      archivedVersionId: null,
    },
    include: {
      product: {
        select: { id: true, name: true, imageUrl: true, url: true, price: true, manufacturer: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Deduplicate by product.id, keep most recent occurrence
  const seen = new Set<string>();
  const products = [];
  for (const pin of pins) {
    if (!seen.has(pin.product.id)) {
      seen.add(pin.product.id);
      products.push(pin.product);
    }
    if (products.length >= 20) break;
  }

  return NextResponse.json({ products });
}
