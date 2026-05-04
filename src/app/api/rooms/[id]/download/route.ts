import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import JSZip from "jszip";

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

  const room = await prisma.room.findUnique({
    where: { id },
    include: {
      project: true,
      folders: { where: { archived: false } },
      renders: { where: { archived: false }, orderBy: { order: "asc" } },
    },
  });

  if (!room || room.project.userId !== userId) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const zip = new JSZip();
  const folderMap = new Map(room.folders.map((f) => [f.id, f.name]));

  // Track used names per directory to handle conflicts
  const usedNamesPerDir = new Map<string, Set<string>>();

  function getUsedNames(dir: string): Set<string> {
    if (!usedNamesPerDir.has(dir)) usedNamesPerDir.set(dir, new Set());
    return usedNamesPerDir.get(dir)!;
  }

  await Promise.all(
    room.renders.map(async (render) => {
      try {
        const fileRes = await fetch(render.fileUrl);
        if (!fileRes.ok) return;
        const buffer = await fileRes.arrayBuffer();

        if (render.folderId && folderMap.has(render.folderId)) {
          const folderName = folderMap.get(render.folderId)!;
          const filename = uniqueName(render.name, getUsedNames(folderName));
          zip.folder(folderName)!.file(filename, buffer);
        } else {
          const filename = uniqueName(render.name, getUsedNames("__root__"));
          zip.file(filename, buffer);
        }
      } catch {
        // skip failed files
      }
    })
  );

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  const zipName = encodeURIComponent(room.name);

  return new NextResponse(zipBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename*=UTF-8''${zipName}.zip`,
    },
  });
}

function uniqueName(name: string, used: Set<string>): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let i = 2;
  while (used.has(`${stem} (${i})${ext}`)) i++;
  const unique = `${stem} (${i})${ext}`;
  used.add(unique);
  return unique;
}
