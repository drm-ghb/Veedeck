import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminUsersClient from "./AdminUsersClient";

export default async function AdminPage() {
  const session = await auth();
  if (!(session?.user as any)?.isAdmin) notFound();

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      isAdmin: true,
      createdAt: true,
      _count: { select: { projects: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Panel administratora</h1>
        <p className="text-gray-500 mt-1">Zarządzaj zarejestrowanymi użytkownikami</p>
      </div>

      <AdminUsersClient users={users} currentUserId={session!.user!.id!} />
    </div>
  );
}
