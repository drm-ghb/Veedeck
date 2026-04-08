"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Briefcase, ShoppingCart, Package, PanelLeftClose, PanelLeftOpen, Settings, Sun, Moon, HelpCircle, X, CheckCircle } from "lucide-react";
import { useTheme } from "@/lib/theme";

interface NavSidebarProps {
  hiddenModules: string[];
}

const items = [
  { label: "Dashboard", href: "/home", icon: <LayoutDashboard size={18} />, slug: null },
  { label: "Projekty", href: "/projekty", icon: <Briefcase size={18} />, slug: null },
  { label: "RenderFlow", href: "/renderflow", icon: null, slug: "renderflow" },
  { label: "Listy", href: "/listy", icon: <ShoppingCart size={18} />, slug: "listy" },
  { label: "Produkty", href: "/produkty", icon: <Package size={18} />, slug: "produkty" },
];

function getSettingsHref(pathname: string): string {
  if (pathname.startsWith("/renderflow")) return "/settings/renderflow";
  if (pathname.startsWith("/listy")) return "/settings/listy";
  return "/settings/ogolne";
}

const HIDDEN_ON: RegExp[] = [
  /^\/projects\/[^/]+\/renders\//,
  /^\/listy\/.+/,
];

export default function NavSidebar({ hiddenModules }: NavSidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpSubject, setHelpSubject] = useState("");
  const [helpDesc, setHelpDesc] = useState("");
  const [helpSent, setHelpSent] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("nav-sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("nav-sidebar-collapsed", String(next));
  }

  const forceCollapsed = HIDDEN_ON.some((pattern) => pattern.test(pathname));
  const isCollapsed = forceCollapsed || collapsed;

  const visible = items.filter((item) => !item.slug || !hiddenModules.includes(item.slug));

  return (
    <>
    <aside className={`hidden md:flex flex-col flex-shrink-0 transition-all duration-200 ${isCollapsed ? "w-14" : "w-52"}`}>
      <nav className="flex-1 p-2 space-y-0.5">
        {visible.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-gray-600 dark:text-gray-400 hover:bg-muted hover:text-foreground"
              }`}
            >
              <span className="flex-shrink-0 w-5 flex items-center justify-center">
                {item.icon ?? (
                  <>
                    <Image src="/logo.svg" alt="RenderFlow" width={18} height={18} className="block dark:hidden" />
                    <Image src="/logo-dark.svg" alt="RenderFlow" width={18} height={18} className="hidden dark:block" />
                  </>
                )}
              </span>
              {!isCollapsed && item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-2 space-y-0.5">
        {/* Theme toggle */}
        {isCollapsed ? (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={theme === "dark" ? "Przełącz na jasny" : "Przełącz na ciemny"}
            className="flex items-center justify-center w-full py-2 px-2.5 rounded-lg text-gray-400 hover:bg-muted hover:text-foreground transition-colors"
          >
            {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        ) : (
          <div className="flex items-center justify-between px-2.5 py-2.5 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="flex-shrink-0 w-5 flex items-center justify-center text-gray-600 dark:text-gray-400">
                {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
              </span>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {theme === "dark" ? "Ciemny" : "Jasny"}
              </span>
            </div>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title={theme === "dark" ? "Przełącz na jasny" : "Przełącz na ciemny"}
              className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${theme === "dark" ? "bg-primary" : "bg-muted-foreground/30"}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${theme === "dark" ? "left-5" : "left-0.5"}`} />
            </button>
          </div>
        )}

        {/* Pomoc */}
        <button
          onClick={() => { setHelpOpen(true); setHelpSent(false); setHelpSubject(""); setHelpDesc(""); }}
          title={isCollapsed ? "Pomoc" : undefined}
          className="flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-gray-600 dark:text-gray-400 hover:bg-muted hover:text-foreground"
        >
          <span className="flex-shrink-0 w-5 flex items-center justify-center">
            <HelpCircle size={18} />
          </span>
          {!isCollapsed && "Pomoc"}
        </button>

        <Link
          href={getSettingsHref(pathname)}
          title={isCollapsed ? "Ustawienia" : undefined}
          className={`flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            pathname.startsWith("/settings")
              ? "bg-primary/10 text-primary"
              : "text-gray-600 dark:text-gray-400 hover:bg-muted hover:text-foreground"
          }`}
        >
          <span className="flex-shrink-0 w-5 flex items-center justify-center">
            <Settings size={18} />
          </span>
          {!isCollapsed && "Ustawienia"}
        </Link>
        <button
          onClick={toggle}
          title={isCollapsed ? "Rozwiń pasek" : "Zwiń pasek"}
          className="flex items-center justify-center w-full py-2 px-2.5 rounded-lg text-gray-400 hover:bg-muted hover:text-foreground transition-colors"
        >
          {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>
    </aside>

    {/* Help modal */}
    {helpOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setHelpOpen(false)}>
        <div className="bg-card rounded-2xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold">Pomoc i wsparcie</h2>
            <button onClick={() => setHelpOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={18} />
            </button>
          </div>

          {helpSent ? (
            <div className="flex flex-col items-center text-center py-6 gap-3">
              <CheckCircle size={48} className="text-green-500" />
              <p className="font-semibold text-lg">Dziękujemy za zgłoszenie!</p>
              <p className="text-sm text-muted-foreground">Nasz zespół wsparcia zajmie się Twoim zgłoszeniem najszybciej jak to możliwe.</p>
              <button
                onClick={() => setHelpOpen(false)}
                className="mt-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                Zamknij
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                <span>Email wsparcia:</span>
                <a href="mailto:support@veedeck.com" className="text-primary font-medium hover:underline">support@veedeck.com</a>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Temat zgłoszenia</label>
                <input
                  type="text"
                  value={helpSubject}
                  onChange={(e) => setHelpSubject(e.target.value)}
                  placeholder="Wpisz temat..."
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Opis</label>
                <textarea
                  value={helpDesc}
                  onChange={(e) => setHelpDesc(e.target.value)}
                  placeholder="Opisz problem lub pytanie..."
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              <button
                onClick={() => { if (helpSubject.trim() || helpDesc.trim()) setHelpSent(true); }}
                disabled={!helpSubject.trim() && !helpDesc.trim()}
                className="w-full py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Wyślij zgłoszenie
              </button>
            </div>
          )}
        </div>
      </div>
    )}
    </>
  );
}
