import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import bcrypt from "bcryptjs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { password } = body;

  if (!password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Hasło musi mieć minimum 8 znaków" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 12);
  const target = await prisma.user.update({
    where: { id },
    data: { password: hashed },
    select: { email: true },
  });

  await logActivity({
    level: "info",
    action: "ADMIN_PASSWORD_RESET",
    message: `Admin zmienił hasło użytkownika: ${target.email}`,
    userId: session.user.id,
    meta: { targetUserId: id, targetEmail: target.email },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json({ error: "Nie możesz usunąć własnego konta" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { email: true, name: true } });
  await prisma.user.delete({ where: { id } });
  await logActivity({
    level: "info",
    action: "USER_DELETED",
    message: `Admin usunął użytkownika: ${target?.email ?? id}`,
    userId: session.user.id,
    meta: { deletedUserId: id, deletedEmail: target?.email },
  });
  return NextResponse.json({ success: true });
}
