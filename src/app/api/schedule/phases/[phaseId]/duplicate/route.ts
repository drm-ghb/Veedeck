import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

// POST /api/schedule/phases/[phaseId]/duplicate
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ phaseId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const { phaseId } = await params;

  const phase = await prisma.schedulePhase.findFirst({
    where: { id: phaseId, client: { project: { userId } } },
    include: { items: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] } },
  });
  if (!phase) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const count = await prisma.schedulePhase.count({ where: { clientId: phase.clientId } });

  const duplicate = await prisma.schedulePhase.create({
    data: {
      clientId: phase.clientId,
      rfProjectId: phase.rfProjectId,
      name: `${phase.name} (kopia)`,
      startDate: phase.startDate,
      endDate: phase.endDate,
      done: false,
      hidden: phase.hidden,
      order: count,
      items: {
        create: phase.items.map((item) => ({
          name: item.name,
          description: item.description,
          startDate: item.startDate,
          endDate: item.endDate,
          done: false,
          hidden: item.hidden,
          order: item.order,
        })),
      },
    },
    include: { items: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] }, rfProject: { select: { id: true, title: true } } },
  });

  return NextResponse.json(duplicate);
}
