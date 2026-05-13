import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { validatePassword } from "@/lib/validation";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
  }

  // 10 attempts per user per minute to prevent brute-forcing own password
  if (!rateLimit(`password:${session.user.id}`, 10)) {
    return NextResponse.json({ error: "Za dużo prób. Spróbuj ponownie za chwilę." }, { status: 429 });
  }

  const { currentPassword, newPassword } = await req.json();

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.password) {
    return NextResponse.json({ error: "Brak hasła dla tego konta" }, { status: 400 });
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Aktualne hasło jest nieprawidłowe" }, { status: 400 });
  }

  if (!newPassword || !validatePassword(newPassword)) {
    return NextResponse.json(
      { error: "Nowe hasło musi mieć min. 8 znaków, zawierać małą i dużą literę oraz cyfrę" },
      { status: 400 }
    );
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashed },
  });

  return NextResponse.json({ success: true });
}
