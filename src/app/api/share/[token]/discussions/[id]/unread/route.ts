import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; id: string }> }
) {
  const { token, id } = await params;

  const project = await prisma.project.findUnique({
    where: { shareToken: token },
    select: { archived: true, shareExpiresAt: true, discussion: { select: { id: true } } },
  });

  if (!project || project.archived) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  if (project.shareExpiresAt && new Date() > new Date(project.shareExpiresAt)) {
    return NextResponse.json({ error: "Link wygasł" }, { status: 410 });
  }
  if (!project.discussion || project.discussion.id !== id) {
    return NextResponse.json({ error: "Nie znaleziono dyskusji" }, { status: 404 });
  }

  const since = req.nextUrl.searchParams.get("since");
  const sinceDate = since ? new Date(since) : null;

  const count = await prisma.discussionMessage.count({
    where: {
      discussionId: id,
      userId: { not: null }, // only designer messages
      ...(sinceDate && !isNaN(sinceDate.getTime()) ? { createdAt: { gt: sinceDate } } : {}),
    },
  });

  return NextResponse.json({ count });
}
