import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateExtensionKey } from "@/lib/extension-auth";

/** GET — returns lists (with sections) and projects for the extension popup */
export async function GET(req: Request) {
  const user = await validateExtensionKey(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [lists, projects] = await Promise.all([
    prisma.shoppingList.findMany({
      where: { userId: user.workspaceId, archived: false },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        projectId: true,
        project: { select: { title: true } },
        sections: {
          orderBy: { order: "asc" },
          select: { id: true, name: true },
        },
      },
    }),
    prisma.project.findMany({
      where: { userId: user.workspaceId, archived: false },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true },
    }),
  ]);

  return NextResponse.json({ lists, projects });
}
