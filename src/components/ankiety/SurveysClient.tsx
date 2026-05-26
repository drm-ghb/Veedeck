"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search, Plus, LayoutGrid, List, MoreVertical, Archive, ArchiveRestore, Trash2, Edit2, Copy, Pin, PinOff, BarChart2,
} from "@/components/ui/icons";
import NewSurveyDialog from "./NewSurveyDialog";
import TemplatesTab from "./TemplatesTab";

type Project = { id: string; title: string };
type Survey = {
  id: string;
  name: string;
  slug: string;
  shareToken: string;
  status: string;
  archived: boolean;
  pinned: boolean;
  order: number;
  projectId: string | null;
  clientId: string | null;
  createdAt: string;
  project: { id: string; title: string } | null;
  client: { id: string; name: string } | null;
  _count: { responses: number };
};

interface CustomTemplate {
  id: string;
  name: string;
  createdAt: string;
  _count: { questions: number };
}

interface Props {
  surveys: Survey[];
  projects: Project[];
  customTemplates: CustomTemplate[];
}

type SortMode = "manual" | "az" | "date";
type ViewMode = "grid" | "list";
type Tab = "active" | "archived" | "templates";

function StatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
      Aktywna
    </span>
  );
  if (status === "CLOSED") return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
      Zamknięta
    </span>
  );
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
      Szkic
    </span>
  );
}

