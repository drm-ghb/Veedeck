"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, ShoppingCart, PanelLeftClose, PanelLeftOpen } from "lucide-react";

interface ShoppingListLink {
  id: string;
  name: string;
  shareToken: string;
}

interface ShareSidebarProps {
  token: string;
  showRenderFlow?: boolean;
  showListy?: boolean;
  shoppingLists?: ShoppingListLink[];
  /** When provided, clicking RenderFlow calls this instead of navigating (for SPA-style view) */
  onRenderFlowClick?: () => void;
}

export default function ShareSidebar({
  token,
  showRenderFlow = true,
  showListy = true,
  shoppingLists = [],
  onRenderFlowClick,
}: ShareSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("nav-sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("nav-sidebar-collapsed", String(next));
  }

  const isCollapsed = collapsed;

  const homeHref = `/share/${token}/home`;
  const renderHref = `/share/${token}`;
  const listHref =
    shoppingLists.length === 1
      ? `/share/list/${shoppingLists[0].shareToken}`
      : homeHref;

  const isHomeActive = pathname === homeHref;
  const isRenderActive = pathname === renderHref;
  const isListyActive = pathname.startsWith("/share/list/");

  const linkCls = (active: boolean) =>
    `flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      active
        ? "bg-primary/10 text-primary"
        : "text-gray-600 dark:text-gray-400 hover:bg-muted hover:text-foreground"
    }`;

  return (
    <aside
      className={`hidden md:flex flex-col border-r bg-card flex-shrink-0 transition-all duration-200 ${
        isCollapsed ? "w-14" : "w-52"
      }`}
    >
      <nav className="flex-1 p-2 space-y-0.5">
        {/* Dashboard */}
        <Link
          href={homeHref}
          title={isCollapsed ? "Dashboard" : undefined}
          className={linkCls(isHomeActive)}
        >
          <span className="flex-shrink-0 w-5 flex items-center justify-center">
            <LayoutDashboard size={18} />
          </span>
          {!isCollapsed && "Dashboard"}
        </Link>

        {/* RenderFlow */}
        {showRenderFlow &&
          (onRenderFlowClick ? (
            <button
              onClick={onRenderFlowClick}
              title={isCollapsed ? "RenderFlow" : undefined}
              className={`w-full ${linkCls(isRenderActive)}`}
            >
              <span className="flex-shrink-0 w-5 flex items-center justify-center">
                <Image src="/logo.svg" alt="" width={18} height={18} className="block dark:hidden" />
                <Image src="/logo-dark.svg" alt="" width={18} height={18} className="hidden dark:block" />
              </span>
              {!isCollapsed && "RenderFlow"}
            </button>
          ) : (
            <Link
              href={renderHref}
              title={isCollapsed ? "RenderFlow" : undefined}
              className={linkCls(isRenderActive)}
            >
              <span className="flex-shrink-0 w-5 flex items-center justify-center">
                <Image src="/logo.svg" alt="" width={18} height={18} className="block dark:hidden" />
                <Image src="/logo-dark.svg" alt="" width={18} height={18} className="hidden dark:block" />
              </span>
              {!isCollapsed && "RenderFlow"}
            </Link>
          ))}

        {/* Listy */}
        {showListy && shoppingLists.length > 0 && (
          <Link
            href={listHref}
            title={isCollapsed ? "Listy" : undefined}
            className={linkCls(isListyActive)}
          >
            <span className="flex-shrink-0 w-5 flex items-center justify-center">
              <ShoppingCart size={18} />
            </span>
            {!isCollapsed && "Listy"}
          </Link>
        )}
      </nav>

      <div className="p-2 border-t">
        <button
          onClick={toggle}
          title={isCollapsed ? "Rozwiń pasek" : "Zwiń pasek"}
          className="flex items-center justify-center w-full py-2 px-2.5 rounded-lg text-gray-400 hover:bg-muted hover:text-foreground transition-colors"
        >
          {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>
    </aside>
  );
}
