"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical, Plus, Trash2, Eye, Check,
  ArrowLeft, Edit2, X,
} from "@/components/ui/icons";
import SurveyTemplateDialog from "./SurveyTemplateDialog";

// ── Types ──────────────────────────────────────────────────────────────────

export type QuestionType =
  | "short_text" | "long_text" | "single_choice" | "multiple_choice"
  | "rating" | "yes_no" | "budget_range";

export interface SurveyQuestion {
  id: string;
  label: string;
  description: string | null;
  type: QuestionType;
  required: boolean;
  order: number;
  options: string[] | null;
  config: Record<string, number> | null;
  sectionId: string | null;
  surveyId: string;
}

export interface SurveySection {
  id: string;
  name: string;
  order: number;
  surveyId: string;
}

interface Survey {
  id: string;
  name: string;
  status: string;
  project: { id: string; title: string } | null;
  client: { id: string; name: string } | null;
  sections: SurveySection[];
  questions: SurveyQuestion[];
}

interface Props { survey: Survey; }

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "short_text", label: "Krótka odpowiedź" },
  { value: "long_text", label: "Długa odpowiedź" },
  { value: "single_choice", label: "Jeden wybór" },
  { value: "multiple_choice", label: "Wielokrotny wybór" },
  { value: "rating", label: "Ocena" },
  { value: "yes_no", label: "Tak / Nie" },
  { value: "budget_range", label: "Budżet / Zakres" },
];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Szkic",
  ACTIVE: "Aktywna",
  CLOSED: "Zamknięta",
};

// ── Main component ─────────────────────────────────────────────────────────