export default function SurveysClient({ surveys: initial, projects, customTemplates }: Props) {
  const router = useRouter();
  const [surveys, setSurveys] = useState<Survey[]>(initial);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("manual");
  const [view, setView] = useState<ViewMode>("grid");
  const [tab, setTab] = useState<Tab>("active");
  const [newOpen, setNewOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = surveys.filter((s) => s.archived === (tab === "archived"));
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        s.project?.title.toLowerCase().includes(q) ||
        s.client?.name.toLowerCase().includes(q)
      );
    }
    if (sort === "az") list = [...list].sort((a, b) => a.name.localeCompare(b.name, "pl"));
    if (sort === "date") list = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }, [surveys, query, sort, tab]);

  async function handleArchive(survey: Survey) {
    setOpenMenuId(null);
    const res = await fetch(`/api/surveys/${survey.id}/archive`, { method: "POST" });
    if (!res.ok) { toast.error("Błąd archiwizacji"); return; }
    const updated = await res.json();
    setSurveys((prev) => prev.map((s) => s.id === survey.id ? { ...s, archived: updated.archived } : s));
    toast.success(updated.archived ? "Ankieta zarchiwizowana" : "Ankieta przywrócona");
  }

  async function handlePin(survey: Survey) {
    setOpenMenuId(null);
    const res = await fetch(`/api/surveys/${survey.id}/pin`, { method: "POST" });
    if (!res.ok) { toast.error("Błąd przypinania"); return; }
    const updated = await res.json();
    setSurveys((prev) => prev.map((s) => s.id === survey.id ? { ...s, pinned: updated.pinned } : s));
    toast.success(updated.pinned ? "Ankieta przypięta" : "Ankieta odpięta");
  }

  async function handleDelete(survey: Survey) {
    setOpenMenuId(null);
    if (!confirm(`Czy na pewno chcesz usunąć ankietę "${survey.name}"?`)) return;
    const res = await fetch(`/api/surveys/${survey.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Błąd usuwania ankiety");
      return;
    }
    setSurveys((prev) => prev.filter((s) => s.id !== survey.id));
    toast.success("Ankieta usunięta");
  }

  function handleCopyLink(survey: Survey) {
    setOpenMenuId(null);
    const url = `${window.location.origin}/share/survey/${survey.shareToken}`;
    navigator.clipboard.writeText(url);
    toast.success("Link skopiowany");
  }

  function handleCreated(survey: Survey) {
    setSurveys((prev) => [survey, ...prev]);
    setNewOpen(false);
    router.push(`/ankiety/${survey.id}/edytuj`);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" });
  }

  const activeCount = surveys.filter((s) => !s.archived).length;
  const archivedCount = surveys.filter((s) => s.archived).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h1 className="text-xl font-semibold">Ankiety</h1>
        <button
          onClick={() => setNewOpen(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus size={16} />
          Nowa ankieta
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-b border-border">
        {/* Search */}
        <div className="relative flex-1 min-w-48 max-w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj ankiet..."
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          className="px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none"
        >
          <option value="manual">Ręcznie</option>
          <option value="az">A–Z</option>
          <option value="date">Najnowsze</option>
        </select>

        {/* View toggle */}
        <div className="flex items-center gap-1 border border-border rounded-lg p-0.5">
          <button
            onClick={() => setView("grid")}
            className={`p-1.5 rounded-md transition-colors ${view === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setView("list")}
            className={`p-1.5 rounded-md transition-colors ${view === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 pt-3 border-b border-border">
        <button
          onClick={() => setTab("active")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === "active" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Aktywne <span className="ml-1 text-xs text-muted-foreground">({activeCount})</span>
        </button>
        <button
          onClick={() => setTab("archived")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === "archived" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Zarchiwizowane <span className="ml-1 text-xs text-muted-foreground">({archivedCount})</span>
        </button>
        <button
          onClick={() => setTab("templates")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === "templates" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Szablony
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "templates" ? (
          <TemplatesTab customTemplates={customTemplates} projects={projects} />
        ) : (
          <div className="p-6">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                <p className="text-sm">{tab === "archived" ? "Brak zarchiwizowanych ankiet." : "Brak aktywnych ankiet."}</p>
                {tab === "active" && (
                  <button
                    onClick={() => setNewOpen(true)}
                    className="mt-3 text-sm text-primary hover:underline"
                  >
                    Utwórz pierwszą ankietę
                  </button>
                )}
              </div>
            ) : view === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((survey) => (
                  <SurveyCard
                    key={survey.id}
                    survey={survey}
                    openMenuId={openMenuId}
                    setOpenMenuId={setOpenMenuId}
                    onArchive={handleArchive}
                    onPin={handlePin}
                    onDelete={handleDelete}
                    onCopyLink={handleCopyLink}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            ) : (
              <SurveyTable
                surveys={filtered}
                openMenuId={openMenuId}
                setOpenMenuId={setOpenMenuId}
                onArchive={handleArchive}
                onPin={handlePin}
                onDelete={handleDelete}
                onCopyLink={handleCopyLink}
                formatDate={formatDate}
              />
            )}
          </div>
        )}
      </div>

      <NewSurveyDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={handleCreated}
        projects={projects}
      />
    </div>
  );
}

// ── Survey Card (grid view) ────────────────────────────────────────────────

interface CardProps {
  survey: Survey;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  onArchive: (s: Survey) => void;
  onPin: (s: Survey) => void;
  onDelete: (s: Survey) => void;
  onCopyLink: (s: Survey) => void;
  formatDate: (d: string) => string;
}

function SurveyCard({ survey, openMenuId, setOpenMenuId, onArchive, onPin, onDelete, onCopyLink, formatDate }: CardProps) {
  const open = openMenuId === survey.id;

  return (
    <a
      href={`/ankiety/${survey.id}/edytuj`}
      className="relative block bg-card border border-border rounded-xl p-4 hover:shadow-sm hover:border-primary/30 transition-all cursor-pointer"
    >
      {survey.pinned && (
        <span className="absolute top-3 right-10 text-primary opacity-60">
          <Pin size={14} />
        </span>
      )}

      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-semibold text-sm text-foreground line-clamp-2 flex-1">
          {survey.name}
        </span>
        <div className="relative flex-shrink-0" onClick={(e) => e.preventDefault()}>
          <button
            onClick={(e) => { e.preventDefault(); setOpenMenuId(open ? null : survey.id); }}
            className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <MoreVertical size={16} />
          </button>
          {open && (
            <SurveyMenu survey={survey} onClose={() => setOpenMenuId(null)} onArchive={onArchive} onPin={onPin} onDelete={onDelete} onCopyLink={onCopyLink} />
          )}
        </div>
      </div>

      <StatusBadge status={survey.status} />

      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        {survey.project && <p>Klient: {survey.project.title}</p>}
        {survey.client && <p>Klient: {survey.client.name}</p>}
        <p className="pt-1">{formatDate(survey.createdAt)} · {survey._count?.responses ?? 0} odpowiedzi</p>
      </div>
    </a>
  );
}

// ── Survey Table (list view) ───────────────────────────────────────────────

function SurveyTable({ surveys, openMenuId, setOpenMenuId, onArchive, onPin, onDelete, onCopyLink, formatDate }: CardProps & { surveys: Survey[] }) {
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nazwa</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Projekt</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Data</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Odpowiedzi</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {surveys.map((survey, i) => {
            const open = openMenuId === survey.id;
            return (
              <tr key={survey.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                <td className="px-4 py-3">
                  <a href={`/ankiety/${survey.id}/edytuj`} className="font-medium hover:text-primary transition-colors">
                    {survey.name}
                  </a>
                </td>
                <td className="px-4 py-3"><StatusBadge status={survey.status} /></td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{survey.project?.title ?? "—"}</td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{formatDate(survey.createdAt)}</td>
                <td className="px-4 py-3 text-muted-foreground">{survey._count?.responses ?? 0}</td>
                <td className="px-4 py-3">
                  <div className="relative flex justify-end">
                    <button
                      onClick={() => setOpenMenuId(open ? null : survey.id)}
                      className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {open && (
                      <SurveyMenu survey={survey} onClose={() => setOpenMenuId(null)} onArchive={onArchive} onPin={onPin} onDelete={onDelete} onCopyLink={onCopyLink} />
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Survey Menu ────────────────────────────────────────────────────────────

function SurveyMenu({ survey, onClose, onArchive, onPin, onDelete, onCopyLink }: {
  survey: Survey;
  onClose: () => void;
  onArchive: (s: Survey) => void;
  onPin: (s: Survey) => void;
  onDelete: (s: Survey) => void;
  onCopyLink: (s: Survey) => void;
}) {
  return (
    <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-xl shadow-lg py-1 min-w-44">
      <a
        href={`/ankiety/${survey.id}/odpowiedzi`}
        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
      >
        <BarChart2 size={14} />
        Odpowiedzi
      </a>
      <a
        href={`/ankiety/${survey.id}/edytuj`}
        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
      >
        <Edit2 size={14} />
        Edytuj
      </a>
      {survey.status === "ACTIVE" && (
        <button
          onClick={() => { onCopyLink(survey); onClose(); }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
        >
          <Copy size={14} />
          Kopiuj link
        </button>
      )}
      <button
        onClick={() => onPin(survey)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
      >
        {survey.pinned ? <PinOff size={14} /> : <Pin size={14} />}
        {survey.pinned ? "Odepnij" : "Przypnij"}
      </button>
      <button
        onClick={() => onArchive(survey)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
      >
        {survey.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
        {survey.archived ? "Przywróć" : "Archiwizuj"}
      </button>
      <div className="border-t border-border my-1" />
      <button
        onClick={() => { onDelete(survey); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
      >
        <Trash2 size={14} />
        Usuń
      </button>
    </div>
  );
}
