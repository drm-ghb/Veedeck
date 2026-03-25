"use client";

import { useState } from "react";
import { MoreHorizontal, Archive, Trash2, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface RenderMenuProps {
  render: { id: string; name: string };
}

export default function RenderMenu({ render }: RenderMenuProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleArchive() {
    const res = await fetch(`/api/renders/${render.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    if (res.ok) {
      toast.success("Render zarchiwizowany");
      router.refresh();
    } else {
      toast.error("Błąd archiwizacji");
    }
  }

  async function handleDelete() {
    if (!confirm(`Usunąć render "${render.name}"?`)) return;
    const res = await fetch(`/api/renders/${render.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Render usunięty");
      router.refresh();
    } else {
      toast.error("Błąd usuwania");
    }
  }

  async function handleSaveName() {
    if (!editName.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/renders/${render.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Tytuł zaktualizowany");
      setEditOpen(false);
      router.refresh();
    } else {
      toast.error("Błąd zapisu");
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          onClick={(e) => e.preventDefault()}
        >
          <MoreHorizontal size={16} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault();
              setEditName(render.name);
              setEditOpen(true);
            }}
          >
            <Pencil size={14} />
            Edytuj tytuł
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleArchive}>
            <Archive size={14} />
            Archiwizuj
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            <Trash2 size={14} />
            Usuń
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={(o) => { if (!saving) setEditOpen(o); }}>
        <DialogContent className="sm:max-w-sm" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Edytuj tytuł pliku</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 py-1">
            <Label htmlFor="edit-render-name">Tytuł</Label>
            <Input
              id="edit-render-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              disabled={saving}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName();
                if (e.key === "Escape") setEditOpen(false);
              }}
            />
          </div>
          <DialogFooter showCloseButton>
            <Button onClick={handleSaveName} disabled={saving || !editName.trim()}>
              {saving ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
