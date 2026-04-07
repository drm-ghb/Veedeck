import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Settings, ShieldCheck } from "lucide-react";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import NotificationBell from "@/components/dashboard/NotificationBell";
import { HomeLinkIcon } from "@/components/dashboard/HomeLinkIcon";
import MobileMenu from "@/components/dashboard/MobileMenu";
import NavSidebar from "@/components/dashboard/NavSidebar";
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
    select: { name: true, email: true, isAdmin: true, navMode: true, globalHiddenModules: true },
  });

  const displayName = dbUser?.name || dbUser?.email || null;
  const navMode = dbUser?.navMode ?? "dashboard";
  const hiddenModules = dbUser?.globalHiddenModules ?? [];

  return (
    <div className="h-screen flex flex-col">
      <nav className="bg-card border-b">
        <div className="px-3 sm:px-6 flex items-center justify-between py-3 gap-4">

          {/* Home (Planospace launcher) */}
          <HomeLinkIcon hidden={navMode === "sidebar"} />

          {/* Logo */}
          <Link href="/renderflow" className="flex items-center gap-2 shrink-0">
            <Image src="/logo.svg" alt="Veedeck" width={28} height={28} className="block dark:hidden" />
            <Image src="/logo-dark.svg" alt="Veedeck" width={28} height={28} className="hidden dark:block" />
            <span className="text-xl font-bold">Veedeck</span>
          </Link>

          {/* Desktop: center links */}
          <div className="hidden md:flex items-center gap-6 flex-1 justify-center">
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
            <NotificationBell userId={session.user.id!} iconOnly />
            <Link
              href="/settings/renderflow"
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
      {navMode === "sidebar" ? (
        <div className="flex flex-1 min-h-0">
          <NavSidebar hiddenModules={hiddenModules} />
          <main className="flex-1 px-3 sm:px-6 py-4 sm:py-8 overflow-y-auto">
            {children}
          </main>
        </div>
      ) : (
        <main className="flex-1 px-3 sm:px-6 py-4 sm:py-8">
          {children}
        </main>
      )}
    </div>
  );
}
