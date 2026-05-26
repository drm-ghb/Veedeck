"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, ClipboardList } from "@/components/ui/icons";
import { surveyTemplates } from "@/lib/surveyTemplates";

type Project = { id: string; title: string };

interface CustomTemplate {
  id: string;
  name: string;
  createdAt: string;
  _count: { questions: number };
}

interface Props {
  customTemplates: CustomTemplate[];
  projects: Project[];
}

// ── Use-template dialog ──────────────────────────────────────────────────────

function UseTemplateDialog({
  templateName,
  projects,
  onConfirm,
  onClose,
}: {
  templateName: string;
  projects: Project[];
  onConfirm: (name: string, projectId: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(templateName);
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) return;
    setLoading(true);
    await onConfirm(name.trim(), projectId);
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border border-border rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4 mx-4">
        <h2 className="font-semibold text-base">Utwórz ankietę z szablonu</h2>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Nazwa ankiety</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            autoFocus
          />
        </div>

        {projects.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Klient (opcjonalne)</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">— bez przypisania —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Anuluj
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="flex-1 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {loading ? "Tworzenie..." : "Utwórz"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function TemplatesTab({ customTemplates: initial, projects }: Props) {
  const router = useRouter();
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>(initial);
  const [useDialog, setUseDialog] = useState<{ type: "builtin"; templateId: string; name: string } | { type: "custom"; survey: CustomTemplate } | null>(null);

  // Create a new blank custom template
  async function handleNewTemplate() {
    const name = "Nowy szablon";
    const res = await fetch("/api/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, isTemplate: true }),
    });
    if (!res.ok) { toast.error("Błąd tworzenia szablonu"); return; }
    const survey = await res.json();
    router.push(`/ankiety/${survey.id}/edytuj`);
  }

  // Use built-in template: create survey → apply template
  async function handleUseBuiltin(name: string, projectId: string, templateId: string) {
    const res = await fetch("/api/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, projectId: projectId || null }),
    });
    if (!res.ok) { toast.error("Błąd tworzenia ankiety"); return; }
    const survey = await res.json();

    await fetch(`/api/surveys/${survey.id}/apply-template`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId }),
    });

    toast.success("Ankieta utworzona");
    router.push(`/ankiety/${survey.id}/edytuj`);
    setUseDialog(null);
  }

  // Use custom template: duplicate
  async function handleUseCustom(name: string, projectId: string, templateId: string) {
    const res = await fetch(`/api/surveys/${templateId}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, projectId: projectId || null }),
    });
    if (!res.ok) { toast.error("Błąd tworzenia ankiety"); return; }
    const survey = await res.json();
    toast.success("Ankieta utworzona");
    router.push(`/ankiety/${survey.id}/edytuj`);
    setUseDialog(null);
  }

  async function handleDeleteCustom(template: CustomTemplate) {
    if (!confirm(`Usuń szablon "${template.name}"?`)) return;
    const res = await fetch(`/api/surveys/${template.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Błąd usuwania szablonu");
      return;
    }
    setCustomTemplates((prev) => prev.filter((t) => t.id !== template.id));
    toast.success("Szablon usunięty");
  }

  const totalQuestions = (t: (typeof surveyTemplates)[0]) => {
    const inSections = t.sections.reduce((acc, s) => acc + s.questions.length, 0);
    return inSections + t.questions.length;
  };

  return (
    <div className="p-6 space-y-8">
      {/* Built-in templates */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Wbudowane szablony</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {surveyTemplates.map((tpl) => (
            <div key={tpl.id} className="bg-card border border-border rounded-xl p-5 space-y-3 flex flex-col">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <ClipboardList size={18} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{tpl.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{totalQuestions(tpl)} pytań · {tpl.sections.length} sekcji</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed flex-1">{tpl.description}</p>
              <button
                onClick={() => setUseDialog({ type: "builtin", templateId: tpl.id, name: tpl.name })}
                className="w-full py-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                Użyj szablonu
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Custom templates */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Twoje szablony</h2>
          <button
            onClick={handleNewTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <Plus size={14} />
            Nowy szablon
          </button>
        </div>

        {customTemplates.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-10 text-center space-y-2">
            <p className="text-sm text-muted-foreground">Nie masz jeszcze własnych szablonów.</p>
            <button onClick={handleNewTemplate} className="text-sm text-primary hover:underline">
              Utwórz pierwszy szablon
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customTemplates.map((tpl) => (
              <div key={tpl.id} className="bg-card border border-border rounded-xl p-5 space-y-3 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{tpl.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{tpl._count.questions} pytań</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <a
                      href={`/ankiety/${tpl.id}/edytuj`}
                      className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      title="Edytuj"
                    >
                      <Edit2 size={14} />
                    </a>
                    <button
                      onClick={() => handleDeleteCustom(tpl)}
                      className="p-1.5 rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/20 transition-colors"
                      title="Usuń"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex-1" />
                <button
                  onClick={() => setUseDialog({ type: "custom", survey: tpl })}
                  className="w-full py-2 text-xs font-medium border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
                >
                  Użyj szablonu
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Dialog */}
      {useDialog && (
        <UseTemplateDialog
          templateName={useDialog.type === "builtin" ? useDialog.name : useDialog.survey.name}
          projects={projects}
          onClose={() => setUseDialog(null)}
          onConfirm={async (name, projectId) => {
            if (useDialog.type === "builtin") {
              await handleUseBuiltin(name, projectId, useDialog.templateId);
            } else {
              await handleUseCustom(name, projectId, useDialog.survey.id);
            }
          }}
        />
      )}
    </div>
  );
}
