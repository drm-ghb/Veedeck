import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "@/components/ui/icons";
import { LogoBrand } from "@/components/dashboard/LogoBrand";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import NotificationBell from "@/components/dashboard/NotificationBell";
import MobileMenu from "@/components/dashboard/MobileMenu";
import MobileSearch from "@/components/dashboard/MobileSearch";
import NavSidebar from "@/components/dashboard/NavSidebar";
import GlobalSearch from "@/components/dashboard/GlobalSearch";
import { QuickNoteButton } from "@/components/notatnik/QuickNoteButton";
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
    select: { name: true, fullName: true, email: true, isAdmin: true, globalHiddenModules: true, clientLogoUrl: true, avatarUrl: true, ownerId: true },
  });

  // Jeśli to członek zespołu — pobierz ustawienia projektanta
  const ownerId = dbUser?.ownerId;
  const ownerSettings = ownerId
    ? await prisma.user.findUnique({
        where: { id: ownerId },
        select: { globalHiddenModules: true, clientLogoUrl: true },
      })
    : null;

  const fullName = dbUser?.fullName ?? null;
  const firstName = fullName ? fullName.split(" ")[0] : (dbUser?.name || dbUser?.email || null);
  const avatarUrl = dbUser?.avatarUrl ?? null;
  const hiddenModules = (ownerSettings ?? dbUser)?.globalHiddenModules ?? [];
  const logoUrl = (ownerSettings ?? dbUser)?.clientLogoUrl ?? null;

  return (
    <div className="h-dvh flex flex-col bg-muted/60">
      <nav className="relative z-10">
        <div className="px-4 flex items-center gap-4 py-3 relative">
          {/* Left: logo */}
          <div className="flex items-center gap-2 shrink-0">
            <LogoBrand />
            {dbUser?.isAdmin && (
              <Link href="/admin" className="hidden md:flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors ml-2">
                <ShieldCheck size={16} />
                Admin
              </Link>
            )}
          </div>

          {/* Search - centered */}
          <div className="absolute left-1/2 -translate-x-1/2 w-full max-w-sm px-4 hidden sm:block">
            <GlobalSearch />
          </div>

          {/* Right: bell + avatar + logout */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <div className="md:hidden"><MobileSearch /></div>
            <QuickNoteButton />
            <NotificationBell userId={session.user.id!} iconOnly />
            {firstName && (
              <div className="hidden md:flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold leading-none shrink-0 overflow-hidden">
                  {avatarUrl
                    ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    : firstName[0].toUpperCase()
                  }
                </div>
                <span className="text-sm font-medium text-foreground">{firstName}</span>
              </div>
            )}
            <div className="hidden md:block"><SignOutButton /></div>
            <div className="md:hidden">
              <MobileMenu userName={firstName} logoUrl={avatarUrl} hiddenModules={hiddenModules} />
            </div>
          </div>
        </div>
      </nav>
      <div className="flex flex-1 min-h-0">
        <NavSidebar hiddenModules={hiddenModules} isAdmin={dbUser?.isAdmin ?? false} />
        <main className="flex-1 px-6 py-6 overflow-y-auto overflow-x-hidden bg-background rounded-tl-2xl">
          {children}
        </main>
      </div>
    </div>
  );
}
