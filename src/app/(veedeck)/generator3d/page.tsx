import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { redirect } from "next/navigation";
import Generator3DView from "@/components/generator3d/Generator3DView";

export default async function Generator3DPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = getWorkspaceUserId(session);

  const models = await prisma.model3D.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <Generator3DView
      initialModels={models.map((m) => ({
        id: m.id,
        name: m.name,
        category: m.category,
        thumbnailUrl: m.thumbnailUrl,
        urlGlb: m.urlGlb,
        urlObj: m.urlObj,
        urlStl: m.urlStl,
        urlFbx: m.urlFbx,
        createdAt: m.createdAt.toISOString(),
      }))}
    />
  );
}
