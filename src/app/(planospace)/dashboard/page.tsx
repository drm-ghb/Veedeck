import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DashboardView from "@/components/dashboard/DashboardView";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { globalHiddenModules: true, navMode: true, name: true, email: true },
  });

  const hiddenModules = user?.globalHiddenModules ?? [];
  const navMode = user?.navMode ?? "dashboard";
  const displayName = user?.name || user?.email || null;

  // Fetch all active projects (for stats + recent + pending requests)
  const allProjects = await prisma.project.findMany({
    where: { userId, archived: false },
    select: {
      id: true,
      slug: true,
      title: true,
      clientName: true,
      updatedAt: true,
      renders: {
        where: { archived: false },
        select: { fileUrl: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: { select: { renders: { where: { archived: false } } } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const projectIds = allProjects.map((p) => p.id);
  const recentProjects = allProjects.slice(0, 6);
  const activeProjectCount = allProjects.length;

  // Parallel queries for remaining stats
  const [renderCount, listCount, pendingRequests, rendersWithComments] =
    await Promise.all([
      prisma.render.count({ where: { project: { userId }, archived: false } }),
      prisma.shoppingList.count({ where: { userId, archived: false } }),

      projectIds.length > 0
        ? prisma.statusChangeRequest.findMany({
            where: { projectId: { in: projectIds }, status: "PENDING" },
            orderBy: { createdAt: "desc" },
            take: 5,
          })
        : Promise.resolve([]),

      prisma.render.findMany({
        where: {
          project: { userId },
          archived: false,
          comments: { some: { status: "NEW", isInternal: false } },
        },
        select: {
          id: true,
          name: true,
          fileUrl: true,
          projectId: true,
          project: { select: { title: true, slug: true } },
          _count: {
            select: { comments: { where: { status: "NEW", isInternal: false } } },
          },
        },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
    ]);

  // Build project map for pending requests
  const projectMap = new Map(allProjects.map((p) => [p.id, p]));

  return (
    <DashboardView
      displayName={displayName}
      navMode={navMode}
      hiddenModules={hiddenModules}
      stats={{
        projects: activeProjectCount,
        renders: renderCount,
        lists: listCount,
        newComments: rendersWithComments.reduce(
          (sum, r) => sum + (r._count.comments ?? 0),
          0
        ),
        pendingRequests: pendingRequests.length,
      }}
      recentProjects={recentProjects.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        clientName: p.clientName,
        renderCount: p._count.renders,
        lastRenderUrl: p.renders[0]?.fileUrl ?? null,
        updatedAt: p.updatedAt.toISOString(),
      }))}
      pendingRequests={pendingRequests.map((r) => ({
        id: r.id,
        renderName: r.renderName,
        clientName: r.clientName ?? null,
        projectId: r.projectId,
        projectTitle: projectMap.get(r.projectId)?.title ?? "",
        projectSlug: projectMap.get(r.projectId)?.slug ?? null,
        createdAt: r.createdAt.toISOString(),
      }))}
      rendersWithComments={rendersWithComments.map((r) => ({
        id: r.id,
        name: r.name,
        fileUrl: r.fileUrl,
        projectId: r.projectId,
        projectTitle: r.project.title,
        projectSlug: r.project.slug,
        newCommentsCount: r._count.comments ?? 0,
      }))}
    />
  );
}
