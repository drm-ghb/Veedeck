import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const project = await prisma.project.findUnique({
    where: { shareToken: token },
    include: {
      rooms: {
        where: { archived: false },
        orderBy: { order: "asc" },
        include: {
          renders: {
            where: { archived: false },
            orderBy: { order: "asc" },
            include: {
              comments: {
                orderBy: { createdAt: "asc" },
                include: { replies: { orderBy: { createdAt: "asc" } } },
              },
            },
          },
        },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  return NextResponse.json(project);
}
