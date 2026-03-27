"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, ShieldCheck, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface User {
  id: string;
  name: string | null;
  email: string;
  isAdmin: boolean;
  createdAt: string;
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

  return (
    <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr_200px_80px_60px] gap-4 px-5 py-3 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
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
          className={`grid grid-cols-[1fr_200px_80px_60px] gap-4 px-5 py-4 items-center ${
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
          <div className="flex justify-end">
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
  );
}
