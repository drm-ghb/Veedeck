import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateClientLogin } from "@/lib/client-login";
import bcrypt from "bcryptjs";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const project = await prisma.project.findFirst({ where: { id, userId } });
  if (!project) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const clients = await prisma.projectClient.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, login: true, email: true, role: true } } },
  });

  return NextResponse.json(clients);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const project = await prisma.project.findFirst({ where: { id, userId } });
  if (!project) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const { name, email, phone, isMainContact, startDate, endDate, password, login: customLogin } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Imię jest wymagane" }, { status: 400 });

  // If this is the main contact, unset all others first
  if (isMainContact) {
    await prisma.projectClient.updateMany({
      where: { projectId: id },
      data: { isMainContact: false },
    });
  }

  let clientUserId: string | null = null;

  // Create client account if password provided
  if (password?.trim()) {
    if (password.trim().length < 4) {
      return NextResponse.json({ error: "Hasło musi mieć co najmniej 4 znaki" }, { status: 400 });
    }

    if (email?.trim()) {
      // New mechanism: email as login
      const emailLogin = email.trim().toLowerCase();
      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ email: emailLogin }, { login: emailLogin }] },
      });
      if (existingUser) {
        clientUserId = existingUser.id;
      } else {
        const hashedPassword = await bcrypt.hash(password.trim(), 10);
        const clientUser = await prisma.user.create({
          data: {
            name: name.trim(),
            email: emailLogin,
            login: emailLogin,
            password: hashedPassword,
            role: "client",
            phone: phone?.trim() || null,
            contactEmail: emailLogin,
          },
        });
        clientUserId = clientUser.id;
      }
    } else {
      // Old mechanism (backward compat): generated login + @client.internal
      const baseLogin = customLogin?.trim() || generateClientLogin(name.trim());
      if (!baseLogin) return NextResponse.json({ error: "Nie można wygenerować loginu z podanego imienia" }, { status: 400 });

      const internalEmail = `${baseLogin}@client.internal`;
      const [existingLogin, existingEmail] = await Promise.all([
        prisma.user.findUnique({ where: { login: baseLogin } }),
        prisma.user.findUnique({ where: { email: internalEmail } }),
      ]);
      if (existingLogin || existingEmail) {
        return NextResponse.json({ error: `Login "${baseLogin}" jest już zajęty` }, { status: 409 });
      }

      const hashedPassword = await bcrypt.hash(password.trim(), 10);
      const clientUser = await prisma.user.create({
        data: {
          name: name.trim(),
          email: internalEmail,
          login: baseLogin,
          password: hashedPassword,
          role: "client",
          phone: phone?.trim() || null,
          contactEmail: null,
        },
      });
      clientUserId = clientUser.id;
    }
  }

  const client = await prisma.projectClient.create({
    data: {
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      isMainContact: !!isMainContact,
      projectId: id,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      userId: clientUserId,
    },
    include: { user: { select: { id: true, login: true, email: true } } },
  });

  // Sync project clientName/clientEmail/clientPhone if main contact
  if (isMainContact) {
    await prisma.project.update({
      where: { id },
      data: { clientName: client.name, clientEmail: client.email ?? null, clientPhone: client.phone ?? null },
    });
  }

  return NextResponse.json(client);
}
