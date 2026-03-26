import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { LayoutGrid, Settings } from "lucide-react";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import { SettingsButton } from "@/components/dashboard/SettingsButton";
import NotificationBell from "@/components/dashboard/NotificationBell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-card border-b">
        <div className="container mx-auto px-6 max-w-6xl flex items-center justify-between py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src="/logo.svg" alt="RenderFlow" width={28} height={28} className="block dark:hidden" />
            <Image src="/logo-dark.svg" alt="RenderFlow" width={28} height={28} className="hidden dark:block" />
            <span className="text-xl font-bold">Render<span className="text-blue-600">Flow</span></span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors">
              <LayoutGrid size={16} />
              Projekty
            </Link>
            <Link href="/settings" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors">
              <Settings size={16} />
              Ustawienia
            </Link>
            <NotificationBell userId={session.user.id!} />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{session.user.name || session.user.email}</span>
            <SettingsButton />
            <SignOutButton />
          </div>
        </div>
      </nav>
      <main className="flex-1 container mx-auto px-6 py-8 max-w-6xl">
        {children}
      </main>
    </div>
  );
}
