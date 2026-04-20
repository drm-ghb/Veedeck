import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET — return existing key (or generate one on first call) */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { extensionKey: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Auto-generate key on first request
  if (!user.extensionKey) {
    const key = crypto.randomUUID();
    await prisma.user.update({ where: { id: session.user.id }, data: { extensionKey: key } });
    return NextResponse.json({ key });
  }

  return NextResponse.json({ key: user.extensionKey });
}

/** POST — regenerate key (invalidates old one) */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = crypto.randomUUID();
  await prisma.user.update({ where: { id: session.user.id }, data: { extensionKey: key } });
  return NextResponse.json({ key });
}

/** DELETE — revoke key */
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.user.update({ where: { id: session.user.id }, data: { extensionKey: null } });
  return NextResponse.json({ ok: true });
}
