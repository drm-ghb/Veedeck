import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const survey = await prisma.survey.findFirst({ where: { id, userId } });
  if (!survey) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const { questions } = await req.json();
  if (!Array.isArray(questions)) {
    return NextResponse.json({ error: "Nieprawidłowe dane" }, { status: 400 });
  }

  await prisma.$transaction(
    questions.map(({ id: qId, order }: { id: string; order: number }) =>
      prisma.surveyQuestion.update({ where: { id: qId }, data: { order } })
    )
  );

  return NextResponse.json({ success: true });
}
