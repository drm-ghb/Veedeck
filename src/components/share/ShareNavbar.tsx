"use client";

import Link from "next/link";
import Image from "next/image";
import { Home } from "lucide-react";

interface ShareNavbarProps {
  backHref?: string;
  backLabel?: string;
}

export default function ShareNavbar({ backHref, backLabel }: ShareNavbarProps) {
  return (
    <nav className="bg-card border-b sticky top-0 z-10">
      <div className="container mx-auto px-3 sm:px-6 max-w-6xl flex items-center justify-between py-3 gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image src="/logo.svg" alt="RenderFlow" width={28} height={28} className="block dark:hidden" />
            <Image src="/logo-dark.svg" alt="RenderFlow" width={28} height={28} className="hidden dark:block" />
            <span className="text-xl font-bold">Render<span className="text-[#19213D] dark:text-white">Flow</span></span>
          </Link>
        </div>

        {backHref && (
          <Link
            href={backHref}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home size={15} />
            {backLabel ?? "Strona główna"}
          </Link>
        )}
      </div>
    </nav>
  );
}
