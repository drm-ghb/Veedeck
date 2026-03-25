import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import RoomView from "@/components/render/RoomView";
import RenderUploader from "@/components/render/RenderUploader";

interface Props {
  params: Promise<{ id: string; roomId: string }>;
}

export default async function RoomPage({ params }: Props) {
  const session = await auth();
  const { id, roomId } = await params;

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { project: true },
  });

  if (!room || room.project.userId !== session!.user!.id!) notFound();

  const [renders, archivedRenders] = await Promise.all([
    prisma.render.findMany({
      where: { roomId, archived: false },
      include: { _count: { select: { comments: true } } },
      orderBy: { order: "asc" },
    }),
    prisma.render.findMany({
      where: { roomId, archived: true },
      include: { _count: { select: { comments: true } } },
      orderBy: { order: "asc" },
    }),
  ]);

  return (
    <div>
      <div className="mb-2">
        <Link href={`/projects/${id}`} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-0.5 w-fit">
          <ChevronLeft size={14} /> {room.project.title}
        </Link>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{room.name}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{renders.length} {renders.length === 1 ? "render" : "renderów"}</p>
        </div>
        <RenderUploader projectId={id} roomId={roomId} />
      </div>

      <RoomView
        projectId={id}
        roomId={roomId}
        renders={renders.map((r) => ({
          id: r.id,
          name: r.name,
          fileUrl: r.fileUrl,
          commentCount: r._count.comments,
          status: r.status,
        }))}
        archivedRenders={archivedRenders.map((r) => ({
          id: r.id,
          name: r.name,
          fileUrl: r.fileUrl,
          commentCount: r._count.comments,
          status: r.status,
        }))}
      />
    </div>
  );
}
