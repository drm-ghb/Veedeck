import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const survey = await prisma.survey.findFirst({
    where: { id, userId },
    include: {
      sections: { orderBy: { order: "asc" } },
      questions: { orderBy: { order: "asc" } },
    },
  });
  if (!survey) return NextResponse.json({ error: "Nie znaleziono ankiety" }, { status: 404 });

  const templateName = (body.name as string)?.trim() || survey.name;
  const slug = await uniqueSlug(templateName, (s) =>
    prisma.survey.findUnique({ where: { slug: s } }).then(Boolean)
  );

  const template = await prisma.survey.create({
    data: {
      name: templateName,
      slug,
      userId,
      status: "DRAFT",
      isTemplate: true,
    },
  });

  const sectionIdMap: Record<string, string> = {};
  if (survey.sections.length > 0) {
    const created = await prisma.$transaction(
      survey.sections.map((s) =>
        prisma.surveySection.create({
          data: { name: s.name, order: s.order, surveyId: template.id },
        })
      )
    );
    survey.sections.forEach((orig, i) => {
      sectionIdMap[orig.id] = created[i].id;
    });
  }

  if (survey.questions.length > 0) {
    await prisma.surveyQuestion.createMany({
      data: survey.questions.map((q) => ({
        label: q.label,
        description: q.description,
        type: q.type,
        required: q.required,
        order: q.order,
        options: q.options ?? undefined,
        config: q.config ?? undefined,
        surveyId: template.id,
        sectionId: q.sectionId ? (sectionIdMap[q.sectionId] ?? null) : null,
      })),
    });
  }

  return NextResponse.json(template, { status: 201 });
}
