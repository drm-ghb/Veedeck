import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProjektyView from "@/components/projekty/ProjektyView";

export default async function ProjektyPage() {
  const session = await auth();

  const projects = await prisma.project.findMany({
    where: { userId: session!.user!.id!, archived: false },
    include: {
      _count: { select: { renders: true, rooms: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const serialized = projects.map((p) => ({
    id: p.id,
    title: p.title,
    clientName: p.clientName,
    clientEmail: p.clientEmail,
    description: p.description,
    renderCount: p._count.renders,
    roomCount: p._count.rooms,
    createdAt: p.createdAt.toISOString(),
  }));

  return <ProjektyView projects={serialized} />;
}
