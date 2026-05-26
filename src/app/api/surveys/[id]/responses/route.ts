import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const { id } = await params;
  const survey = await prisma.survey.findFirst({
    where: { id, userId },
    include: {
      questions: { orderBy: { order: "asc" } },
      sections: { orderBy: { order: "asc" } },
    },
  });
  if (!survey) return NextResponse.json({ error: "Nie znaleziono" }, { status: 403 });

  const responses = await prisma.surveyResponse.findMany({
    where: { surveyId: id, completedAt: { not: null } },
    orderBy: { completedAt: "desc" },
    include: {
      answers: { include: { question: { select: { id: true, label: true, type: true } } } },
    },
  });

  return NextResponse.json({
    survey: {
      id: survey.id,
      name: survey.name,
      questions: survey.questions,
      sections: survey.sections,
    },
    responses,
  });
}
