import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/client-docs/folders/reorder
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderedIds } = await req.json();
  if (!Array.isArray(orderedIds)) return NextResponse.json({ error: "orderedIds required" }, { status: 400 });

  await Promise.all(
    orderedIds.map((id: string, index: number) =>
      prisma.clientDocFolder.updateMany({
        where: { id, client: { project: { userId } } },
        data: { order: index },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
