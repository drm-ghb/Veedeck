import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import SurveysClient from "@/components/ankiety/SurveysClient";

export const metadata = { title: "Ankiety" };

export default async function AnkietyPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = getWorkspaceUserId(session as any);

  const [surveys, projects, customTemplates] = await Promise.all([
    prisma.survey.findMany({
      where: { userId, isTemplate: false },
      include: {
        project: { select: { id: true, title: true } },
        client: { select: { id: true, name: true } },
        _count: { select: { responses: true } },
      },
      orderBy: { order: "asc" },
    }),
    prisma.project.findMany({
      where: { userId, archived: false },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.survey.findMany({
      where: { userId, isTemplate: true },
      include: {
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return <SurveysClient surveys={surveys as any} projects={projects} customTemplates={customTemplates as any} />;
}
