"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Project = { id: string; title: string };

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (survey: any) => void;
  projects: Project[];
}

export default function NewSurveyDialog({ open, onClose, onCreated, projects }: Props) {
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [noClient, setNoClient] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setProjectId("");
      setNoClient(false);
    }
  }, [open]);

  async function handleSave() {
    if (!name.trim()) return;
    setLoading(true);
    const res = await fetch("/api/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        projectId: noClient ? null : (projectId || null),
        clientId: null,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Błąd tworzenia ankiety");
      return;
    }
    const survey = await res.json();
    toast.success("Ankieta utworzona");
    onCreated(survey);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading && !v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>+ Nowa ankieta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="survey-name">Nazwa ankiety</Label>
            <Input
              id="survey-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Ankieta onboardingowa"
              disabled={loading}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSave(); } }}
              autoFocus
            />
          </div>

          {!noClient && projects.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="survey-client">Klient (opcjonalne)</Label>
              <select
                id="survey-client"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">— bez przypisania —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={noClient}
              onChange={(e) => { setNoClient(e.target.checked); if (e.target.checked) setProjectId(""); }}
              disabled={loading}
              className="rounded border-border"
            />
            <span className="text-sm text-muted-foreground">Ankieta bez przypisania (publiczny link)</span>
          </label>

          <Button onClick={handleSave} disabled={loading || !name.trim()} className="w-full">
            {loading ? "Tworzenie..." : "Utwórz ankietę"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
