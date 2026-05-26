import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import SurveyResponsesView from "@/components/ankiety/SurveyResponsesView";

export const metadata = { title: "Odpowiedzi na ankietę" };

export default async function SurveyResponsesPage({
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
    },
  });

  if (!survey) notFound();

  return <SurveyResponsesView survey={survey as any} />;
}
