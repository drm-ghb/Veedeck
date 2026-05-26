import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import SurveyEditor from "@/components/ankiety/SurveyEditor";

export const metadata = { title: "Edytor ankiety" };

export default async function EditSurveyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = getWorkspaceUserId(session as any);
  const { id } = await params;

  const survey = await prisma.survey.findFirst({
    where: { id, userId },
    include: {
      sections: { orderBy: { order: "asc" } },
      questions: { orderBy: { order: "asc" } },
      project: { select: { id: true, title: true } },
      client: { select: { id: true, name: true } },
    },
  });

  if (!survey) notFound();

  return <SurveyEditor survey={survey as any} />;
}
