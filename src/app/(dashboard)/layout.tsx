import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { LayoutGrid, Settings, ShieldCheck } from "lucide-react";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import NotificationBell from "@/components/dashboard/NotificationBell";
import MobileMenu from "@/components/dashboard/MobileMenu";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id! },
    select: { name: true, email: true, isAdmin: true },
  });

  const displayName = dbUser?.name || dbUser?.email || null;

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-card border-b">
        <div className="container mx-auto px-6 max-w-6xl flex items-center justify-between py-3 gap-4">

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <Image src="/logo.svg" alt="RenderFlow" width={28} height={28} className="block dark:hidden" />
            <Image src="/logo-dark.svg" alt="RenderFlow" width={28} height={28} className="hidden dark:block" />
            <span className="text-xl font-bold">Render<span className="text-[#19213D] dark:text-white">Flow</span></span>
          </Link>

          {/* Desktop: center links */}
          <div className="hidden md:flex items-center gap-6 flex-1 justify-center">
            <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
              <LayoutGrid size={16} />
              Projekty
            </Link>
            <NotificationBell userId={session.user.id!} />
            {dbUser?.isAdmin && (
              <Link href="/admin" className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors">
                <ShieldCheck size={16} />
                Admin
              </Link>
            )}
          </div>

          {/* Desktop: right actions */}
          <div className="hidden md:flex items-center gap-4 shrink-0">
            <span className="text-sm text-gray-500 dark:text-gray-400">{displayName}</span>
            <Link
              href="/settings"
              title="Ustawienia"
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-muted"
            >
              <Settings size={18} />
            </Link>
            <SignOutButton />
          </div>

          {/* Mobile: bell + hamburger */}
          <div className="md:hidden flex items-center gap-2 shrink-0">
            <NotificationBell userId={session.user.id!} iconOnly />
            <MobileMenu userName={displayName} />
          </div>

        </div>
      </nav>
      <main className="flex-1 container mx-auto px-6 py-8 max-w-6xl">
        {children}
      </main>
    </div>
  );
}
