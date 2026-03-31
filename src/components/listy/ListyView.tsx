"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ShoppingCart, Search, LayoutGrid, List, SlidersHorizontal, Link2, MoreHorizontal, Pencil, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import NewListDialog from "./NewListDialog";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ShoppingList {
  id: string;
  name: string;
  shareToken: string;
  archived: boolean;
  createdAt: string;
  project: { id: string; title: string } | null;
}

interface ListyViewProps {
  lists: ShoppingList[];
}

type SortOption = "newest" | "oldest" | "az" | "za";
type Tab = "active" | "archived";

function copyShareLink(shareToken: string) {
  const url = `${window.location.origin}/share/list/${shareToken}`;
  navigator.clipboard.writeText(url);
  toast.success("Link skopiowany do schowka");
}

export default function ListyView({ lists: initialLists }: ListyViewProps) {
  const [lists, setLists] = useState<ShoppingList[]>(initialLists);
  const [tab, setTab] = useState<Tab>("active");
  const [view, setView] = useState<"grid" | "list">("list");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("listy-view");
    if (saved === "grid" || saved === "list") setView(saved);
  }, []);

  function toggleView(v: "grid" | "list") {
    setView(v);
    localStorage.setItem("listy-view", v);
  }

  function startRename(list: ShoppingList) {
    setRenamingId(list.id);
    setRenameValue(list.name);
    setTimeout(() => renameRef.current?.focus(), 50);
  }

  async function saveRename(id: string) {
    const name = renameValue.trim();
    setRenamingId(null);
    if (!name || name === lists.find((l) => l.id === id)?.name) return;
    setLists((prev) => prev.map((l) => l.id === id ? { ...l, name } : l));
    try {
      const res = await fetch(`/api/lists/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Błąd zmiany nazwy");
      setLists(initialLists);
    }
  }

  async function toggleArchive(list: ShoppingList) {
    const archived = !list.archived;
    setLists((prev) => prev.map((l) => l.id === list.id ? { ...l, archived } : l));
    try {
      const res = await fetch(`/api/lists/${list.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived }),
      });
      if (!res.ok) throw new Error();
      toast.success(archived ? "Lista zarchiwizowana" : "Lista przywrócona");
    } catch {
      toast.error("Błąd operacji");
      setLists(initialLists);
    }
  }

  async function deleteList(id: string) {
    if (!confirm("Czy na pewno chcesz usunąć tę listę? Tej operacji nie można cofnąć.")) return;
    setLists((prev) => prev.filter((l) => l.id !== id));
    try {
      const res = await fetch(`/api/lists/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Lista usunięta");
    } catch {
      toast.error("Błąd usuwania listy");
      setLists(initialLists);
    }
  }

  const activeLists = lists.filter((l) => !l.archived);
  const archivedLists = lists.filter((l) => l.archived);
  const tabLists = tab === "active" ? activeLists : archivedLists;

  const filtered = tabLists
    .filter((l) => l.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      switch (sort) {
        case "oldest": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "az":     return a.name.localeCompare(b.name, "pl");
        case "za":     return b.name.localeCompare(a.name, "pl");
        default:       return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  function ListMenu({ list }: { list: ShoppingList }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" />
          }
        >
          <MoreHorizontal size={15} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => startRename(list)}>
            <Pencil size={13} className="mr-2" />
            Zmień nazwę
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toggleArchive(list)}>
            {list.archived ? <ArchiveRestore size={13} className="mr-2" /> : <Archive size={13} className="mr-2" />}
            {list.archived ? "Przywróć" : "Archiwizuj"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => deleteList(list.id)} className="text-destructive focus:text-destructive">
            <Trash2 size={13} className="mr-2" />
            Usuń listę
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold">Listy zakupowe</h1>
          <p className="text-gray-500 mt-1">
            {activeLists.length === 0
              ? "Nie masz jeszcze żadnych list"
              : `${activeLists.length} aktywna${activeLists.length === 1 ? "" : activeLists.length < 5 ? "" : ""}`}
          </p>
        </div>
        <NewListDialog />
      </div>

      {/* Tabs */}
      {lists.length > 0 && (
        <div className="flex items-center gap-1 mb-5 border-b border-border">
          <button
            onClick={() => setTab("active")}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === "active"
                ? "border-[#19213D] text-[#19213D] dark:border-white dark:text-white"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Aktywne
            {activeLists.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-muted text-[10px] font-semibold text-muted-foreground px-1">
                {activeLists.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("archived")}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === "archived"
                ? "border-[#19213D] text-[#19213D] dark:border-white dark:text-white"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Zarchiwizowane
            {archivedLists.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-muted text-[10px] font-semibold text-muted-foreground px-1">
                {archivedLists.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Toolbar */}
      {tabLists.length > 0 && (
        <div className="flex items-center gap-2 mb-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Szukaj listy..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-card focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>

          <div className={`relative sm:hidden w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-md border ${sort !== "newest" ? "border-gray-900 bg-gray-900" : "border-gray-200 bg-white dark:border-gray-700 dark:bg-card"}`}>
            <SlidersHorizontal size={14} className={`pointer-events-none ${sort !== "newest" ? "text-white" : "text-gray-500"}`} />
            <select value={sort} onChange={(e) => setSort(e.target.value as SortOption)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" aria-label="Sortowanie">
              <option value="newest">Najnowsze</option>
              <option value="oldest">Najstarsze</option>
              <option value="az">A–Z</option>
              <option value="za">Z–A</option>
            </select>
          </div>

          <select value={sort} onChange={(e) => setSort(e.target.value as SortOption)} className="hidden sm:block flex-shrink-0 text-xs border border-gray-200 dark:border-gray-700 rounded-md px-2 py-2 bg-white dark:bg-card text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300">
            <option value="newest">Najnowsze</option>
            <option value="oldest">Najstarsze</option>
            <option value="az">A–Z</option>
            <option value="za">Z–A</option>
          </select>

          <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5 flex-shrink-0">
            <button onClick={() => toggleView("grid")} className={`p-1.5 rounded transition-colors ${view === "grid" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`} title="Widok siatki">
              <LayoutGrid size={15} />
            </button>
            <button onClick={() => toggleView("list")} className={`p-1.5 rounded transition-colors ${view === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`} title="Widok listy">
              <List size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Empty state — no lists at all */}
      {lists.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#19213D]/10 flex items-center justify-center mb-4">
            <ShoppingCart size={28} className="text-[#19213D]" />
          </div>
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">Brak list zakupowych</h2>
          <p className="text-sm text-gray-400 max-w-xs">Kliknij „Nowa lista" aby stworzyć pierwszą listę zakupową dla swojego klienta.</p>
        </div>
      )}

      {/* Empty state — tab empty */}
      {lists.length > 0 && tabLists.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">{tab === "archived" ? "Brak zarchiwizowanych list." : "Brak aktywnych list."}</p>
        </div>
      )}

      {/* No search results */}
      {tabLists.length > 0 && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-4">🔍</p>
          <p className="text-lg">Brak list pasujących do &quot;{search}&quot;</p>
        </div>
      )}

      {/* Grid view */}
      {filtered.length > 0 && view === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
          {filtered.map((list) => (
            <div key={list.id} className="rounded-xl border border-border bg-card hover:shadow-sm hover:border-[#19213D]/20 transition-all group relative">
              <Link href={`/listy/${list.id}`} className="flex items-start gap-3 p-4 pr-16 block">
                <div className="w-9 h-9 rounded-lg bg-[#19213D]/10 flex items-center justify-center shrink-0">
                  <ShoppingCart size={16} className="text-[#19213D]" />
                </div>
                <div className="min-w-0">
                  {renamingId === list.id ? (
                    <input
                      ref={renameRef}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => saveRename(list.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveRename(list.id);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      onClick={(e) => e.preventDefault()}
                      className="font-semibold text-sm text-foreground bg-transparent border-b border-[#19213D]/40 focus:outline-none focus:border-[#19213D] w-full"
                    />
                  ) : (
                    <p className="font-semibold text-sm text-foreground truncate">{list.name}</p>
                  )}
                  {list.project ? (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{list.project.title}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground/50 mt-0.5">Bez projektu</p>
                  )}
                </div>
              </Link>
              <div className="absolute top-3 right-3 flex items-center gap-0.5">
                <button
                  onClick={(e) => { e.preventDefault(); copyShareLink(list.shareToken); }}
                  className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Skopiuj link"
                >
                  <Link2 size={14} />
                </button>
                <ListMenu list={list} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List view */}
      {filtered.length > 0 && view === "list" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1fr_180px_140px_72px] gap-4 px-5 py-3 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span>Nazwa</span>
            <span>Projekt</span>
            <span>Data</span>
            <span />
          </div>
          {filtered.map((list, i) => (
            <div
              key={list.id}
              className={`grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_180px_140px_72px] gap-4 px-5 py-4 items-center hover:bg-muted/30 transition-colors group ${i !== filtered.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#19213D]/10 flex items-center justify-center shrink-0">
                  <ShoppingCart size={14} className="text-[#19213D]" />
                </div>
                {renamingId === list.id ? (
                  <input
                    ref={renameRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => saveRename(list.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveRename(list.id);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    className="font-semibold text-gray-900 dark:text-gray-100 bg-transparent border-b border-[#19213D]/40 focus:outline-none focus:border-[#19213D] min-w-0 flex-1"
                  />
                ) : (
                  <Link href={`/listy/${list.id}`} className="font-semibold text-gray-900 dark:text-gray-100 truncate hover:underline">
                    {list.name}
                  </Link>
                )}
              </div>
              <p className="hidden sm:block text-sm text-muted-foreground truncate">{list.project?.title ?? "—"}</p>
              <p className="hidden sm:block text-sm text-muted-foreground whitespace-nowrap">
                {new Date(list.createdAt).toLocaleDateString("pl-PL", { day: "2-digit", month: "short", year: "numeric" })}
              </p>
              <div className="flex items-center justify-end gap-0.5">
                <button
                  onClick={() => copyShareLink(list.shareToken)}
                  className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Skopiuj link"
                >
                  <Link2 size={14} />
                </button>
                <ListMenu list={list} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
