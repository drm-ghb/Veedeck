import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Briefcase, Package } from "lucide-react";

export default async function HomePage() {
  const session = await auth();
  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { globalHiddenModules: true, navMode: true, name: true, email: true },
      })
    : null;

  const hidden = user?.globalHiddenModules ?? [];
  const navMode = user?.navMode ?? "dashboard";
  const displayName = user?.name || user?.email || null;

  if (navMode === "sidebar") {
    return (
      <div className="flex flex-col items-start justify-start">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {displayName ? `Witamy, ${displayName}!` : "Witamy w Veedeck!"}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">Wybierz moduł z paska bocznego, aby rozpocząć pracę.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        {displayName ? `Witamy, ${displayName}!` : "Witamy w Veedeck!"}
      </h1>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6">
        MODUŁY
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">

        {/* Projekty — zawsze widoczne */}
        <Link
          href="/projekty"
          className="group flex flex-col items-center gap-3 p-4 rounded-xl bg-card border border-border hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer"
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-150 bg-[#C45824]">
            <Briefcase size={32} className="text-white" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground leading-tight">Projekty</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Centralne zarządzanie projektami</p>
          </div>
        </Link>

        {/* RenderFlow */}
        {!hidden.includes("renderflow") && (
          <Link
            href="/renderflow"
            className="group flex flex-col items-center gap-3 p-4 rounded-xl bg-card border border-border hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-150 bg-[#C45824]">
              <Image src="/logo-dark.svg" alt="RenderFlow" width={48} height={48} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground leading-tight">RenderFlow</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Zarządzanie renderami i feedbackiem</p>
            </div>
          </Link>
        )}

        {/* Listy */}
        {!hidden.includes("listy") && (
          <Link
            href="/listy"
            className="group flex flex-col items-center gap-3 p-4 rounded-xl bg-card border border-border hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-150 bg-[#C45824]">
              <ShoppingCart size={32} className="text-white" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground leading-tight">Listy</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Listy zakupowe dla klientów</p>
            </div>
          </Link>
        )}

        {/* Produkty */}
        {!hidden.includes("produkty") && (
          <Link
            href="/produkty"
            className="group flex flex-col items-center gap-3 p-4 rounded-xl bg-card border border-border hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-150 bg-[#7c3aed]">
              <Package size={32} className="text-white" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground leading-tight">Produkty</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Baza produktów projektanta</p>
            </div>
          </Link>
        )}

      </div>
    </div>
  );
}
