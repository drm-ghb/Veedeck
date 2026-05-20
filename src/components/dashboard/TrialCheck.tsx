import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TrialExpiredModal from "./TrialExpiredModal";

export default async function TrialCheck() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      isFree: true,
      isAdmin: true,
      role: true,
      trialEndsAt: true,
      subscription: { select: { status: true, cancelAt: true } },
    },
  });

  if (!user || user.isAdmin || user.role !== "designer") return null;

  const sub = user.subscription;
  const hasAccess =
    user.isFree ||
    sub?.status === "active" ||
    (sub?.status === "cancelled" && !!sub.cancelAt && new Date(sub.cancelAt) > new Date());

  if (hasAccess) return null;
  if (!user.trialEndsAt || new Date(user.trialEndsAt) >= new Date()) return null;

  return <TrialExpiredModal />;
}
