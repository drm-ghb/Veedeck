"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Search, ChevronRight, Eye, EyeOff } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";

interface Project {
  id: string;
  title: string;
  clientName: string | null;
}

export default function NewListDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [clientTab, setClientTab] = useState<"new" | "existing">("new");
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientEmailError, setNewClientEmailError] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientPassword, setNewClientPassword] = useState("");
  const [showNewClientPassword, setShowNewClientPassword] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const t = useT();

  useEffect(() => {
    if (open && projects.length === 0) {
      setLoadingProjects(true);
      fetch("/api/projects")
        .then((r) => r.ok ? r.json() : [])
        .then((data) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setProjects(data.filter((p: any) => !p.archived).map((p: any) => ({
            id: p.id,
            title: p.title,
            clientName: p.clientName ?? null,
          })));
        })
        .catch(() => {})
        .finally(() => setLoadingProjects(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSubmit() {
    if (!name.trim()) return;
    if (clientTab === "new" && (!newClientName.trim() || !newClientEmail.trim())) return;
    if (clientTab === "new" && !newClientEmail.includes("@")) {
      setNewClientEmailError("Podaj poprawny adres e-mail (brak znaku @)");
      return;
    }
    if (clientTab === "existing" && !selectedProject) return;
    setNewClientEmailError("");
    setLoading(true);
    try {
      let projectId: string | null = null;

      if (clientTab === "new" && newClientName.trim()) {
        const projRes = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newClientName.trim(),
            clientName: newClientName.trim(),
            clientEmail: newClientEmail.trim() || undefined,
            clientPhone: newClientPhone.trim() || undefined,
            clientPassword: newClientPassword.trim() || undefined,
          }),
        });
        if (!projRes.ok) throw new Error();
        const proj = await projRes.json();
        projectId = proj.id;
      } else if (clientTab === "existing" && selectedProject) {
        projectId = selectedProject.id;
      }

      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), projectId }),
      });

      if (!res.ok) throw new Error();

      toast.success(t.listy.listCreated);
      setOpen(false);
      router.refresh();
    } catch {
      toast.error(t.listy.listCreateError);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(val: boolean) {
    setOpen(val);
    if (!val) {
      setName("");
      setClientTab("new");
      setNewClientName("");
      setNewClientEmail("");
      setNewClientPhone("");
      setNewClientPassword("");
      setShowNewClientPassword(false);
      setSelectedProject(null);
      setSearch("");
    }
  }

  const filtered = projects.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      (p.clientName?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button className="flex items-center gap-2 sm:self-start" />}>
        <Plus size={16} />
        {t.listy.newList}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>+ {t.listy.newList}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* List name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">{t.listy.listName}<span className="text-destructive">*</span></Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && name.trim() && handleSubmit()}
              placeholder={t.listy.listNamePlaceholder}
              required
              autoFocus
            />
          </div>

          <div className="space-y-3">
            {/* Tabs */}
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              <button
                type="button"
                onClick={() => { setClientTab("new"); setSelectedProject(null); setSearch(""); }}
                className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${
                  clientTab === "new"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Nowy klient
              </button>
              <button
                type="button"
                onClick={() => { setClientTab("existing"); setNewClientName(""); }}
                className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${
                  clientTab === "existing"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Istniejący klient
              </button>
            </div>

            {/* Tab: Nowy klient */}
            {clientTab === "new" && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Nazwa kontaktu<span className="text-destructive">*</span></Label>
                    <Input
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="Jan Kowalski"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>E-mail<span className="text-destructive">*</span></Label>
                    <Input
                      type="email"
                      value={newClientEmail}
                      onChange={(e) => { setNewClientEmail(e.target.value); if (newClientEmailError) setNewClientEmailError(""); }}
                      placeholder="jan@firma.pl"
                    />
                    {newClientEmailError && <p className="text-xs text-destructive mt-1">{newClientEmailError}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Telefon</Label>
                    <Input
                      type="tel"
                      value={newClientPhone}
                      onChange={(e) => setNewClientPhone(e.target.value)}
                      placeholder="+48 123 456 789"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="newClientPassword">
                    Hasło do konta{" "}
                    <span className="text-muted-foreground font-normal">(opcjonalnie)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="newClientPassword"
                      type={showNewClientPassword ? "text" : "password"}
                      value={newClientPassword}
                      onChange={(e) => setNewClientPassword(e.target.value)}
                      placeholder="Klient zaloguje się tym hasłem"
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewClientPassword((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewClientPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {newClientPassword.trim() && (
                    newClientEmail.trim()
                      ? <p className="text-xs text-muted-foreground">Login: <span className="font-mono font-medium text-foreground">{newClientEmail.trim().toLowerCase()}</span></p>
                      : <p className="text-xs text-destructive">Podaj e-mail klienta — będzie używany jako login do panelu</p>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Istniejący klient */}
            {clientTab === "existing" && (
              <div className="space-y-2">
                {selectedProject ? (
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted border border-border">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{selectedProject.title}</p>
                      {selectedProject.clientName && (
                        <p className="text-xs text-muted-foreground truncate">{selectedProject.clientName}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedProject(null)}
                      className="text-xs text-muted-foreground hover:text-foreground ml-2 shrink-0"
                    >
                      Zmień
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder={t.listy.searchProject}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
                      {loadingProjects ? (
                        <p className="text-sm text-muted-foreground text-center py-6">{t.common.loading}</p>
                      ) : filtered.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          {search ? t.common.noResults : t.listy.noProjects}
                        </p>
                      ) : (
                        filtered.map((p, i) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setSelectedProject(p)}
                            className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors ${
                              i !== filtered.length - 1 ? "border-b border-border" : ""
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                              {p.clientName && (
                                <p className="text-xs text-muted-foreground truncate">{p.clientName}</p>
                              )}
                            </div>
                            <ChevronRight size={14} className="text-muted-foreground ml-3 shrink-0" />
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={
                loading ||
                !name.trim() ||
                (clientTab === "new" && !newClientName.trim()) ||
                (clientTab === "new" && !newClientEmail.trim()) ||
                (clientTab === "existing" && !selectedProject) ||
                (!!newClientPassword.trim() && !newClientEmail.trim())
              }
            >
              {loading ? t.listy.creating : t.listy.createList}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
