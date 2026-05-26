import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = getWorkspaceUserId(session);
  const { id, sectionId } = await params;

  const survey = await prisma.survey.findFirst({ where: { id, userId } });
  if (!survey) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const section = await prisma.surveySection.findFirst({
    where: { id: sectionId, surveyId: id },
  });
  if (!section) {
    return NextResponse.json({ error: "Nie znaleziono sekcji" }, { status: 404 });
  }

  const { name, order } = await req.json();

  const updated = await prisma.surveySection.update({
    where: { id: sectionId },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(order !== undefined ? { order } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = getWorkspaceUserId(session);
  const { id, sectionId } = await params;

  const survey = await prisma.survey.findFirst({ where: { id, userId } });
  if (!survey) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const section = await prisma.surveySection.findFirst({
    where: { id: sectionId, surveyId: id },
  });
  if (!section) {
    return NextResponse.json({ error: "Nie znaleziono sekcji" }, { status: 404 });
  }

  // Unlink questions from section before deleting
  await prisma.surveyQuestion.updateMany({
    where: { sectionId },
    data: { sectionId: null },
  });

  await prisma.surveySection.delete({ where: { id: sectionId } });
  return NextResponse.json({ success: true });
}
