import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import ShareNavbar from "@/components/share/ShareNavbar";
import ShareSidebar from "@/components/share/ShareSidebar";
import ClientGreeting from "@/components/share/ClientGreeting";
import ClientNameGate from "@/components/share/ClientNameGate";
import ClientThemeApplier from "@/components/share/ClientThemeApplier";

export default async function ProjectHomePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const project = await prisma.project.findUnique({
    where: { shareToken: token },
    include: {
      renders: { where: { archived: false }, select: { id: true }, take: 1 },
      shoppingLists: { select: { id: true, name: true, shareToken: true } },
      user: { select: { clientLogoUrl: true, name: true, navMode: true, clientWelcomeMessage: true, showProfileName: true, showClientLogo: true, requireClientEmail: true, colorTheme: true } },
      discussion: { select: { id: true } },
    },
  });

  if (!project || project.archived) notFound();

  // If project has client accounts → non-logged-in visitors must log in
  const session = await auth();
  if (!session?.user) {
    const hasClientAccounts = await prisma.projectClient.findFirst({
      where: { projectId: project.id, userId: { not: null } },
    });
    if (hasClientAccounts) redirect("/login");
  }

  const hasRenders = project.renders.length > 0;
  const showRenderFlow = !project.hiddenModules.includes("renderflow");
  const showListy = !project.hiddenModules.includes("listy");
  const hasDyskusje = !project.hiddenModules.includes("dyskusje");
  const welcomeMessage = project.user.clientWelcomeMessage?.trim() || null;
  const greeting = project.clientName ? `Witamy, ${project.clientName}!` : "Witaj w projekcie!";

  return (
    <ClientNameGate
      token={token}
      requireClientEmail={project.user.requireClientEmail}
      clientLogoUrl={project.user.showClientLogo ? project.user.clientLogoUrl : null}
      designerName={project.user.showProfileName ? project.user.name : null}
    >
    <ClientThemeApplier colorTheme={project.user.colorTheme} />
    <div className="h-dvh flex flex-col bg-muted/60">
      <ShareNavbar
        clientLogoUrl={project.user.showClientLogo ? project.user.clientLogoUrl : null}
        designerName={project.user.showProfileName ? project.user.name : null}
        projectShareToken={token}
      />
      <div className="flex flex-1 min-h-0">
        <ShareSidebar
          token={token}
          discussionId={project.discussion?.id}
          showRenderFlow={showRenderFlow && hasRenders}
          showListy={showListy}
          showDyskusje={hasDyskusje}
          shoppingLists={project.shoppingLists}
        />
        <main className="flex-1 overflow-y-auto px-6 py-6 bg-background rounded-tl-2xl">
          <div className="flex flex-col items-start justify-start">
            <ClientGreeting projectShareToken={token} fallbackGreeting={greeting} className="text-2xl font-bold text-gray-900 dark:text-gray-100" />
            <p className="text-sm text-muted-foreground mt-2">
              {welcomeMessage ?? "Wybierz moduł z paska bocznego, aby przeglądać projekt."}
            </p>
          </div>
        </main>
      </div>
    </div>
    </ClientNameGate>
  );
}
