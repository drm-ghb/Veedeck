import { prisma } from "@/lib/prisma";

/** Validates the Bearer token from the Authorization header.
 *  Returns the matching user (owner or standalone designer) or null. */
export async function validateExtensionKey(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const key = auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (!key) return null;

  const user = await prisma.user.findUnique({
    where: { extensionKey: key },
    select: { id: true, name: true, email: true, ownerId: true },
  });
  if (!user) return null;

  // Respect workspace — team member's data lives under owner's account
  return { ...user, workspaceId: user.ownerId ?? user.id };
}
