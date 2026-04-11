"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, ShieldCheck, FolderOpen, KeyRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface User {
  id: string;
  name: string | null;
  email: string;
  isAdmin: boolean;
  createdAt: Date | string;
  _count: { projects: number };
}

export default function AdminUsersClient({
  users,
  currentUserId,
}: {
  users: User[];
  currentUserId: string;
}) {
  const [list, setList] = useState(users);
  const [passwordModal, setPasswordModal] = useState<{ id: string; name: string | null } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const router = useRouter();

  async function handleDelete(id: string, name: string | null) {
    if (!confirm(`Usunąć użytkownika "${name ?? "bez nazwy"}"? Wszystkie jego projekty zostaną usunięte.`)) return;

    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setList((prev) => prev.filter((u) => u.id !== id));
      toast.success("Użytkownik usunięty");
    } else {
      const body = await res.json();
      toast.error(body.error ?? "Błąd usuwania");
    }
  }

  async function handleChangePassword() {
    if (!passwordModal) return;
    if (newPassword.length < 8) {
      toast.error("Hasło musi mieć minimum 8 znaków");
      return;
    }
    setSavingPassword(true);
    const res = await fetch(`/api/admin/users/${passwordModal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    setSavingPassword(false);
    if (res.ok) {
      toast.success(`Hasło zmienione dla ${passwordModal.name ?? passwordModal.id}`);
      setPasswordModal(null);
      setNewPassword("");
    } else {
      const body = await res.json();
      toast.error(body.error ?? "Błąd zmiany hasła");
    }
  }

  return (
    <>
      <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_200px_80px_80px] gap-4 px-5 py-3 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <span>Użytkownik</span>
          <span>Dołączył</span>
          <span>Projekty</span>
          <span></span>
        </div>

        {list.length === 0 && (
          <p className="text-center text-muted-foreground py-12">Brak użytkowników</p>
        )}

        {list.map((user, i) => (
          <div
            key={user.id}
            className={`grid grid-cols-[1fr_200px_80px_80px] gap-4 px-5 py-4 items-center ${
              i !== list.length - 1 ? "border-b border-border" : ""
            } ${user.id === currentUserId ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}
          >
            {/* Name + email */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground truncate">
                  {user.name ?? "—"}
                </p>
                {user.isAdmin && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 flex-shrink-0">
                    <ShieldCheck size={10} />
                    Admin
                  </span>
                )}
                {user.id === currentUserId && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 flex-shrink-0">
                    Ty
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>

            {/* Date */}
            <p className="text-sm text-muted-foreground">
              {new Date(user.createdAt).toLocaleDateString("pl-PL", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>

            {/* Projects */}
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <FolderOpen size={13} />
              {user._count.projects}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-1">
              <Button
                size="icon-sm"
                variant="ghost"
                title="Zmień hasło"
                className="text-gray-400 hover:text-gray-700 hover:bg-muted"
                onClick={() => { setPasswordModal({ id: user.id, name: user.name }); setNewPassword(""); }}
              >
                <KeyRound size={14} />
              </Button>
              {user.id !== currentUserId && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-red-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => handleDelete(user.id, user.name)}
                >
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Password modal */}
      {passwordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPasswordModal(null)}>
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold">Zmień hasło</h2>
              <button onClick={() => setPasswordModal(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Ustawiasz nowe hasło dla: <span className="font-medium text-foreground">{passwordModal.name ?? passwordModal.id}</span>
            </p>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
              placeholder="Nowe hasło (min. 8 znaków)"
              autoFocus
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 mb-4"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setPasswordModal(null)}>
                Anuluj
              </Button>
              <Button size="sm" onClick={handleChangePassword} disabled={savingPassword || newPassword.length < 8}>
                {savingPassword ? "Zapisywanie..." : "Ustaw hasło"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
