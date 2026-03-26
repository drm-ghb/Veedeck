import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
  }

  const { name, email } = await req.json();

  if (email && email !== session.user.email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Adres email jest już zajęty" }, { status: 409 });
    }
  }

  const data: { name?: string; email?: string } = {};
  if (name !== undefined) data.name = name;
  if (email !== undefined) data.email = email;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json(user);
}
