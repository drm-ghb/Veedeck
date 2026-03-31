"use client";

import Link from "next/link";
import { Home } from "lucide-react";

interface ShareNavbarProps {
  backHref?: string;
  backLabel?: string;
}

export default function ShareNavbar({ backHref, backLabel }: ShareNavbarProps) {
  return (
    <nav className="bg-card border-b">
      <div className="container mx-auto px-3 sm:px-6 max-w-6xl flex items-center justify-between py-3 gap-4">
        {/* Planospace logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/planospace-logo.svg" alt="Planospace" width={28} height={28} className="block dark:hidden" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/planospace-logo-dark.svg" alt="Planospace" width={28} height={28} className="hidden dark:block" />
          <span className="text-xl font-bold tracking-tight">Planospace</span>
        </div>

        {backHref && (
          <Link
            href={backHref}
            title={backLabel ?? "Strona główna projektu"}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted"
          >
            <Home size={18} />
            <span className="hidden sm:inline">{backLabel ?? "Powrót"}</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
