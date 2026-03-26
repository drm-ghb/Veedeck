import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SettingsPage } from "@/components/dashboard/SettingsPage";

export default async function SettingsRoute() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true },
  });

  if (!user) redirect("/login");

  return (
    <SettingsPage
      initialName={user.name ?? ""}
      initialEmail={user.email}
    />
  );
}
