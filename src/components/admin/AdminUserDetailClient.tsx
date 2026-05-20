"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ShieldCheck, FolderOpen, KeyRound, Clock, Gift, Plus, Trash2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Discount {
  id: string;
  type: string;
  value: number;
  validFrom: Date | string;
  validUntil: Date | string | null;
  note: string | null;
}

interface User {
  id: string;
  name: string | null;
  fullName: string | null;
  email: string;
  isAdmin: boolean;
  role: string;
  createdAt: Date | string;
  trialEndsAt: Date | string | null;
  isFree: boolean;
  subscription: {
    plan: string;
    status: string;
    billingName: string | null;
    billingEmail: string | null;
    cardLast4: string | null;
    cardBrand: string | null;
    createdAt: Date | string;
  } | null;
  discounts: Discount[];
  _count: { projects: number };
}

export default function AdminUserDetailClient({
  user: initial,
  currentUserId,
}: {
  user: User;
  currentUserId: string;
}) {
  const [user, setUser] = useState(initial);
  const router = useRouter();

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Trial
  const [extraDays, setExtraDays] = useState("");
  const [savingTrial, setSavingTrial] = useState(false);

  // Discount
  const [discountType, setDiscountType] = useState<"percent" | "amount">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [discountFrom, setDiscountFrom] = useState("");
  const [discountUntil, setDiscountUntil] = useState("");
  const [discountNote, setDiscountNote] = useState("");
  const [savingDiscount, setSavingDiscount] = useState(false);

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState(false);

  function trialLabel() {
    if (user.isFree) return { text: "Darmowy dostęp", color: "text-emerald-400" };
    if (user.subscription?.status === "active") return { text: `Subskrypcja: ${user.subscription.plan}`, color: "text-violet-400" };
    if (!user.trialEndsAt) return { text: "Brak trialu", color: "text-white/30" };
    const days = Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return { text: "Trial wygasł", color: "text-red-400" };
    return { text: `Trial: ${days} dni`, color: days <= 5 ? "text-amber-400" : "text-white/60" };
  }

  async function handleChangePassword() {
    if (newPassword.length < 8) { toast.error("Hasło musi mieć minimum 8 znaków"); return; }
    setSavingPassword(true);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    setSavingPassword(false);
    if (res.ok) {
      toast.success("Hasło zmienione");
      setNewPassword("");
    } else {
      toast.error((await res.json()).error ?? "Błąd zmiany hasła");
    }
  }

  async function handleToggleFree() {
    const res = await fetch(`/api/admin/users/${user.id}/trial`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFree: !user.isFree }),
    });
    if (res.ok) {
      setUser((u) => ({ ...u, isFree: !u.isFree }));
      toast.success(!user.isFree ? "Dostęp darmowy włączony" : "Dostęp darmowy wyłączony");
    } else {
      toast.error("Błąd");
    }
  }

  async function handleTrialSave() {
    if (extraDays === "") return;
    setSavingTrial(true);
    const res = await fetch(`/api/admin/users/${user.id}/trial`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ extraDays: parseInt(extraDays, 10) }),
    });
    setSavingTrial(false);
    if (res.ok) {
      const data = await res.json();
      setUser((u) => ({ ...u, trialEndsAt: data.trialEndsAt }));
      setExtraDays("");
      toast.success("Trial zaktualizowany");
    } else {
      toast.error("Błąd aktualizacji trialu");
    }
  }

  async function handleAddDiscount() {
    const val = parseFloat(discountValue);
    if (!val || val <= 0) { toast.error("Podaj wartość rabatu"); return; }
    setSavingDiscount(true);
    const res = await fetch(`/api/admin/users/${user.id}/discount`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: discountType,
        value: val,
        validFrom: discountFrom || undefined,
        validUntil: discountUntil || undefined,
        note: discountNote || undefined,
      }),
    });
    setSavingDiscount(false);
    if (res.ok) {
      const d = await res.json();
      setUser((u) => ({ ...u, discounts: [d, ...u.discounts] }));
      setDiscountValue(""); setDiscountFrom(""); setDiscountUntil(""); setDiscountNote("");
      toast.success("Rabat dodany");
    } else {
      toast.error("Błąd dodawania rabatu");
    }
  }

  async function handleDeleteDiscount(discountId: string) {
    const res = await fetch(`/api/admin/users/${user.id}/discount`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discountId }),
    });
    if (res.ok) {
      setUser((u) => ({ ...u, discounts: u.discounts.filter((d) => d.id !== discountId) }));
      toast.success("Rabat usunięty");
    }
  }

  async function handleDelete() {
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Użytkownik usunięty");
      router.push("/admin/users");
      router.refresh();
    } else {
      toast.error((await res.json()).error ?? "Błąd usuwania");
      setConfirmDelete(false);
    }
  }

  const { text: trialText, color: trialColor } = trialLabel();
  const isSelf = user.id === currentUserId;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left column */}
      <div className="lg:col-span-2 space-y-6">

        {/* Basic info */}
        <section className="bg-white/3 border border-white/8 rounded-xl p-6">
          <h2 className="text-xs font-semibold text-white/30 uppercase tracking-wide mb-4">Informacje</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-white/30 mb-0.5">Imię i nazwisko</p>
              <p className="text-sm text-white">{user.fullName ?? user.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-white/30 mb-0.5">E-mail</p>
              <p className="text-sm text-white">{user.email}</p>
            </div>
            <div>
              <p className="text-xs text-white/30 mb-0.5">Rola</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  user.role === "client"
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                    : "bg-violet-500/15 text-violet-400 border border-violet-500/20"
                }`}>
                  {user.role === "client" ? "Klient" : "Projektant"}
                </span>
                {user.isAdmin && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">
                    <ShieldCheck size={10} /> Admin
                  </span>
                )}
                {isSelf && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/8 text-white/40">Ty</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-white/30 mb-0.5">Dołączył</p>
              <p className="text-sm text-white">
                {new Date(user.createdAt).toLocaleDateString("pl-PL", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/30 mb-0.5">Projekty</p>
              <p className="flex items-center gap-1.5 text-sm text-white">
                <FolderOpen size={14} className="text-white/30" />
                {user._count.projects}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/30 mb-0.5">Status dostępu</p>
              <p className={`text-sm font-medium ${trialColor}`}>{trialText}</p>
            </div>
          </div>
        </section>

        {/* Subscription */}
        {user.subscription && (
          <section className="bg-white/3 border border-white/8 rounded-xl p-6">
            <h2 className="text-xs font-semibold text-white/30 uppercase tracking-wide mb-4">Subskrypcja</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-white/30 mb-0.5">Plan</p>
                <p className="text-sm text-white capitalize">{user.subscription.plan}</p>
              </div>
              <div>
                <p className="text-xs text-white/30 mb-0.5">Status</p>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  user.subscription.status === "active"
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                    : "bg-white/8 text-white/40"
                }`}>
                  {user.subscription.status}
                </span>
              </div>
              {user.subscription.billingName && (
                <div>
                  <p className="text-xs text-white/30 mb-0.5">Dane płatnika</p>
                  <p className="text-sm text-white">{user.subscription.billingName}</p>
                  {user.subscription.billingEmail && (
                    <p className="text-xs text-white/40">{user.subscription.billingEmail}</p>
                  )}
                </div>
              )}
              {user.subscription.cardLast4 && (
                <div>
                  <p className="text-xs text-white/30 mb-0.5">Karta</p>
                  <p className="text-sm text-white">
                    {user.subscription.cardBrand} ···· {user.subscription.cardLast4}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Discounts */}
        <section className="bg-white/3 border border-white/8 rounded-xl p-6">
          <h2 className="text-xs font-semibold text-white/30 uppercase tracking-wide mb-4">Rabaty</h2>

          {user.discounts.length === 0 && (
            <p className="text-sm text-white/20 mb-5">Brak aktywnych rabatów</p>
          )}

          {user.discounts.length > 0 && (
            <div className="space-y-2 mb-5">
              {user.discounts.map((d) => (
                <div key={d.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/4 border border-white/8">
                  <div>
                    <span className="text-sm font-semibold text-violet-400">
                      {d.type === "percent" ? `${d.value}%` : `${d.value} zł`}
                    </span>
                    <span className="text-white/40 text-xs ml-2">
                      {new Date(d.validFrom).toLocaleDateString("pl-PL")}
                      {d.validUntil && ` – ${new Date(d.validUntil).toLocaleDateString("pl-PL")}`}
                    </span>
                    {d.note && <span className="text-white/30 text-xs ml-1.5">({d.note})</span>}
                  </div>
                  <button
                    onClick={() => handleDeleteDiscount(d.id)}
                    className="text-red-400/40 hover:text-red-400 transition-colors ml-3"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add discount form */}
          <div className="space-y-3 pt-4 border-t border-white/6">
            <p className="text-xs text-white/30 font-medium uppercase tracking-wide">Dodaj rabat</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDiscountType("percent")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${discountType === "percent" ? "bg-violet-600/20 border-violet-500/40 text-violet-300" : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"}`}
              >
                Procentowy
              </button>
              <button
                onClick={() => setDiscountType("amount")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${discountType === "amount" ? "bg-violet-600/20 border-violet-500/40 text-violet-300" : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"}`}
              >
                Kwotowy (zł)
              </button>
            </div>
            <input
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountType === "percent" ? "np. 20 (= 20%)" : "np. 30 (= 30 zł)"}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/40"
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-white/30 mb-1">Obowiązuje od</label>
                <input type="date" value={discountFrom} onChange={(e) => setDiscountFrom(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500/40" />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-white/30 mb-1">Wygasa (opcjonalnie)</label>
                <input type="date" value={discountUntil} onChange={(e) => setDiscountUntil(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500/40" />
              </div>
            </div>
            <input
              value={discountNote}
              onChange={(e) => setDiscountNote(e.target.value)}
              placeholder="Notatka (opcjonalnie)"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/40"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                className="bg-violet-600 hover:bg-violet-500 text-white border-0"
                onClick={handleAddDiscount}
                disabled={savingDiscount || !discountValue}
              >
                <Plus size={14} className="mr-1" />
                {savingDiscount ? "Dodawanie..." : "Dodaj rabat"}
              </Button>
            </div>
          </div>
        </section>
      </div>

      {/* Right column — actions */}
      <div className="space-y-4">

        {/* Trial / Free */}
        {user.role === "designer" && !user.isAdmin && (
          <section className="bg-white/3 border border-white/8 rounded-xl p-5">
            <h2 className="text-xs font-semibold text-white/30 uppercase tracking-wide mb-4">Dostęp</h2>

            <div className="flex items-center justify-between py-3 border-b border-white/6">
              <div>
                <p className="text-sm text-white font-medium">Darmowy dostęp</p>
                <p className="text-xs text-white/30 mt-0.5">Bezterminowy, bez trialu</p>
              </div>
              <button
                onClick={handleToggleFree}
                className={`relative w-10 h-6 rounded-full transition-colors ${user.isFree ? "bg-emerald-500" : "bg-white/15"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${user.isFree ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>

            <div className="pt-3">
              <p className="text-sm text-white font-medium mb-1">Trial</p>
              {user.trialEndsAt ? (
                <p className="text-xs text-white/40 mb-3">
                  Kończy się: <span className="text-white/70">{new Date(user.trialEndsAt).toLocaleDateString("pl-PL", { day: "2-digit", month: "long", year: "numeric" })}</span>
                </p>
              ) : (
                <p className="text-xs text-white/30 mb-3">Brak ustawionego trialu</p>
              )}
              <div className="flex gap-2">
                <input
                  type="number"
                  value={extraDays}
                  onChange={(e) => setExtraDays(e.target.value)}
                  placeholder="Dni (ujemna = odejmij)"
                  className="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-amber-500/40"
                />
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-500 text-white border-0 shrink-0"
                  onClick={handleTrialSave}
                  disabled={savingTrial || extraDays === ""}
                >
                  <Clock size={14} />
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Change password */}
        <section className="bg-white/3 border border-white/8 rounded-xl p-5">
          <h2 className="text-xs font-semibold text-white/30 uppercase tracking-wide mb-4">Zmień hasło</h2>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
            placeholder="Nowe hasło (min. 8 znaków)"
            className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-blue-500/40 mb-3"
          />
          <Button
            className="w-full bg-blue-600 hover:bg-blue-500 text-white border-0"
            size="sm"
            onClick={handleChangePassword}
            disabled={savingPassword || newPassword.length < 8}
          >
            <KeyRound size={14} className="mr-1.5" />
            {savingPassword ? "Zapisywanie..." : "Ustaw hasło"}
          </Button>
        </section>

        {/* Delete */}
        {!isSelf && (
          <section className="bg-white/3 border border-red-500/10 rounded-xl p-5">
            <h2 className="text-xs font-semibold text-white/30 uppercase tracking-wide mb-4">Strefa niebezpieczna</h2>
            {!confirmDelete ? (
              <Button
                className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/20"
                size="sm"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={14} className="mr-1.5" />
                Usuń konto
              </Button>
            ) : (
              <div>
                <p className="text-xs text-white/50 mb-3">
                  Na pewno usunąć konto <span className="text-white/80 font-medium">{user.email}</span>? Tej operacji nie można cofnąć.
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="flex-1 text-white/40 hover:text-white/70" onClick={() => setConfirmDelete(false)}>
                    Anuluj
                  </Button>
                  <Button size="sm" className="flex-1 bg-red-600 hover:bg-red-500 text-white border-0" onClick={handleDelete}>
                    Usuń
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
