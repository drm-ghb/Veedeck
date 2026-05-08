"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronDown, ChevronRight, Plus, Pencil, Trash2,
  Paperclip, Check, X, Download, Loader2, GripVertical,
} from "@/components/ui/icons";
import { useUploadThing } from "@/lib/uploadthing-client";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ── Upload button ────────────────────────────────────────────────────────────

function AttachmentUploadButton({ onUploaded }: { onUploaded: (url: string, name: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const { startUpload } = useUploadThing("paymentAttachmentUploader");

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const uploaded = await startUpload([f]);
      if (uploaded?.[0]) onUploaded(uploaded[0].ufsUrl, f.name);
    } catch {
      toast.error("Błąd przesyłania pliku");
    } finally {
      setUploading(false);
    }
  }

  return (
    <label className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100">
      {uploading ? <Loader2 size={13} className="animate-spin" /> : <Paperclip size={13} />}
      <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleChange} />
    </label>
  );
}

// ── Types ────────────────────────────────────────────────────────────────────

interface PaymentGroup {
  id: string;
  clientId: string;
  parentId: string | null;
  name: string;
  order: number;
}

interface Payment {
  id: string;
  clientId: string;
  groupId: string | null;
  name: string;
  amount: number;
  status: "pending" | "paid";
  attachmentUrl: string | null;
  attachmentName: string | null;
  order: number;
}

interface Props {
  clientId: string;
  projectId: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatPLN(amount: number) {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(amount);
}

function buildTree(groups: PaymentGroup[], parentId: string | null): PaymentGroup[] {
  return groups.filter((g) => g.parentId === parentId).sort((a, b) => a.order - b.order);
}

function sumGroup(groupId: string, payments: Payment[], groups: PaymentGroup[]): number {
  const direct = payments.filter((p) => p.groupId === groupId).reduce((s, p) => s + p.amount, 0);
  const children = groups.filter((g) => g.parentId === groupId);
  return direct + children.reduce((s, g) => s + sumGroup(g.id, payments, groups), 0);
}

function isDescendant(ancestorId: string, targetId: string, groups: PaymentGroup[]): boolean {
  const children = groups.filter((g) => g.parentId === ancestorId);
  return children.some((g) => g.id === targetId || isDescendant(g.id, targetId, groups));
}

// ── GroupRow component ───────────────────────────────────────────────────────

interface GroupRowProps {
  group: PaymentGroup;
  depth: number;
  isDndActive: boolean;
  isEditing: boolean;
  editingName: string;
  isCollapsed: boolean;
  groupTotal: number;
  children?: React.ReactNode;
  addGroupForm?: React.ReactNode;
  addPaymentForm?: React.ReactNode;
  onToggleCollapse: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditNameChange: (v: string) => void;
  onDelete: () => void;
  onAddSubgroup: () => void;
  onAddPayment: () => void;
}

function GroupRow({
  group, depth, isDndActive, isEditing, editingName, isCollapsed, groupTotal,
  children, addGroupForm, addPaymentForm,
  onToggleCollapse, onStartEdit, onSaveEdit, onCancelEdit, onEditNameChange,
  onDelete, onAddSubgroup, onAddPayment,
}: GroupRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: group.id,
    data: { type: "group", parentId: group.parentId },
  });

  const sortableStyle = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const indent = depth * 16;
  const isDropTarget = isDndActive && isOver && !isDragging;

  return (
    <div ref={setNodeRef} style={sortableStyle} className="mb-1">
      <div
        className={`flex items-center gap-1.5 py-1.5 rounded-lg group cursor-pointer transition-colors ${
          isDropTarget ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted/40"
        }`}
        style={{ paddingLeft: `${12 + indent}px`, paddingRight: "12px" }}
      >
        <div
          {...attributes}
          {...listeners}
          className="flex-shrink-0 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical size={14} />
        </div>

        <button onClick={onToggleCollapse} className="text-muted-foreground hover:text-foreground flex-shrink-0">
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>

        {isEditing ? (
          <>
            <Input
              autoFocus
              value={editingName}
              onChange={(e) => onEditNameChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onSaveEdit(); if (e.key === "Escape") onCancelEdit(); }}
              className="h-6 text-sm flex-1 font-medium"
            />
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onSaveEdit}><Check size={12} /></Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onCancelEdit}><X size={12} /></Button>
          </>
        ) : (
          <>
            <span className="flex-1 text-sm font-semibold" onClick={onToggleCollapse}>{group.name}</span>
            {isDropTarget && (
              <span className="text-xs text-primary font-medium flex-shrink-0 mr-1">Upuść tutaj</span>
            )}
            <span className="text-sm font-medium tabular-nums text-muted-foreground">{formatPLN(groupTotal)}</span>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
              <button onClick={(e) => { e.stopPropagation(); onAddSubgroup(); }} className="p-1 rounded text-muted-foreground hover:text-foreground" title="Dodaj podgrupę"><Plus size={12} /></button>
              <button onClick={(e) => { e.stopPropagation(); onAddPayment(); }} className="p-1 rounded text-muted-foreground hover:text-foreground" title="Dodaj płatność"><Plus size={12} className="opacity-60" /></button>
              <button onClick={(e) => { e.stopPropagation(); onStartEdit(); }} className="p-1 rounded text-muted-foreground hover:text-foreground"><Pencil size={12} /></button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 rounded text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
            </div>
          </>
        )}
      </div>

      {!isCollapsed && (
        <div>
          {children}
          {addPaymentForm}
          {addGroupForm}
        </div>
      )}
    </div>
  );
}

