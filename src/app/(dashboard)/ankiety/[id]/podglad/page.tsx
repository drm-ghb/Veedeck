import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import SurveyPreview from "@/components/ankiety/SurveyPreview";

export const metadata = { title: "Podgląd ankiety" };

export default async function SurveyPreviewPage({
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
      user: { select: { name: true, clientLogoUrl: true } },
    },
  });

  if (!survey) notFound();

  return <SurveyPreview survey={survey as any} />;
}
