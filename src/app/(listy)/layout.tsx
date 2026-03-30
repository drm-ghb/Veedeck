import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Grid2x2, Settings, ShoppingCart } from "lucide-react";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import { prisma } from "@/lib/prisma";

export default async function ListyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id! },
    select: { name: true, email: true },
  });

  const displayName = dbUser?.name || dbUser?.email || null;

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-card border-b">
        <div className="container mx-auto px-3 sm:px-6 max-w-6xl flex items-center justify-between py-3 gap-4">

          {/* Home (Planospace launcher) */}
          <Link
            href="/home"
            title="Planospace"
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-muted shrink-0"
          >
            <Grid2x2 size={18} />
          </Link>

          {/* Logo */}
          <Link href="/listy" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-[#19213D] flex items-center justify-center">
              <ShoppingCart size={15} className="text-white" />
            </div>
            <span className="text-xl font-bold">Listy</span>
          </Link>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right actions */}
          <div className="flex items-center gap-4 shrink-0">
            <span className="hidden md:block text-sm text-gray-500 dark:text-gray-400">{displayName}</span>
            <Link
              href="/settings"
              title="Ustawienia"
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-muted"
            >
              <Settings size={18} />
            </Link>
            <SignOutButton />
          </div>

        </div>
      </nav>
      <main className="flex-1 container mx-auto px-3 sm:px-6 py-4 sm:py-8 max-w-6xl">
        {children}
      </main>
    </div>
  );
}
