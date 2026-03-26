import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SettingsPage } from "@/components/dashboard/SettingsPage";

export default async function SettingsRoute() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      allowDirectStatusChange: true,
      allowClientComments: true,
      allowClientAcceptance: true,
      requireClientEmail: true,
      hideCommentCount: true,
      requirePinTitle: true,
      maxPinsPerRender: true,
      autoClosePinsOnAccept: true,
      autoArchiveOnAccept: true,
      defaultRenderStatus: true,
      defaultRenderOrder: true,
      notifyClientOnStatusChange: true,
      notifyClientOnReply: true,
      clientLogoUrl: true,
      clientWelcomeMessage: true,
      accentColor: true,
    },
  });

  if (!user) redirect("/login");

  return (
    <SettingsPage
      initialName={user.name ?? ""}
      initialEmail={user.email}
      initialAllowDirectStatusChange={user.allowDirectStatusChange}
      initialAllowClientComments={user.allowClientComments}
      initialAllowClientAcceptance={user.allowClientAcceptance}
      initialRequireClientEmail={user.requireClientEmail}
      initialHideCommentCount={user.hideCommentCount}
      initialRequirePinTitle={user.requirePinTitle}
      initialMaxPinsPerRender={user.maxPinsPerRender}
      initialAutoClosePinsOnAccept={user.autoClosePinsOnAccept}
      initialAutoArchiveOnAccept={user.autoArchiveOnAccept}
      initialDefaultRenderStatus={user.defaultRenderStatus}
      initialDefaultRenderOrder={user.defaultRenderOrder}
      initialNotifyClientOnStatusChange={user.notifyClientOnStatusChange}
      initialNotifyClientOnReply={user.notifyClientOnReply}
      initialClientLogoUrl={user.clientLogoUrl}
      initialClientWelcomeMessage={user.clientWelcomeMessage}
      initialAccentColor={user.accentColor}
    />
  );
}
