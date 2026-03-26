"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface EditProjectDialogProps {
  project: {
    id: string;
    title: string;
    clientName?: string | null;
    clientEmail?: string | null;
    description?: string | null;
    sharePassword?: string | null;
    shareExpiresAt?: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditProjectDialog({
  project,
  open,
  onOpenChange,
}: EditProjectDialogProps) {
  const [title, setTitle] = useState(project.title);
  const [clientName, setClientName] = useState(project.clientName ?? "");
  const [clientEmail, setClientEmail] = useState(project.clientEmail ?? "");
  const [description, setDescription] = useState(project.description ?? "");
  const [sharePassword, setSharePassword] = useState(project.sharePassword ?? "");
  const [shareExpiresAt, setShareExpiresAt] = useState(
    project.shareExpiresAt ? new Date(project.shareExpiresAt).toISOString().slice(0, 10) : ""
  );
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      setTitle(project.title);
      setClientName(project.clientName ?? "");
      setClientEmail(project.clientEmail ?? "");
      setDescription(project.description ?? "");
      setSharePassword(project.sharePassword ?? "");
      setShareExpiresAt(project.shareExpiresAt ? new Date(project.shareExpiresAt).toISOString().slice(0, 10) : "");
    }
  }, [open, project]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          clientName: clientName.trim() || null,
          clientEmail: clientEmail.trim() || null,
          description: description.trim() || null,
          sharePassword: sharePassword.trim() || null,
          shareExpiresAt: shareExpiresAt || null,
        }),
      });

      if (!res.ok) throw new Error();

      toast.success("Projekt zaktualizowany");
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Błąd zapisu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edytuj projekt</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">Nazwa projektu *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-clientName">Nazwa klienta</Label>
              <Input
                id="edit-clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="np. Jan Kowalski"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-clientEmail">Email klienta</Label>
              <Input
                id="edit-clientEmail"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="jan@example.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-description">Opis (opcjonalnie)</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-sharePassword">Hasło do linku (opcjonalnie)</Label>
              <Input
                id="edit-sharePassword"
                type="password"
                value={sharePassword}
                onChange={(e) => setSharePassword(e.target.value)}
                placeholder="Zostaw puste aby bez hasła"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-shareExpiresAt">Wygaśnięcie linku</Label>
              <Input
                id="edit-shareExpiresAt"
                type="date"
                value={shareExpiresAt}
                onChange={(e) => setShareExpiresAt(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
