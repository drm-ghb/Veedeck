import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

// PATCH /api/projects/[id]/schedule-share — toggle scheduleSharedWithClient
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const { id } = await params;
  const project = await prisma.project.findFirst({ where: { id, userId } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { shared } = await req.json();

  const updated = await prisma.project.update({
    where: { id },
    data: { scheduleSharedWithClient: !!shared },
    select: { scheduleSharedWithClient: true },
  });

  return NextResponse.json(updated);
}
