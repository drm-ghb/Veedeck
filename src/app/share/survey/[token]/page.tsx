import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SurveyEmailGate from "@/components/ankiety/share/SurveyEmailGate";

export default async function PublicSurveyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const survey = await prisma.survey.findFirst({
    where: { shareToken: token },
    include: {
      sections: { orderBy: { order: "asc" } },
      questions: { orderBy: { order: "asc" } },
      user: { select: { name: true, clientLogoUrl: true } },
    },
  });

  if (!survey || survey.status !== "ACTIVE") notFound();

  return (
    <div className="min-h-screen bg-muted/40 flex flex-col">
      {/* Minimal header */}
      <header className="bg-card border-b border-border px-6 py-4 flex items-center gap-3">
        {survey.user.clientLogoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={survey.user.clientLogoUrl} alt="Logo" className="h-8 w-auto object-contain" />
        )}
        <span className="font-semibold text-sm text-foreground">{survey.user.name ?? ""}</span>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
          <h1 className="text-2xl font-bold text-foreground mb-2">{survey.name}</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Wypełnij ankietę i wyślij odpowiedzi.
          </p>
          <SurveyEmailGate
            token={token}
            survey={{
              id: survey.id,
              name: survey.name,
              sections: survey.sections as any,
              questions: survey.questions as any,
            }}
          />
        </div>
      </main>

      {/* Powered by footer */}
      <footer className="py-4 flex items-center justify-center gap-1.5 opacity-40 select-none">
        <span className="text-xs text-muted-foreground">Powered by veedeck</span>
      </footer>
    </div>
  );
}
