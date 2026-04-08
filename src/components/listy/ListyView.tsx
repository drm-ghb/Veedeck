"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShoppingCart, Search, LayoutGrid, List, SlidersHorizontal, Link2, MoreHorizontal, Pencil, Archive, ArchiveRestore, Trash2, Pin, PinOff, AlertTriangle, Check, MessageSquare } from "lucide-react";
import { pusherClient } from "@/lib/pusher";
import { getUnreadSet, syncListUnread } from "@/lib/list-unread-store";
import NewListDialog from "./NewListDialog";
import EditListDialog from "./EditListDialog";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ShoppingList {
  id: string;
  slug: string | null;
  name: string;
  shareToken: string;
  archived: boolean;
  pinned: boolean;
  createdAt: string;
  project: { id: string; title: string; hiddenModules: string[] } | null;
}

interface ListyViewProps {
  lists: ShoppingList[];
}

type SortOption = "newest" | "oldest" | "az" | "za";
type Tab = "active" | "archived";

export default function ListyView({ lists: initialLists }: ListyViewProps) {
  const router = useRouter();
  const [lists, setLists] = useState<ShoppingList[]>(initialLists);
  const [tab, setTab] = useState<Tab>("active");
  const [view, setView] = useState<"grid" | "list">("list");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [editingList, setEditingList] = useState<ShoppingList | null>(null);
  const [warningLink, setWarningLink] = useState<string | null>(null);
  const [unreadListCounts, setUnreadListCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    setLists(initialLists);
  }, [initialLists]);

  useEffect(() => {
    const saved = localStorage.getItem("listy-view");
    if (saved === "grid" || saved === "list") setView(saved);
    // Init unread counts from localStorage
    const counts: Record<string, number> = {};
    for (const list of initialLists) {
      const count = parseInt(localStorage.getItem(`lc_list_unread_count_${list.id}`) ?? "0");
      if (count > 0) counts[list.id] = count;
    }
    setUnreadListCounts(counts);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-time unread updates for all lists
  useEffect(() => {
    if (initialLists.length === 0) return;
    const subscriptions = initialLists.map((list) => {
      const channel = pusherClient.subscribe(`shopping-list-${list.id}`);
      channel.bind("comment-activity", ({ productId, action }: { productId: string; action: string }) => {
        if (action === "new") {
          // Mark the specific product as unread so ListDetail picks it up on mount
          localStorage.setItem(`lc_unread_${productId}`, "1");
          // Use shared store — add productId once, then sync (no double-counting)
          getUnreadSet(list.id).add(productId);
          syncListUnread(list.id);
          setUnreadListCounts((prev) => ({ ...prev, [list.id]: getUnreadSet(list.id).size }));
        }
      });
      return list.id;
    });
    return () => {
      for (const listId of subscriptions) {
        pusherClient.unsubscribe(`shopping-list-${listId}`);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleView(v: "grid" | "list") {
    setView(v);
    localStorage.setItem("listy-view", v);
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

  function handleCopyLink(list: ShoppingList) {
    const url = `${window.location.origin}/share/list/${list.shareToken}`;
    if (list.project?.hiddenModules.includes("listy")) {
      setWarningLink(url);
      return;
    }
    navigator.clipboard.writeText(url);
    toast.success("Link skopiowany do schowka");
  }

  const activeLists = lists.filter((l) => !l.archived);
  const archivedLists = lists.filter((l) => l.archived);
  const tabLists = tab === "active" ? activeLists : archivedLists;

  async function togglePin(list: ShoppingList) {
    const pinned = !list.pinned;
    setLists((prev) => prev.map((l) => l.id === list.id ? { ...l, pinned } : l));
    try {
      const res = await fetch(`/api/lists/${list.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned }),
      });
      if (!res.ok) throw new Error();
      toast.success(pinned ? "Lista przypięta" : "Odpięto listę");
    } catch {
      toast.error("Błąd operacji");
      setLists(initialLists);
    }
  }

  const filtered = tabLists
    .filter((l) => l.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
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
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => togglePin(list)}>
            {list.pinned ? <PinOff size={13} className="mr-2" /> : <Pin size={13} className="mr-2" />}
            {list.pinned ? "Odepnij" : "Przypnij"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setEditingList(list)}>
            <Pencil size={13} className="mr-2" />
            Edytuj
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
    <>
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
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Aktywne
            {activeLists.length > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === "active" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>
                {activeLists.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("archived")}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === "archived"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Zarchiwizowane
            {archivedLists.length > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === "archived" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>
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
          <div className="w-16 h-16 rounded-2xl bg-[#C45824]/10 flex items-center justify-center mb-4">
            <ShoppingCart size={28} className="text-[#C45824]" />
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
            <div key={list.id} className="rounded-xl border border-border bg-card hover:shadow-sm hover:border-[#C45824]/20 transition-all group relative">
              {list.pinned && (
                <div className="absolute top-3 left-3 z-10">
                  <Pin size={12} className="text-red-500 fill-red-500" />
                </div>
              )}
              <Link href={`/listy/${list.slug ?? list.id}`} className={`flex items-start gap-3 p-4 pr-16 block ${list.pinned ? "pl-8" : ""}`}>
                <div className="w-9 h-9 rounded-lg bg-[#C45824]/10 flex items-center justify-center shrink-0">
                  <ShoppingCart size={16} className="text-[#C45824]" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{list.name}</p>
                  {list.project ? (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{list.project.title}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground/50 mt-0.5">Bez projektu</p>
                  )}
                </div>
              </Link>
              <div className="absolute top-3 right-3 flex items-center gap-0.5">
                {(unreadListCounts[list.id] ?? 0) > 0 && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-bold leading-none mr-1">
                    <MessageSquare size={10} />
                    {unreadListCounts[list.id]}
                  </div>
                )}
                <button
                  onClick={(e) => { e.preventDefault(); handleCopyLink(list); }}
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
          {filtered.map((list, i) => (
            <div
              key={list.id}
              onClick={() => router.push(`/listy/${list.slug ?? list.id}`)}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer ${i !== filtered.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className="w-8 h-8 rounded-lg bg-[#C45824]/10 flex items-center justify-center shrink-0">
                <ShoppingCart size={14} className="text-[#C45824]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {list.pinned && <Pin size={11} className="text-red-500 fill-red-500 flex-shrink-0" />}
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{list.name}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {list.project && <span className="text-xs text-muted-foreground truncate">{list.project.title}</span>}
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(list.createdAt).toLocaleDateString("pl-PL", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                {(unreadListCounts[list.id] ?? 0) > 0 && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-bold leading-none mr-1">
                    <MessageSquare size={10} />
                    {unreadListCounts[list.id]}
                  </div>
                )}
                <button
                  onClick={() => handleCopyLink(list)}
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

      {editingList && (
        <EditListDialog
          list={editingList}
          open={!!editingList}
          onOpenChange={(open) => { if (!open) setEditingList(null); }}
        />
      )}

      <Dialog open={!!warningLink} onOpenChange={(open) => { if (!open) setWarningLink(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              Moduł jest ukryty dla klienta
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Moduł <strong>Listy zakupowe</strong> jest oznaczony jako <strong>NIE WIDOCZNY</strong> dla klienta. Przed udostępnieniem linku zmień to w ustawieniach projektu.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setWarningLink(null)}>Zamknij</Button>
            <Button variant="ghost" className="gap-1.5" onClick={() => {
              if (warningLink) navigator.clipboard.writeText(warningLink);
              setWarningLink(null);
              toast.success("Link skopiowany do schowka");
            }}>
              <Check size={14} />
              Mimo to skopiuj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
