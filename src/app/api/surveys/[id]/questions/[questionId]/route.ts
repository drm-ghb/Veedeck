import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = getWorkspaceUserId(session);
  const { id, questionId } = await params;

  const survey = await prisma.survey.findFirst({ where: { id, userId } });
  if (!survey) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const question = await prisma.surveyQuestion.findFirst({
    where: { id: questionId, surveyId: id },
  });
  if (!question) {
    return NextResponse.json({ error: "Nie znaleziono pytania" }, { status: 404 });
  }

  const { label, description, required, options, config, order, sectionId, type } = await req.json();

  const updated = await prisma.surveyQuestion.update({
    where: { id: questionId },
    data: {
      ...(label !== undefined ? { label: label.trim() } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(required !== undefined ? { required } : {}),
      ...(options !== undefined ? { options } : {}),
      ...(config !== undefined ? { config } : {}),
      ...(order !== undefined ? { order } : {}),
      ...(sectionId !== undefined ? { sectionId } : {}),
      ...(type !== undefined ? { type } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = getWorkspaceUserId(session);
  const { id, questionId } = await params;

  const survey = await prisma.survey.findFirst({ where: { id, userId } });
  if (!survey) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const question = await prisma.surveyQuestion.findFirst({
    where: { id: questionId, surveyId: id },
  });
  if (!question) {
    return NextResponse.json({ error: "Nie znaleziono pytania" }, { status: 404 });
  }

  await prisma.surveyQuestion.delete({ where: { id: questionId } });
  return NextResponse.json({ success: true });
}