// ── PaymentRow component ─────────────────────────────────────────────────────

interface PaymentRowProps {
  payment: Payment;
  depth: number;
  isEditing: boolean;
  editingName: string;
  editingAmount: string;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditNameChange: (v: string) => void;
  onEditAmountChange: (v: string) => void;
  onToggleStatus: () => void;
  onDelete: () => void;
  onUploadComplete: (url: string, name: string) => void;
  onSaveAmountInline: (amount: string) => void;
}

function PaymentRow({
  payment, depth, isEditing, editingName, editingAmount,
  onStartEdit, onSaveEdit, onCancelEdit, onEditNameChange, onEditAmountChange,
  onToggleStatus, onDelete, onUploadComplete, onSaveAmountInline,
}: PaymentRowProps) {
  const [inlineAmountEdit, setInlineAmountEdit] = useState(false);
  const [inlineAmountValue, setInlineAmountValue] = useState("");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: payment.id,
    data: { type: "payment", groupId: payment.groupId },
  });

  const sortableStyle = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const indent = depth * 16;

  return (
    <div
      ref={setNodeRef}
      style={{ ...sortableStyle, paddingLeft: `${12 + indent}px` }}
      className="flex items-center gap-2 py-1.5 pr-3 rounded-lg hover:bg-muted/40 group"
    >
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical size={14} />
      </div>

      <button
        onClick={onToggleStatus}
        title={payment.status === "paid" ? "Oznacz jako nieopłacone" : "Oznacz jako opłacone"}
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          payment.status === "paid"
            ? "bg-green-500 border-green-500 text-white"
            : "border-muted-foreground hover:border-green-500"
        }`}
      >
        {payment.status === "paid" && <Check size={10} />}
      </button>

      {isEditing ? (
        <>
          <Input autoFocus value={editingName} onChange={(e) => onEditNameChange(e.target.value)} className="h-6 text-sm flex-1" />
          <Input value={editingAmount} onChange={(e) => onEditAmountChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") onSaveEdit(); }} className="h-6 text-sm w-28" />
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onSaveEdit}><Check size={12} /></Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onCancelEdit}><X size={12} /></Button>
        </>
      ) : (
        <>
          <span className={`flex-1 text-sm ${payment.status === "paid" ? "line-through text-muted-foreground" : ""}`}>
            {payment.name}
          </span>
          {inlineAmountEdit ? (
            <Input
              autoFocus
              value={inlineAmountValue}
              onChange={(e) => setInlineAmountValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { onSaveAmountInline(inlineAmountValue); setInlineAmountEdit(false); }
                if (e.key === "Escape") setInlineAmountEdit(false);
              }}
              onBlur={() => { onSaveAmountInline(inlineAmountValue); setInlineAmountEdit(false); }}
              className="h-6 text-sm w-28 tabular-nums"
            />
          ) : (
            <span
              className={`text-sm font-medium tabular-nums cursor-default ${payment.status === "paid" ? "text-muted-foreground" : ""}`}
              onClick={() => { setInlineAmountValue(String(payment.amount)); setInlineAmountEdit(true); }}
            >
              {formatPLN(payment.amount)}
            </span>
          )}
          <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
            payment.status === "paid"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          }`}>
            {payment.status === "paid" ? "Opłacone" : "Do opłacenia"}
          </span>
          <div className="flex-shrink-0">
            {payment.attachmentUrl ? (
              <a href={payment.attachmentUrl} target="_blank" rel="noopener noreferrer" title={payment.attachmentName ?? "Załącznik"} className="text-muted-foreground hover:text-foreground transition-colors">
                <Paperclip size={13} />
              </a>
            ) : (
              <AttachmentUploadButton onUploaded={onUploadComplete} />
            )}
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onStartEdit} className="p-1 rounded text-muted-foreground hover:text-foreground"><Pencil size={12} /></button>
            <button onClick={onDelete} className="p-1 rounded text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function PaymentsTab({ clientId, projectId }: Props) {
  const [groups, setGroups] = useState<PaymentGroup[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const [totalAmount, setTotalAmount] = useState<number | null>(null);
  const [editingTotal, setEditingTotal] = useState(false);
  const [totalInput, setTotalInput] = useState("");

  const [addingGroup, setAddingGroup] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");

  const [addingPayment, setAddingPayment] = useState<string | null>(null);
  const [newPaymentName, setNewPaymentName] = useState("");
  const [newPaymentAmount, setNewPaymentAmount] = useState("");

  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editingPaymentName, setEditingPaymentName] = useState("");
  const [editingPaymentAmount, setEditingPaymentAmount] = useState("");

  // DnD
  const [dndActiveId, setDndActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/payments?clientId=${clientId}`);
      if (!res.ok) return;
      const data = await res.json();
      setGroups(data.groups);
      setPayments(data.payments);
      if (data.totalAmount != null) setTotalAmount(data.totalAmount);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { if (clientId) load(); else setLoading(false); }, [load, clientId]);

  // ── Computed ────────────────────────────────────────────────────────────────

  const paidAmount = payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
  const totalPaymentsAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = (totalAmount ?? totalPaymentsAmount) - paidAmount;
  const allPaid = payments.length > 0 && payments.every((p) => p.status === "paid");

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleAddGroup(parentId: string | null) {
    if (!newGroupName.trim()) return;
    const res = await fetch("/api/payment-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, parentId, name: newGroupName.trim() }),
    });
    if (!res.ok) { toast.error("Błąd dodawania grupy"); return; }
    const newGroup = await res.json();
    setGroups((prev) => [...prev, newGroup]);
    setNewGroupName("");
    setAddingGroup(null);
  }

  async function handleAddPayment(groupId: string | null) {
    if (!newPaymentName.trim()) return;
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId, groupId,
        name: newPaymentName.trim(),
        amount: newPaymentAmount.trim() ? parseFloat(newPaymentAmount.replace(",", ".")) : 0,
      }),
    });
    if (!res.ok) { toast.error("Błąd dodawania płatności"); return; }
    const newPayment = await res.json();
    setPayments((prev) => [...prev, newPayment]);
    setNewPaymentName("");
    setNewPaymentAmount("");
    setAddingPayment(null);
  }

  async function handleDeleteGroup(id: string) {
    const res = await fetch(`/api/payment-groups/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Błąd usuwania grupy"); return; }
    load();
  }

  async function handleDeletePayment(id: string) {
    const res = await fetch(`/api/payments/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Błąd usuwania płatności"); return; }
    setPayments((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleToggleStatus(payment: Payment) {
    const newStatus = payment.status === "paid" ? "pending" : "paid";
    setPayments((prev) => prev.map((p) => p.id === payment.id ? { ...p, status: newStatus } : p));
    const res = await fetch(`/api/payments/${payment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      setPayments((prev) => prev.map((p) => p.id === payment.id ? { ...p, status: payment.status } : p));
      toast.error("Błąd zmiany statusu");
    }
  }

  async function handleSaveGroup(id: string) {
    if (!editingGroupName.trim()) return;
    const res = await fetch(`/api/payment-groups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingGroupName.trim() }),
    });
    if (!res.ok) { toast.error("Błąd zapisu grupy"); return; }
    setGroups((prev) => prev.map((g) => g.id === id ? { ...g, name: editingGroupName.trim() } : g));
    setEditingGroupId(null);
  }

  async function handleSavePayment(id: string) {
    if (!editingPaymentName.trim() || !editingPaymentAmount) return;
    const amount = parseFloat(editingPaymentAmount.replace(",", "."));
    const res = await fetch(`/api/payments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingPaymentName.trim(), amount }),
    });
    if (!res.ok) { toast.error("Błąd zapisu płatności"); return; }
    setPayments((prev) => prev.map((p) => p.id === id ? { ...p, name: editingPaymentName.trim(), amount } : p));
    setEditingPaymentId(null);
  }

  async function handleUploadComplete(paymentId: string, url: string, name: string) {
    const res = await fetch(`/api/payments/${paymentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attachmentUrl: url, attachmentName: name }),
    });
    if (!res.ok) { toast.error("Błąd zapisu załącznika"); return; }
    setPayments((prev) => prev.map((p) => p.id === paymentId ? { ...p, attachmentUrl: url, attachmentName: name } : p));
  }

  async function handleSaveTotal() {
    const val = parseFloat(totalInput.replace(",", "."));
    if (isNaN(val)) return;
    await fetch(`/api/payments?clientId=${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ totalAmount: val }),
    });
    setTotalAmount(val);
    setEditingTotal(false);
  }

  function handleExportCSV() {
    const rows = [["Nazwa", "Kwota", "Status", "Grupa"]];
    for (const p of payments) {
      const group = groups.find((g) => g.id === p.groupId);
      rows.push([p.name, p.amount.toString(), p.status === "paid" ? "Opłacone" : "Do opłacenia", group?.name ?? ""]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "platnosci.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  // ── Drag & drop ─────────────────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    setDndActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setDndActiveId(null);
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const activeType = active.data.current?.type as "group" | "payment";
    const overType = over.data.current?.type as "group" | "payment";

    if (activeType === "payment") {
      if (overType === "group") {
        // Drop payment INTO a group
        const payment = payments.find((p) => p.id === activeId);
        if (!payment || payment.groupId === overId) return;
        setPayments((prev) => prev.map((p) => p.id === activeId ? { ...p, groupId: overId } : p));
        fetch(`/api/payments/${activeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId: overId }),
        }).catch(() => toast.error("Błąd przenoszenia płatności"));
      } else {
        // Reorder payment or move to different group
        const activePayment = payments.find((p) => p.id === activeId);
        const overPayment = payments.find((p) => p.id === overId);
        if (!activePayment || !overPayment) return;

        if (activePayment.groupId === overPayment.groupId) {
          // Same group — reorder
          const siblings = payments
            .filter((p) => p.groupId === activePayment.groupId)
            .sort((a, b) => a.order - b.order);
          const reordered = arrayMove(
            siblings,
            siblings.findIndex((p) => p.id === activeId),
            siblings.findIndex((p) => p.id === overId),
          ).map((p, i) => ({ ...p, order: i }));
          setPayments((prev) => [
            ...prev.filter((p) => p.groupId !== activePayment.groupId),
            ...reordered,
          ]);
          reordered.forEach((p) =>
            fetch(`/api/payments/${p.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ order: p.order }),
            }).catch(() => {})
          );
        } else {
          // Different group — move payment there
          setPayments((prev) =>
            prev.map((p) => p.id === activeId ? { ...p, groupId: overPayment.groupId } : p)
          );
          fetch(`/api/payments/${activeId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ groupId: overPayment.groupId }),
          }).catch(() => toast.error("Błąd przenoszenia płatności"));
        }
      }
    } else if (activeType === "group") {
      if (overType === "group") {
        const activeGroup = groups.find((g) => g.id === activeId);
        const overGroup = groups.find((g) => g.id === overId);
        if (!activeGroup || !overGroup) return;

        if (activeGroup.parentId === overGroup.parentId) {
          // Same parent — reorder
          const siblings = groups
            .filter((g) => g.parentId === activeGroup.parentId)
            .sort((a, b) => a.order - b.order);
          const reordered = arrayMove(
            siblings,
            siblings.findIndex((g) => g.id === activeId),
            siblings.findIndex((g) => g.id === overId),
          ).map((g, i) => ({ ...g, order: i }));
          setGroups((prev) => [
            ...prev.filter((g) => g.parentId !== activeGroup.parentId),
            ...reordered,
          ]);
          reordered.forEach((g) =>
            fetch(`/api/payment-groups/${g.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ order: g.order }),
            }).catch(() => {})
          );
        } else {
          // Different parent — move group into over group
          if (isDescendant(activeId, overId, groups)) return; // prevent circular
          setGroups((prev) => prev.map((g) => g.id === activeId ? { ...g, parentId: overId } : g));
          fetch(`/api/payment-groups/${activeId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ parentId: overId }),
          }).catch(() => toast.error("Błąd przenoszenia grupy"));
        }
      }
    }
  }

  // ── Render helpers ───────────────────────────────────────────────────────────

  function renderAddGroupForm(parentId: string | null) {
    const key = parentId ?? "root";
    if (addingGroup !== key) return null;
    return (
      <div className="flex items-center gap-2 mt-2 ml-4">
        <Input
          autoFocus
          placeholder="Nazwa grupy"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAddGroup(parentId); if (e.key === "Escape") { setAddingGroup(null); setNewGroupName(""); } }}
          className="h-7 text-sm"
        />
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleAddGroup(parentId)}><Check size={14} /></Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setAddingGroup(null); setNewGroupName(""); }}><X size={14} /></Button>
      </div>
    );
  }

  function renderAddPaymentForm(groupId: string | null) {
    const key = groupId ?? "root";
    if (addingPayment !== key) return null;
    return (
      <div className="flex items-center gap-2 mt-2 ml-4">
        <Input
          autoFocus
          placeholder="Nazwa płatności"
          value={newPaymentName}
          onChange={(e) => setNewPaymentName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAddPayment(groupId); if (e.key === "Escape") { setAddingPayment(null); setNewPaymentName(""); setNewPaymentAmount(""); } }}
          className="h-7 text-sm flex-1"
        />
        <Input
          placeholder="Kwota"
          value={newPaymentAmount}
          onChange={(e) => setNewPaymentAmount(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAddPayment(groupId); }}
          className="h-7 text-sm w-28"
        />
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleAddPayment(groupId)}><Check size={14} /></Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setAddingPayment(null); setNewPaymentName(""); setNewPaymentAmount(""); }}><X size={14} /></Button>
      </div>
    );
  }

  function renderGroup(group: PaymentGroup, depth: number): React.ReactNode {
    const groupPayments = payments
      .filter((p) => p.groupId === group.id)
      .sort((a, b) => a.order - b.order);
    const childGroups = buildTree(groups, group.id);
    const childIds = [
      ...groupPayments.map((p) => p.id),
      ...childGroups.map((g) => g.id),
    ];

    return (
      <GroupRow
        key={group.id}
        group={group}
        depth={depth}
        isDndActive={!!dndActiveId}
        isEditing={editingGroupId === group.id}
        editingName={editingGroupName}
        isCollapsed={!!collapsed[group.id]}
        groupTotal={sumGroup(group.id, payments, groups)}
        addGroupForm={renderAddGroupForm(group.id)}
        addPaymentForm={renderAddPaymentForm(group.id)}
        onToggleCollapse={() => setCollapsed((c) => ({ ...c, [group.id]: !c[group.id] }))}
        onStartEdit={() => { setEditingGroupId(group.id); setEditingGroupName(group.name); }}
        onSaveEdit={() => handleSaveGroup(group.id)}
        onCancelEdit={() => setEditingGroupId(null)}
        onEditNameChange={setEditingGroupName}
        onDelete={() => handleDeleteGroup(group.id)}
        onAddSubgroup={() => setAddingGroup(group.id)}
        onAddPayment={() => setAddingPayment(group.id)}
      >
        <SortableContext items={childIds} strategy={verticalListSortingStrategy}>
          {groupPayments.map((p) => renderPaymentItem(p, depth + 1))}
          {childGroups.map((child) => renderGroup(child, depth + 1))}
        </SortableContext>
      </GroupRow>
    );
  }

  function renderPaymentItem(payment: Payment, depth: number): React.ReactNode {
    return (
      <PaymentRow
        key={payment.id}
        payment={payment}
        depth={depth}
        isEditing={editingPaymentId === payment.id}
        editingName={editingPaymentName}
        editingAmount={editingPaymentAmount}
        onStartEdit={() => { setEditingPaymentId(payment.id); setEditingPaymentName(payment.name); setEditingPaymentAmount(String(payment.amount)); }}
        onSaveEdit={() => handleSavePayment(payment.id)}
        onCancelEdit={() => setEditingPaymentId(null)}
        onEditNameChange={setEditingPaymentName}
        onEditAmountChange={setEditingPaymentAmount}
        onToggleStatus={() => handleToggleStatus(payment)}
        onDelete={() => handleDeletePayment(payment.id)}
        onUploadComplete={(url, name) => handleUploadComplete(payment.id, url, name)}
        onSaveAmountInline={async (val) => {
          const amount = parseFloat(val.replace(",", "."));
          if (isNaN(amount)) return;
          setPayments((prev) => prev.map((p) => p.id === payment.id ? { ...p, amount } : p));
          fetch(`/api/payments/${payment.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount }),
          }).catch(() => toast.error("Błąd zapisu kwoty"));
        }}
      />
    );
  }

  // ── DragOverlay ghost ────────────────────────────────────────────────────────

  function renderDragGhost() {
    if (!dndActiveId) return null;
    const payment = payments.find((p) => p.id === dndActiveId);
    if (payment) {
      return (
        <div className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-card border border-primary/40 shadow-lg opacity-95">
          <GripVertical size={14} className="text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium flex-1">{payment.name}</span>
          <span className="text-sm font-medium tabular-nums">{formatPLN(payment.amount)}</span>
        </div>
      );
    }
    const group = groups.find((g) => g.id === dndActiveId);
    if (group) {
      return (
        <div className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-card border border-primary/40 shadow-lg opacity-95">
          <GripVertical size={14} className="text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-semibold">{group.name}</span>
        </div>
      );
    }
    return null;
  }

  // ── Early returns ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const rootGroups = buildTree(groups, null);
  const ungroupedPayments = payments.filter((p) => p.groupId === null).sort((a, b) => a.order - b.order);
  const hasContent = rootGroups.length > 0 || ungroupedPayments.length > 0 || addingGroup === "root" || addingPayment === "root";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Suma całkowita:</span>
            {editingTotal ? (
              <div className="flex items-center gap-1.5">
                <Input
                  autoFocus
                  value={totalInput}
                  onChange={(e) => setTotalInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveTotal(); if (e.key === "Escape") setEditingTotal(false); }}
                  className="h-7 text-sm w-28"
                  placeholder="0.00"
                />
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveTotal}><Check size={13} /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingTotal(false)}><X size={13} /></Button>
              </div>
            ) : (
              <button
                onClick={() => { setEditingTotal(true); setTotalInput(totalAmount != null ? String(totalAmount) : String(totalPaymentsAmount)); }}
                className="flex items-center gap-1.5 text-sm font-semibold hover:text-primary transition-colors"
              >
                {formatPLN(totalAmount ?? totalPaymentsAmount)}
                <Pencil size={12} className="text-muted-foreground" />
              </button>
            )}
          </div>
          {allPaid && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <Check size={11} /> Opłacone
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
          <Download size={13} />
          Eksport CSV
        </Button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setAddingGroup("root"); setNewGroupName(""); }}>
          <Plus size={13} />Dodaj grupę
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setAddingPayment("root"); setNewPaymentName(""); setNewPaymentAmount(""); }}>
          <Plus size={13} />Dodaj płatność
        </Button>
      </div>

      {/* Tree */}
      {hasContent ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={[...rootGroups.map((g) => g.id), ...ungroupedPayments.map((p) => p.id)]} strategy={verticalListSortingStrategy}>
            <div className="border border-border rounded-xl">
              <div className="divide-y divide-border/50">
                {rootGroups.map((g) => renderGroup(g, 0))}
                {ungroupedPayments.map((p) => renderPaymentItem(p, 0))}
              </div>
              {renderAddGroupForm(null)}
              {renderAddPaymentForm(null)}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            {renderDragGhost()}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="text-center py-12 text-sm text-muted-foreground border border-border border-dashed rounded-xl">
          Brak płatności. Dodaj grupę lub płatność.
        </div>
      )}

      {/* Footer */}
      {payments.length > 0 && (
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span className="text-sm text-muted-foreground">Łącznie do opłacenia:</span>
          <span className={`text-sm font-bold tabular-nums ${remaining <= 0 ? "text-green-600 dark:text-green-400" : "text-foreground"}`}>
            {formatPLN(Math.max(0, remaining))}
          </span>
        </div>
      )}
    </div>
  );
}
