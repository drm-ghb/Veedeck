"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Briefcase,
  PictureInPicture,
  ShoppingCart,
  Package,
  MessageSquare,
  Bell,
  ChevronRight,
  Layers,
  CheckCircle2,
} from "lucide-react";
import NewProjectDialog from "./NewProjectDialog";
import { useT } from "@/lib/i18n";

interface Stats {
  projects: number;
  renders: number;
  lists: number;
  newComments: number;
  pendingRequests: number;
}

interface RecentProject {
  id: string;
  slug: string | null;
  title: string;
  clientName: string | null;
  renderCount: number;
  lastRenderUrl: string | null;
  updatedAt: string;
}

interface PendingRequest {
  id: string;
  renderName: string;
  clientName: string | null;
  projectId: string;
  projectTitle: string;
  projectSlug: string | null;
  createdAt: string;
}

interface RenderWithComments {
  id: string;
  name: string;
  fileUrl: string;
  projectId: string;
  projectTitle: string;
  projectSlug: string | null;
  newCommentsCount: number;
}

interface DashboardViewProps {
  displayName: string | null;
  navMode: string;
  hiddenModules: string[];
  stats: Stats;
  recentProjects: RecentProject[];
  pendingRequests: PendingRequest[];
  rendersWithComments: RenderWithComments[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor(diff / 60000);
  if (days >= 7) return new Date(dateStr).toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
  if (days > 0) return `${days} ${days === 1 ? "dzień" : "dni"} temu`;
  if (hours > 0) return `${hours} godz. temu`;
  if (minutes > 0) return `${minutes} min. temu`;
  return "Przed chwilą";
}

export default function DashboardView({
  displayName,
  navMode,
  hiddenModules,
  stats,
  recentProjects,
  pendingRequests,
  rendersWithComments,
}: DashboardViewProps) {
  const t = useT();
  const todoCount = pendingRequests.length + rendersWithComments.length;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {displayName
              ? t.home.welcome.replace("{name}", displayName)
              : t.home.welcomeDefault}
          </h1>
          <p className="text-gray-500 mt-1">
            {stats.projects === 0
              ? "Nie masz jeszcze żadnych projektów"
              : `${stats.projects} aktywn${stats.projects === 1 ? "y projekt" : stats.projects < 5 ? "e projekty" : "ych projektów"}`}
          </p>
        </div>
        <NewProjectDialog />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link
          href="/projekty"
          className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Briefcase size={18} className="text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold leading-none">{stats.projects}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">Projektów</p>
          </div>
        </Link>

        {!hiddenModules.includes("renderflow") && (
          <Link
            href="/renderflow"
            className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <PictureInPicture size={18} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold leading-none">{stats.renders}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">Renderów</p>
            </div>
          </Link>
        )}

        {!hiddenModules.includes("listy") && (
          <Link
            href="/listy"
            className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <ShoppingCart size={18} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold leading-none">{stats.lists}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">List zakupowych</p>
            </div>
          </Link>
        )}

        <div
          className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${
            todoCount > 0
              ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
              : "bg-card border-border"
          }`}
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${todoCount > 0 ? "bg-amber-100 dark:bg-amber-900/40" : "bg-muted"}`}>
            {todoCount > 0
              ? <Bell size={18} className="text-amber-600 dark:text-amber-400" />
              : <CheckCircle2 size={18} className="text-muted-foreground" />}
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold leading-none">{todoCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">Do przejrzenia</p>
          </div>
        </div>
      </div>

      {/* Module tiles — only in dashboard mode */}
      {navMode === "dashboard" && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            {t.home.modules}
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            <Link
              href="/projekty"
              className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform bg-primary">
                <Briefcase size={24} className="text-white" />
              </div>
              <p className="text-xs font-medium text-foreground text-center leading-tight">{t.nav.projects}</p>
            </Link>

            {!hiddenModules.includes("renderflow") && (
              <Link
                href="/renderflow"
                className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform bg-primary">
                  <Image src="/logo-dark.svg" alt="RenderFlow" width={36} height={36} />
                </div>
                <p className="text-xs font-medium text-foreground text-center leading-tight">{t.nav.renderflow}</p>
              </Link>
            )}

            {!hiddenModules.includes("listy") && (
              <Link
                href="/listy"
                className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform bg-primary">
                  <ShoppingCart size={24} className="text-white" />
                </div>
                <p className="text-xs font-medium text-foreground text-center leading-tight">{t.nav.lists}</p>
              </Link>
            )}

            {!hiddenModules.includes("produkty") && (
              <Link
                href="/produkty"
                className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform bg-[#7c3aed]">
                  <Package size={24} className="text-white" />
                </div>
                <p className="text-xs font-medium text-foreground text-center leading-tight">{t.nav.products}</p>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Main content: recent projects + to-do */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent projects */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Ostatnie projekty</h2>
            <Link href="/projekty" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors">
              Wszystkie <ChevronRight size={13} />
            </Link>
          </div>

          {recentProjects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
              <Layers size={32} className="mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground mb-3">Nie masz jeszcze żadnych projektów</p>
              <NewProjectDialog />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {recentProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projekty/${project.slug ?? project.id}`}
                  className="group flex flex-col rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 hover:shadow-md transition-all"
                >
                  {/* Thumbnail */}
                  <div className="w-full aspect-video bg-muted flex items-center justify-center overflow-hidden">
                    {project.lastRenderUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={project.lastRenderUrl}
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <PictureInPicture size={28} className="text-muted-foreground/30" />
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-3">
                    <p className="text-sm font-medium truncate">{project.title}</p>
                    {project.clientName && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{project.clientName}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        {project.renderCount > 0
                          ? `${project.renderCount} render${project.renderCount === 1 ? "" : "y"}`
                          : "Brak renderów"}
                      </span>
                      <span className="text-xs text-muted-foreground">{timeAgo(project.updatedAt)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* To-do / Actions */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Do zrobienia</h2>

          {todoCount === 0 ? (
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <CheckCircle2 size={28} className="mx-auto mb-2 text-green-500" />
              <p className="text-sm font-medium text-foreground">Wszystko na bieżąco!</p>
              <p className="text-xs text-muted-foreground mt-1">Brak oczekujących działań</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
              {/* Renders with new comments */}
              {rendersWithComments.map((render) => (
                <Link
                  key={render.id}
                  href={`/projekty/${render.projectSlug ?? render.projectId}`}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare size={15} className="text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{render.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{render.projectTitle}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                    {render.newCommentsCount}
                  </span>
                </Link>
              ))}

              {/* Pending status requests */}
              {pendingRequests.map((req) => (
                <Link
                  key={req.id}
                  href={`/projekty/${req.projectSlug ?? req.projectId}`}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0 mt-0.5">
                    <Bell size={15} className="text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{req.renderName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {req.clientName ? `${req.clientName} · ` : ""}{req.projectTitle}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(req.createdAt)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
