import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

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

  const survey = await prisma.survey.findFirst({ where: { id, userId } });
  if (!survey) {
    return NextResponse.json({ error: "Nie znaleziono ankiety" }, { status: 404 });
  }

  const sections = await prisma.surveySection.findMany({
    where: { surveyId: id },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(sections);
}

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

  const { name, order } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Nazwa sekcji jest wymagana" }, { status: 400 });
  }

  let sectionOrder = order;
  if (sectionOrder === undefined) {
    const last = await prisma.surveySection.findFirst({
      where: { surveyId: id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    sectionOrder = last ? last.order + 1 : 0;
  }

  const section = await prisma.surveySection.create({
    data: {
      name: name.trim(),
      order: sectionOrder,
      surveyId: id,
    },
  });

  return NextResponse.json(section, { status: 201 });
}
