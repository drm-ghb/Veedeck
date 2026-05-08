import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

function validatePassword(pwd: string): boolean {
  return pwd.length >= 8 && /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd);
}

export async function POST(req: NextRequest) {
  const { fullName, name, email, password } = await req.json();

  if (!fullName || !email || !password) {
    return NextResponse.json({ error: "Brakujące pola" }, { status: 400 });
  }

  if (!validatePassword(password)) {
    return NextResponse.json({ error: "Hasło nie spełnia wymagań bezpieczeństwa" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Email już zarejestrowany" },
      { status: 400 }
    );
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      fullName: fullName.trim(),
      name: name?.trim() || null,
      email,
      password: hashed,
      navMode: "sidebar",
    },
  });

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}