export default function SurveyEditor({ survey: initial }: Props) {
  const router = useRouter();
  const [survey, setSurvey] = useState(initial);
  const [questions, setQuestions] = useState<SurveyQuestion[]>(initial.questions);
  const [sections, setSections] = useState<SurveySection[]>(initial.sections);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [editNameValue, setEditNameValue] = useState(survey.name);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const selectedQuestion = questions.find((q) => q.id === selectedId) ?? null;

  function selectQuestion(id: string) {
    setSelectedId(id);
    const q = questions.find((q) => q.id === id);
    if (q?.sectionId) setCurrentSectionId(q.sectionId);
  }

  // ── Status ─────────────────────────────────────────────────────────────

  async function handleStatusChange(status: string) {
    setStatusSaving(true);
    const res = await fetch(`/api/surveys/${survey.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setStatusSaving(false);
    if (!res.ok) { toast.error("Błąd zmiany statusu"); return; }
    setSurvey((s) => ({ ...s, status }));
    toast.success(`Status: ${STATUS_LABELS[status]}`);
  }

  // ── Name ───────────────────────────────────────────────────────────────

  async function handleNameSave() {
    if (!editNameValue.trim()) return;
    const res = await fetch(`/api/surveys/${survey.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editNameValue.trim() }),
    });
    if (!res.ok) { toast.error("Błąd zapisu nazwy"); return; }
    setSurvey((s) => ({ ...s, name: editNameValue.trim() }));
    setEditNameOpen(false);
    toast.success("Nazwa zaktualizowana");
  }

  // ── Add question ───────────────────────────────────────────────────────

  async function handleAddQuestion(type: QuestionType) {
    // Use explicitly selected section, or fall back to the last section in the list
    const sectionId = currentSectionId ?? sections.at(-1)?.id ?? null;
    const res = await fetch(`/api/surveys/${survey.id}/questions`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: "Nowe pytanie", type, sectionId }),
    });
    if (!res.ok) { toast.error("Błąd dodawania pytania"); return; }
    const q: SurveyQuestion = await res.json();
    setQuestions((prev) => [...prev, q]);
    setSelectedId(q.id);
    setCurrentSectionId(q.sectionId);
  }

  // ── Update question ────────────────────────────────────────────────────

  const handleUpdateQuestion = useCallback(async (
    id: string,
    data: Partial<Pick<SurveyQuestion, "label" | "description" | "required" | "options" | "config" | "sectionId" | "type">>
  ) => {
    const res = await fetch(`/api/surveys/${survey.id}/questions/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) { toast.error("Błąd zapisu pytania"); return; }
    const updated: SurveyQuestion = await res.json();
    setQuestions((prev) => prev.map((q) => q.id === id ? updated : q));
  }, [survey.id]);

  // ── Delete question ────────────────────────────────────────────────────

  async function handleDeleteQuestion(id: string) {
    const res = await fetch(`/api/surveys/${survey.id}/questions/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Błąd usuwania pytania"); return; }
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    if (selectedId === id) setSelectedId(null);
    toast.success("Pytanie usunięte");
  }

  // ── Section drag ───────────────────────────────────────────────────────

  function handleSectionDragStart(event: DragStartEvent) {
    setActiveSectionId(event.active.id as string);
  }

  async function handleSectionDragEnd(event: DragEndEvent) {
    setActiveSectionId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = sections.findIndex((s) => s.id === active.id);
    const newIdx = sections.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(sections, oldIdx, newIdx).map((s, i) => ({ ...s, order: i }));
    setSections(reordered);
    await Promise.all(
      reordered.map((s) =>
        fetch(`/api/surveys/${survey.id}/sections/${s.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: s.order }),
        })
      )
    );
  }

  // ── Question drag within section ──────────────────────────────────────

  async function handleSectionQuestionDragEnd(sectionId: string, event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const sectionQs = questions.filter((q) => q.sectionId === sectionId);
    const oldIdx = sectionQs.findIndex((q) => q.id === active.id);
    const newIdx = sectionQs.findIndex((q) => q.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    const reorderedSection = arrayMove(sectionQs, oldIdx, newIdx);
    const allBySection = sections.flatMap((s) =>
      s.id === sectionId ? reorderedSection : questions.filter((q) => q.sectionId === s.id)
    );
    const unsectioned = questions.filter((q) => !q.sectionId);
    const allReordered = [...allBySection, ...unsectioned].map((q, i) => ({ ...q, order: i }));
    setQuestions(allReordered);

    await fetch(`/api/surveys/${survey.id}/questions/reorder`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions: allReordered.map((q) => ({ id: q.id, order: q.order })) }),
    });
  }

  // ── Unsectioned question drag ──────────────────────────────────────────

  function handleQuestionDragStart(event: DragStartEvent) {
    setActiveQuestionId(event.active.id as string);
  }

  async function handleQuestionDragEnd(event: DragEndEvent) {
    setActiveQuestionId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const unsectioned = questions.filter((q) => !q.sectionId);
    const oldIdx = unsectioned.findIndex((q) => q.id === active.id);
    const newIdx = unsectioned.findIndex((q) => q.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    const reorderedUnsectioned = arrayMove(unsectioned, oldIdx, newIdx);
    const sectioned = sections.flatMap((s) => questions.filter((q) => q.sectionId === s.id));
    const allReordered = [...sectioned, ...reorderedUnsectioned].map((q, i) => ({ ...q, order: i }));
    setQuestions(allReordered);

    await fetch(`/api/surveys/${survey.id}/questions/reorder`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions: allReordered.map((q) => ({ id: q.id, order: q.order })) }),
    });
  }

  // ── Add section ────────────────────────────────────────────────────────

  async function handleAddSection() {
    if (!newSectionName.trim()) return;
    const res = await fetch(`/api/surveys/${survey.id}/sections`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newSectionName.trim() }),
    });
    if (!res.ok) { toast.error("Błąd dodawania sekcji"); return; }
    const section: SurveySection = await res.json();
    setSections((prev) => [...prev, section]);
    setNewSectionName("");
    setAddSectionOpen(false);
    toast.success("Sekcja dodana");
  }

  // ── Rename section ─────────────────────────────────────────────────────

  async function handleRenameSection(sectionId: string, name: string) {
    const res = await fetch(`/api/surveys/${survey.id}/sections/${sectionId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) { toast.error("Błąd zapisu nazwy sekcji"); return; }
    setSections((prev) => prev.map((s) => s.id === sectionId ? { ...s, name } : s));
  }

  // ── Delete section ─────────────────────────────────────────────────────

  async function handleDeleteSection(sectionId: string) {
    if (!confirm("Usunąć sekcję? Pytania zostaną odłączone od sekcji.")) return;
    const res = await fetch(`/api/surveys/${survey.id}/sections/${sectionId}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Błąd usuwania sekcji"); return; }
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
    setQuestions((prev) => prev.map((q) => q.sectionId === sectionId ? { ...q, sectionId: null } : q));
    toast.success("Sekcja usunięta");
  }

  // ── Template applied ───────────────────────────────────────────────────

  function handleTemplateApplied(data: { sections: SurveySection[]; questions: SurveyQuestion[] }) {
    setSections(data.sections);
    setQuestions(data.questions);
    setTemplateOpen(false);
    toast.success("Szablon zastosowany");
  }

  const unsectionedQs = questions.filter((q) => !q.sectionId);
  const isEmpty = questions.length === 0 && sections.length === 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0">
        <button
          onClick={() => router.push("/ankiety")}
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft size={18} />
        </button>

        {editNameOpen ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <input
              type="text" value={editNameValue}
              onChange={(e) => setEditNameValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleNameSave(); if (e.key === "Escape") setEditNameOpen(false); }}
              className="flex-1 text-sm font-semibold border-b border-primary bg-transparent outline-none"
              autoFocus
            />
            <button onClick={handleNameSave} className="p-1 rounded text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"><Check size={14} /></button>
            <button onClick={() => setEditNameOpen(false)} className="p-1 rounded text-muted-foreground hover:bg-muted"><X size={14} /></button>
          </div>
        ) : (
          <button
            onClick={() => { setEditNameValue(survey.name); setEditNameOpen(true); }}
            className="flex items-center gap-1.5 text-sm font-semibold hover:text-primary transition-colors truncate max-w-xs"
          >
            {survey.name}
            <Edit2 size={12} className="text-muted-foreground flex-shrink-0" />
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <select
            value={survey.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={statusSaving}
            className="px-2 py-1 text-xs border border-border rounded-lg bg-background focus:outline-none"
          >
            <option value="DRAFT">Szkic</option>
            <option value="ACTIVE">Aktywna</option>
            <option value="CLOSED">Zamknięta</option>
          </select>
          <a
            href={`/share/survey/${survey.id}/podglad`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <Eye size={14} />
            Podgląd
          </a>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: config + empty state */}
        <div className="w-72 flex-shrink-0 border-r border-border flex flex-col overflow-hidden bg-card">
          <div className="flex-1 overflow-y-auto p-4">
            {selectedQuestion ? (
              <QuestionConfigPanel
                key={selectedQuestion.id}
                question={selectedQuestion}
                onUpdate={(data) => handleUpdateQuestion(selectedQuestion.id, data)}
                sections={sections}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center gap-2 px-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Kliknij pytanie na podglądzie, aby edytować jego konfigurację.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: live preview */}
        <div className="flex-1 overflow-y-auto bg-muted/30 flex flex-col">

          {/* ── Sticky toolbar ── */}
          <div className="sticky top-0 z-20 pt-3 pb-1 bg-muted/30 flex-shrink-0 flex justify-center px-6">
            <div className="bg-muted/40 border border-border rounded-xl shadow-sm p-2 w-fit">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setAddSectionOpen((v) => !v)}
                  className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <Plus size={13} />
                  Sekcja
                </button>
                <div className="w-px h-5 bg-border mx-0.5" />
                {QUESTION_TYPES.map((qt) => (
                  <button
                    key={qt.value}
                    onClick={() => handleAddQuestion(qt.value)}
                    className="flex items-center gap-1.5 h-8 px-3 text-xs rounded-lg border border-border bg-background hover:bg-muted transition-colors"
                  >
                    <Plus size={13} />
                    {qt.label}
                  </button>
                ))}
              </div>
              {addSectionOpen && (
                <div className="flex gap-2 mt-2 pt-2 border-t border-border">
                  <input
                    type="text"
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddSection(); if (e.key === "Escape") setAddSectionOpen(false); }}
                    placeholder="Nazwa sekcji..."
                    className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                    autoFocus
                  />
                  <button onClick={handleAddSection} className="h-9 px-4 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">Utwórz</button>
                  <button onClick={() => setAddSectionOpen(false)} className="h-9 px-3 text-xs border border-border rounded-lg hover:bg-muted transition-colors">Anuluj</button>
                </div>
              )}
            </div>
          </div>

          {/* ── Scrollable content ── */}
          <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 pb-10 pt-5 space-y-3">

            {/* ── Survey title ── */}
            <div className="bg-card border-t-4 border-t-primary border border-border rounded-xl px-6 py-5">
              <h1 className="text-xl font-semibold">{survey.name}</h1>
              {survey.project && <p className="text-sm text-muted-foreground mt-1">{survey.project.title}</p>}
            </div>

            {isEmpty && (
              <div className="flex flex-col items-center justify-center py-16 gap-4 text-center bg-card border border-dashed border-border rounded-xl">
                <p className="text-sm text-muted-foreground">Ankieta nie ma jeszcze pytań.</p>
                <button
                  onClick={() => setTemplateOpen(true)}
                  className="px-4 py-2 text-sm font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                >
                  Zacznij od szablonu
                </button>
              </div>
            )}

            {/* ── Section blocks (sortable) ── */}
            {sections.length > 0 && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleSectionDragStart} onDragEnd={handleSectionDragEnd}>
                <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  {sections.map((section) => {
                    const sectionQs = questions.filter((q) => q.sectionId === section.id);
                    return (
                      <SortableSectionBlock
                        key={section.id}
                        section={section}
                        sectionQs={sectionQs}
                        selectedId={selectedId}
                        onSelect={selectQuestion}
                        onSectionActivate={() => setCurrentSectionId(section.id)}
                        onRename={(name) => handleRenameSection(section.id, name)}
                        onDelete={() => handleDeleteSection(section.id)}
                        onQuestionDelete={handleDeleteQuestion}
                        onQuestionUpdate={handleUpdateQuestion}
                        onQuestionDragEnd={(e) => handleSectionQuestionDragEnd(section.id, e)}
                        sensors={sensors}
                        isCollapsed={activeSectionId !== null && activeSectionId !== section.id}
                      />
                    );
                  })}
                </SortableContext>
              </DndContext>
            )}

            {/* ── Unsectioned questions (sortable) ── */}
            {unsectionedQs.length > 0 && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleQuestionDragStart} onDragEnd={handleQuestionDragEnd}>
                <SortableContext items={unsectionedQs.map((q) => q.id)} strategy={verticalListSortingStrategy}>
                  {unsectionedQs.map((q) => (
                    <SortablePreviewCard
                      key={q.id}
                      question={q}
                      selected={selectedId === q.id}
                      onSelect={() => { selectQuestion(q.id); setCurrentSectionId(null); }}
                      onDelete={() => handleDeleteQuestion(q.id)}
                      onUpdate={(data) => handleUpdateQuestion(q.id, data)}
                      isCollapsed={activeQuestionId !== null && activeQuestionId !== q.id}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}

          </div>
          </div>
        </div>
      </div>

      <SurveyTemplateDialog
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        onApplied={handleTemplateApplied}
        surveyId={survey.id}
      />
    </div>
  );
}

// ── Sortable Section Block ─────────────────────────────────────────────────

function SortableSectionBlock({
  section, sectionQs, selectedId, onSelect, onSectionActivate, onRename, onDelete, onQuestionDelete, onQuestionUpdate,
  onQuestionDragEnd, sensors, isCollapsed,
}: {
  section: SurveySection;
  sectionQs: SurveyQuestion[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSectionActivate: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onQuestionDelete: (id: string) => void;
  onQuestionUpdate: (id: string, data: any) => void;
  onQuestionDragEnd: (event: DragEndEvent) => void;
  sensors: ReturnType<typeof useSensors>;
  isCollapsed?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const [activeInnerQId, setActiveInnerQId] = useState<string | null>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="space-y-3">
      {/* Section header with drag handle */}
      <div
        className={`bg-card border border-border rounded-xl px-5 py-4 flex items-center gap-3 group transition-opacity cursor-pointer ${isCollapsed ? "opacity-40" : ""}`}
        onClick={onSectionActivate}
      >
        <span
          {...attributes}
          {...listeners}
          suppressHydrationWarning
          className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing flex-shrink-0"
        >
          <GripVertical size={16} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Sekcja</p>
          <SectionNameInput section={section} onRename={onRename} />
        </div>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all flex-shrink-0"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Questions in this section — sortable */}
      {!isCollapsed && (
        <>
          {sectionQs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">Brak pytań w tej sekcji</p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={(e) => setActiveInnerQId(e.active.id as string)}
              onDragEnd={(e) => { setActiveInnerQId(null); onQuestionDragEnd(e); }}
            >
              <SortableContext items={sectionQs.map((q) => q.id)} strategy={verticalListSortingStrategy}>
                {sectionQs.map((q) => (
                  <SortablePreviewCard
                    key={q.id}
                    question={q}
                    selected={selectedId === q.id}
                    onSelect={() => onSelect(q.id)}
                    onDelete={() => onQuestionDelete(q.id)}
                    onUpdate={(data) => onQuestionUpdate(q.id, data)}
                    isCollapsed={activeInnerQId !== null && activeInnerQId !== q.id}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </>
      )}
    </div>
  );
}

// ── Section name inline edit ───────────────────────────────────────────────

function SectionNameInput({ section, onRename }: { section: SurveySection; onRename: (name: string) => void }) {
  const [name, setName] = useState(section.name);
  return (
    <input
      type="text"
      value={name}
      onChange={(e) => setName(e.target.value)}
      onBlur={() => { if (name.trim() && name.trim() !== section.name) onRename(name.trim()); }}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      className="w-full font-medium text-sm bg-transparent border-0 border-b border-transparent hover:border-border focus:border-primary focus:outline-none transition-colors py-0.5"
    />
  );
}

// ── Sortable Preview Card (unsectioned) ────────────────────────────────────

function SortablePreviewCard({
  question, selected, onSelect, onDelete, onUpdate, isCollapsed,
}: {
  question: SurveyQuestion;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onUpdate: (data: any) => void;
  isCollapsed?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <PreviewCard
        question={question}
        selected={selected}
        onSelect={onSelect}
        onDelete={onDelete}
        onUpdate={onUpdate}
        dragHandleProps={{ ...attributes, ...listeners }}
        isCollapsed={isCollapsed}
      />
    </div>
  );
}

// ── Preview Card ───────────────────────────────────────────────────────────

function PreviewCard({
  question, selected, onSelect, onDelete, onUpdate, dragHandleProps, isCollapsed,
}: {
  question: SurveyQuestion;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onUpdate: (data: any) => void;
  dragHandleProps?: Record<string, any>;
  isCollapsed?: boolean;
}) {
  const [label, setLabel] = useState(question.label);
  const typeLabel = QUESTION_TYPES.find((t) => t.value === question.type)?.label ?? question.type;

  if (isCollapsed) {
    return (
      <div className="bg-card border border-border rounded-xl px-5 py-3 flex items-center gap-3 opacity-50 transition-opacity">
        <span className={`text-muted-foreground/40 flex-shrink-0 ${dragHandleProps ? "cursor-grab active:cursor-grabbing" : "cursor-default opacity-0"}`}>
          <GripVertical size={16} />
        </span>
        <p className="text-sm font-medium truncate flex-1">{label || "Nowe pytanie"}</p>
        <span className="text-xs text-muted-foreground flex-shrink-0">{typeLabel}</span>
      </div>
    );
  }

  return (
    <div
      className={`bg-card border rounded-xl overflow-hidden transition-all group ${
        selected ? "border-primary border-l-4 shadow-sm" : "border-border hover:shadow-sm"
      }`}
    >
      {/* Top row: drag handle + delete */}
      <div className="flex items-center justify-between px-4 pt-3 pb-0">
        <span
          {...(dragHandleProps ?? {})}
          suppressHydrationWarning
          className={`text-muted-foreground/40 hover:text-muted-foreground flex-shrink-0 ${dragHandleProps ? "cursor-grab active:cursor-grabbing" : "cursor-default opacity-0"}`}
        >
          <GripVertical size={16} />
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-red-500 transition-all"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Content */}
      <div className="px-6 pb-5 pt-2 space-y-3" onClick={onSelect}>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onFocus={onSelect}
          onBlur={() => { if (label.trim() && label.trim() !== question.label) onUpdate({ label: label.trim() }); }}
          onClick={(e) => e.stopPropagation()}
          placeholder="Treść pytania"
          className="w-full font-medium text-sm bg-transparent border-0 border-b border-transparent hover:border-border focus:border-primary focus:outline-none transition-colors py-0.5"
        />
        {question.description && (
          <p className="text-xs text-muted-foreground -mt-2">{question.description}</p>
        )}
        <PreviewFormControl question={question} onUpdate={onUpdate} />
      </div>
    </div>
  );
}

// ── Preview Form Control ───────────────────────────────────────────────────

function PreviewFormControl({ question, onUpdate }: { question: SurveyQuestion; onUpdate: (data: any) => void }) {
  const [opts, setOpts] = useState<string[]>(question.options ?? ["Opcja 1", "Opcja 2"]);
  const [newOpt, setNewOpt] = useState("");
  const cfg = question.config ?? {};
  const min = cfg.min ?? 1;
  const max = cfg.max ?? 5;

  function saveOptions(next: string[]) { setOpts(next); onUpdate({ options: next }); }
  function addOption() {
    const val = newOpt.trim() || `Opcja ${opts.length + 1}`;
    saveOptions([...opts, val]);
    setNewOpt("");
  }

  const indicatorClass = "flex-shrink-0 mt-0.5";

  switch (question.type) {
    case "short_text":
      return (
        <input type="text" disabled placeholder="Krótka odpowiedź"
          className="w-full border-0 border-b border-border bg-transparent text-sm py-1 text-muted-foreground placeholder:text-muted-foreground/50 focus:outline-none cursor-default" />
      );
    case "long_text":
      return (
        <textarea disabled placeholder="Długa odpowiedź" rows={2}
          className="w-full border-0 border-b border-border bg-transparent text-sm py-1 text-muted-foreground placeholder:text-muted-foreground/50 focus:outline-none resize-none cursor-default" />
      );
    case "single_choice":
    case "multiple_choice": {
      const isRadio = question.type === "single_choice";
      return (
        <div className="space-y-1.5">
          {opts.map((opt, i) => (
            <div key={i} className="flex items-start gap-2.5 group/opt">
              <div className={`w-4 h-4 ${isRadio ? "rounded-full" : "rounded"} border-2 border-muted-foreground/40 ${indicatorClass}`} />
              <input
                type="text" value={opt}
                onChange={(e) => { const next = opts.map((o, j) => j === i ? e.target.value : o); setOpts(next); }}
                onBlur={() => onUpdate({ options: opts })}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 text-sm bg-transparent border-0 border-b border-transparent hover:border-border focus:border-primary focus:outline-none transition-colors py-0.5"
              />
              <button
                onClick={(e) => { e.stopPropagation(); if (opts.length > 2) saveOptions(opts.filter((_, j) => j !== i)); }}
                disabled={opts.length <= 2}
                className="opacity-0 group-hover/opt:opacity-100 p-1 rounded text-muted-foreground hover:text-red-500 disabled:opacity-0 transition-all flex-shrink-0"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2.5 mt-1">
            <div className={`w-4 h-4 ${isRadio ? "rounded-full" : "rounded"} border-2 border-muted-foreground/20 ${indicatorClass}`} />
            <input
              type="text" value={newOpt}
              onChange={(e) => setNewOpt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); addOption(); } }}
              onBlur={() => { if (newOpt.trim()) addOption(); }}
              onClick={(e) => e.stopPropagation()}
              placeholder="Dodaj opcję..."
              className="flex-1 text-sm text-muted-foreground bg-transparent border-0 border-b border-transparent hover:border-border focus:border-primary focus:outline-none focus:text-foreground transition-colors py-0.5 placeholder:text-muted-foreground/50"
            />
          </div>
        </div>
      );
    }
    case "rating":
      return (
        <div className="flex gap-1.5 flex-wrap">
          {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
            <div key={n} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-sm text-muted-foreground">{n}</div>
          ))}
        </div>
      );
    case "yes_no":
      return (
        <div className="flex gap-2">
          <div className="px-5 py-2 rounded-lg border border-border text-sm text-muted-foreground">Tak</div>
          <div className="px-5 py-2 rounded-lg border border-border text-sm text-muted-foreground">Nie</div>
        </div>
      );
    case "budget_range": {
      const bMin = cfg.min ?? 0;
      const bMax = cfg.max ?? 200000;
      return (
        <div className="space-y-1.5">
          <input type="range" disabled min={bMin} max={bMax} defaultValue={Math.round((bMin + bMax) / 2)} className="w-full accent-primary cursor-default" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{bMin.toLocaleString("pl-PL")} zł</span>
            <span>{bMax.toLocaleString("pl-PL")} zł</span>
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}

// ── Question Config Panel ──────────────────────────────────────────────────

function QuestionConfigPanel({
  question, onUpdate, sections,
}: {
  question: SurveyQuestion;
  onUpdate: (data: any) => void;
  sections: SurveySection[];
}) {
  const [label, setLabel] = useState(question.label);
  const [description, setDescription] = useState(question.description ?? "");
  const [required, setRequired] = useState(question.required);
  const [options, setOptions] = useState<string[]>(question.options ?? ["Opcja 1", "Opcja 2"]);
  const [newOption, setNewOption] = useState("");
  const [config, setConfig] = useState<Record<string, number>>(question.config ?? {});

  const showOptions = question.type === "single_choice" || question.type === "multiple_choice";
  const showRatingConfig = question.type === "rating";
  const showBudgetConfig = question.type === "budget_range";

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Konfiguracja pytania</h2>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Typ pytania</label>
        <select
          defaultValue={question.type}
          onChange={(e) => onUpdate({ type: e.target.value })}
          className="w-full px-2.5 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none"
        >
          {QUESTION_TYPES.map((qt) => (
            <option key={qt.value} value={qt.value}>{qt.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Treść pytania</label>
        <input
          type="text" value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => { if (label.trim() !== question.label) onUpdate({ label }); }}
          className="w-full px-2.5 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Opis pomocniczy</label>
        <input
          type="text" value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => onUpdate({ description: description || null })}
          placeholder="Opcjonalne wyjaśnienie..."
          className="w-full px-2.5 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {sections.length > 0 && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Sekcja</label>
          <select
            defaultValue={question.sectionId ?? ""}
            onChange={(e) => onUpdate({ sectionId: e.target.value || null })}
            className="w-full px-2.5 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none"
          >
            <option value="">— bez sekcji —</option>
            {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => { const next = !required; setRequired(next); onUpdate({ required: next }); }}
          className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${required ? "bg-primary" : "bg-muted-foreground/30"}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${required ? "left-4" : "left-0.5"}`} />
        </div>
        <span className="text-sm font-medium">Wymagane</span>
      </label>

      {showOptions && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Opcje odpowiedzi</label>
          <div className="space-y-1.5">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  type="text" value={opt}
                  onChange={(e) => { const next = options.map((o, j) => j === i ? e.target.value : o); setOptions(next); }}
                  onBlur={() => onUpdate({ options })}
                  className="flex-1 px-2.5 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
                <button
                  onClick={() => { if (options.length <= 2) return; const next = options.filter((_, j) => j !== i); setOptions(next); onUpdate({ options: next }); }}
                  disabled={options.length <= 2}
                  className="p-1.5 rounded text-muted-foreground hover:text-red-500 disabled:opacity-30 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input
              type="text" value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newOption.trim()) {
                  const next = [...options, newOption.trim()]; setOptions(next); onUpdate({ options: next }); setNewOption("");
                }
              }}
              placeholder="Nowa opcja..."
              className="flex-1 px-2.5 py-1.5 text-sm border border-dashed border-border rounded-lg bg-background focus:outline-none"
            />
            <button
              onClick={() => { if (!newOption.trim()) return; const next = [...options, newOption.trim()]; setOptions(next); onUpdate({ options: next }); setNewOption(""); }}
              className="px-2.5 py-1.5 text-xs border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>
      )}

      {showRatingConfig && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Skala oceny</label>
          <div className="flex items-center gap-3">
            {[{ key: "min", label: "Min", min: 1, max: 9 }, { key: "max", label: "Max", min: 2, max: 10 }].map(({ key, label, min, max }) => (
              <div key={key} className="space-y-1 flex-1">
                <label className="text-xs text-muted-foreground">{label}</label>
                <input
                  type="number"
                  value={config[key] ?? (key === "min" ? 1 : 5)}
                  onChange={(e) => setConfig((c) => ({ ...c, [key]: Number(e.target.value) }))}
                  onBlur={() => onUpdate({ config })}
                  min={min} max={max}
                  className="w-full px-2 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none text-center"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {showBudgetConfig && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Zakres budżetu (PLN)</label>
          {[{ key: "min", label: "Min" }, { key: "max", label: "Max" }, { key: "step", label: "Krok" }].map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <label className="text-xs text-muted-foreground">{label}</label>
              <input
                type="number"
                value={config[key] ?? (key === "min" ? 0 : key === "max" ? 200000 : 1000)}
                onChange={(e) => setConfig((c) => ({ ...c, [key]: Number(e.target.value) }))}
                onBlur={() => onUpdate({ config })}
                className="w-full px-2.5 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
