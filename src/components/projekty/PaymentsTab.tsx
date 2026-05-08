"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Paperclip,
  Check,
  X,
  Download,
  Loader2,
} from "@/components/ui/icons";
import { useUploadThing } from "@/lib/uploadthing-client";

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

function formatPLN(amount: number) {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(amount);
}

function buildTree(groups: PaymentGroup[], parentId: string | null): PaymentGroup[] {
  return groups
    .filter((g) => g.parentId === parentId)
    .sort((a, b) => a.order - b.order);
}

export function PaymentsTab({ clientId, projectId }: Props) {
  const [groups, setGroups] = useState<PaymentGroup[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Total amount state
  const [totalAmount, setTotalAmount] = useState<number | null>(null);
  const [editingTotal, setEditingTotal] = useState(false);
  const [totalInput, setTotalInput] = useState("");

  // Add group state
  const [addingGroup, setAddingGroup] = useState<string | null>(null); // parentId or "root"
  const [newGroupName, setNewGroupName] = useState("");

  // Add payment state
  const [addingPayment, setAddingPayment] = useState<string | null>(null); // groupId or "root"
  const [newPaymentName, setNewPaymentName] = useState("");
  const [newPaymentAmount, setNewPaymentAmount] = useState("");

  // Edit state
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editingPaymentName, setEditingPaymentName] = useState("");
  const [editingPaymentAmount, setEditingPaymentAmount] = useState("");

  // Upload
  const [uploadingPaymentId, setUploadingPaymentId] = useState<string | null>(null);
  const { startUpload } = useUploadThing("paymentAttachmentUploader");

  const load = useCallback(async () => {
    const res = await fetch(`/api/payments?clientId=${clientId}`);
    if (!res.ok) return;
    const data = await res.json();
    setGroups(data.groups);
    setPayments(data.payments);
    if (data.totalAmount != null) setTotalAmount(data.totalAmount);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  // Computed values
  const paidAmount = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPaymentsAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = (totalAmount ?? totalPaymentsAmount) - paidAmount;
  const allPaid = payments.length > 0 && payments.every((p) => p.status === "paid");

  // --- Handlers ---

  async function handleAddGroup(parentId: string | null) {
    if (!newGroupName.trim()) return;
    const res = await fetch("/api/payment-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, parentId, name: newGroupName.trim() }),
    });
    if (!res.ok) { toast.error("Błąd dodawania grupy"); return; }
    setNewGroupName("");
    setAddingGroup(null);
    load();
  }

  async function handleAddPayment(groupId: string | null) {
    if (!newPaymentName.trim() || !newPaymentAmount) return;
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        groupId,
        name: newPaymentName.trim(),
        amount: parseFloat(newPaymentAmount.replace(",", ".")),
      }),
    });
    if (!res.ok) { toast.error("Błąd dodawania płatności"); return; }
    setNewPaymentName("");
    setNewPaymentAmount("");
    setAddingPayment(null);
    load();
  }

  async function handleDeleteGroup(id: string) {
    await fetch(`/api/payment-groups/${id}`, { method: "DELETE" });
    load();
  }

  async function handleDeletePayment(id: string) {
    await fetch(`/api/payments/${id}`, { method: "DELETE" });
    load();
  }

  async function handleToggleStatus(payment: Payment) {
    const newStatus = payment.status === "paid" ? "pending" : "paid";
    await fetch(`/api/payments/${payment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    load();
  }

  async function handleSaveGroup(id: string) {
    if (!editingGroupName.trim()) return;
    await fetch(`/api/payment-groups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingGroupName.trim() }),
    });
    setEditingGroupId(null);
    load();
  }

  async function handleSavePayment(id: string) {
    if (!editingPaymentName.trim() || !editingPaymentAmount) return;
    await fetch(`/api/payments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editingPaymentName.trim(),
        amount: parseFloat(editingPaymentAmount.replace(",", ".")),
      }),
    });
    setEditingPaymentId(null);
    load();
  }

  async function handleUpload(paymentId: string, file: File) {
    setUploadingPaymentId(paymentId);
    try {
      const uploaded = await startUpload([file]);
      if (!uploaded?.[0]) return;
      await fetch(`/api/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attachmentUrl: uploaded[0].ufsUrl, attachmentName: file.name }),
      });
      load();
    } catch {
      toast.error("Błąd przesyłania pliku");
    } finally {
      setUploadingPaymentId(null);
    }
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
    a.href = url;
    a.download = "platnosci.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- Render helpers ---

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
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleAddGroup(parentId)}>
          <Check size={14} />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setAddingGroup(null); setNewGroupName(""); }}>
          <X size={14} />
        </Button>
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
          onKeyDown={(e) => { if (e.key === "Escape") { setAddingPayment(null); setNewPaymentName(""); setNewPaymentAmount(""); } }}
          className="h-7 text-sm flex-1"
        />
        <Input
          placeholder="Kwota"
          value={newPaymentAmount}
          onChange={(e) => setNewPaymentAmount(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAddPayment(groupId); }}
          className="h-7 text-sm w-28"
        />
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleAddPayment(groupId)}>
          <Check size={14} />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setAddingPayment(null); setNewPaymentName(""); setNewPaymentAmount(""); }}>
          <X size={14} />
        </Button>
      </div>
    );
  }

  function renderPayment(payment: Payment, depth: number) {
    const isEditing = editingPaymentId === payment.id;
    const isUploading = uploadingPaymentId === payment.id;
    const indent = depth * 16;

    return (
      <div key={payment.id} className="flex items-center gap-2 py-1.5 px-3 rounded-lg hover:bg-muted/40 group" style={{ paddingLeft: `${12 + indent}px` }}>
        {/* Status toggle */}
        <button
          onClick={() => handleToggleStatus(payment)}
          title={payment.status === "paid" ? "Oznacz jako nieopłacone" : "Oznacz jako opłacone"}
          className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
            payment.status === "paid"
              ? "bg-green-500 border-green-500 text-white"
              : "border-muted-foreground hover:border-green-500"
          }`}
        >
          {payment.status === "paid" && <Check size={10} />}
        </button>

        {/* Name + amount */}
        {isEditing ? (
          <>
            <Input
              autoFocus
              value={editingPaymentName}
              onChange={(e) => setEditingPaymentName(e.target.value)}
              className="h-6 text-sm flex-1"
            />
            <Input
              value={editingPaymentAmount}
              onChange={(e) => setEditingPaymentAmount(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSavePayment(payment.id); }}
              className="h-6 text-sm w-28"
            />
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleSavePayment(payment.id)}><Check size={12} /></Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingPaymentId(null)}><X size={12} /></Button>
          </>
        ) : (
          <>
            <span className={`flex-1 text-sm ${payment.status === "paid" ? "line-through text-muted-foreground" : ""}`}>
              {payment.name}
            </span>
            <span className={`text-sm font-medium tabular-nums ${payment.status === "paid" ? "text-muted-foreground" : ""}`}>
              {formatPLN(payment.amount)}
            </span>

            {/* Status badge */}
            <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
              payment.status === "paid"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            }`}>
              {payment.status === "paid" ? "Opłacone" : "Do opłacenia"}
            </span>

            {/* Attachment */}
            <div className="flex-shrink-0">
              {payment.attachmentUrl ? (
                <a href={payment.attachmentUrl} target="_blank" rel="noopener noreferrer" title={payment.attachmentName ?? "Załącznik"} className="text-muted-foreground hover:text-foreground transition-colors">
                  <Paperclip size={13} />
                </a>
              ) : (
                <label className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100">
                  {isUploading ? <Loader2 size={13} className="animate-spin" /> : <Paperclip size={13} />}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(payment.id, f); }}
                  />
                </label>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => { setEditingPaymentId(payment.id); setEditingPaymentName(payment.name); setEditingPaymentAmount(String(payment.amount)); }}
                className="p-1 rounded text-muted-foreground hover:text-foreground"
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={() => handleDeletePayment(payment.id)}
                className="p-1 rounded text-muted-foreground hover:text-destructive"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  function renderGroup(group: PaymentGroup, depth: number) {
    const isCollapsed = collapsed[group.id];
    const isEditing = editingGroupId === group.id;
    const children = buildTree(groups, group.id);
    const groupPayments = payments.filter((p) => p.groupId === group.id).sort((a, b) => a.order - b.order);
    const indent = depth * 16;

    const groupTotal = (() => {
      function sumGroup(gId: string): number {
        const direct = payments.filter((p) => p.groupId === gId).reduce((s, p) => s + p.amount, 0);
        const childGroups = groups.filter((g) => g.parentId === gId);
        return direct + childGroups.reduce((s, g) => s + sumGroup(g.id), 0);
      }
      return sumGroup(group.id);
    })();

    return (
      <div key={group.id} className="mb-1">
        <div
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg hover:bg-muted/40 group cursor-pointer"
          style={{ paddingLeft: `${12 + indent}px` }}
        >
          <button
            onClick={() => setCollapsed((c) => ({ ...c, [group.id]: !c[group.id] }))}
            className="text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          </button>

          {isEditing ? (
            <>
              <Input
                autoFocus
                value={editingGroupName}
                onChange={(e) => setEditingGroupName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveGroup(group.id); if (e.key === "Escape") setEditingGroupId(null); }}
                className="h-6 text-sm flex-1 font-medium"
              />
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleSaveGroup(group.id)}><Check size={12} /></Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingGroupId(null)}><X size={12} /></Button>
            </>
          ) : (
            <>
              <span
                className="flex-1 text-sm font-semibold"
                onClick={() => setCollapsed((c) => ({ ...c, [group.id]: !c[group.id] }))}
              >
                {group.name}
              </span>
              <span className="text-sm font-medium tabular-nums text-muted-foreground">
                {formatPLN(groupTotal)}
              </span>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                <button
                  onClick={(e) => { e.stopPropagation(); setAddingGroup(group.id); }}
                  className="p-1 rounded text-muted-foreground hover:text-foreground"
                  title="Dodaj podgrupę"
                >
                  <Plus size={12} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setAddingPayment(group.id); }}
                  className="p-1 rounded text-muted-foreground hover:text-foreground"
                  title="Dodaj płatność"
                >
                  <Plus size={12} className="opacity-60" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingGroupId(group.id); setEditingGroupName(group.name); }}
                  className="p-1 rounded text-muted-foreground hover:text-foreground"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                  className="p-1 rounded text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </>
          )}
        </div>

        {!isCollapsed && (
          <div>
            {groupPayments.map((p) => renderPayment(p, depth + 1))}
            {children.map((child) => renderGroup(child, depth + 1))}
            {renderAddPaymentForm(group.id)}
            {renderAddGroupForm(group.id)}
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const rootGroups = buildTree(groups, null);
  const ungroupedPayments = payments.filter((p) => p.groupId === null).sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      {/* Header: total + export */}
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
                onClick={() => { setEditingTotal(true); setTotalInput(totalAmount != null ? String(totalAmount) : ""); }}
                className="flex items-center gap-1.5 text-sm font-semibold hover:text-primary transition-colors"
              >
                {totalAmount != null ? formatPLN(totalAmount) : <span className="text-muted-foreground italic">Ustaw sumę</span>}
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

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => { setAddingGroup("root"); setNewGroupName(""); }}
        >
          <Plus size={13} />
          Dodaj grupę
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => { setAddingPayment("root"); setNewPaymentName(""); setNewPaymentAmount(""); }}
        >
          <Plus size={13} />
          Dodaj płatność
        </Button>
      </div>

      {/* Tree */}
      {(rootGroups.length > 0 || ungroupedPayments.length > 0 || addingGroup === "root" || addingPayment === "root") ? (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="divide-y divide-border/50">
            {rootGroups.map((g) => renderGroup(g, 0))}
            {ungroupedPayments.map((p) => renderPayment(p, 0))}
          </div>
          {renderAddGroupForm(null)}
          {renderAddPaymentForm(null)}
        </div>
      ) : (
        <div className="text-center py-12 text-sm text-muted-foreground border border-border border-dashed rounded-xl">
          Brak płatności. Dodaj grupę lub płatność.
        </div>
      )}

      {/* Footer: remaining */}
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
