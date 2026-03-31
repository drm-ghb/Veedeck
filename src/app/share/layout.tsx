import Link from "next/link";
import Image from "next/image";

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-card border-b">
        <div className="container mx-auto px-3 sm:px-6 max-w-6xl flex items-center py-3 gap-3">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image src="/logo.svg" alt="RenderFlow" width={28} height={28} className="block dark:hidden" />
            <Image src="/logo-dark.svg" alt="RenderFlow" width={28} height={28} className="hidden dark:block" />
            <span className="text-xl font-bold">Render<span className="text-[#19213D] dark:text-white">Flow</span></span>
          </Link>
        </div>
      </nav>
      <main className="flex-1 container mx-auto px-3 sm:px-6 py-4 sm:py-8 max-w-6xl">
        {children}
      </main>
    </div>
  );
}
