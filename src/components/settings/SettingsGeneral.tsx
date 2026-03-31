"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { User, Mail, Lock, Info, Sun, Moon, Monitor, Palette, Image as ImageIcon } from "lucide-react";
import { useTheme, type Theme } from "@/lib/theme";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/lib/uploadthing";
import { patchUser, SettingRow, SectionHeader } from "./SettingsShared";

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ElementType }[] = [
  { value: "light", label: "Jasny", icon: Sun },
  { value: "dark", label: "Ciemny", icon: Moon },
  { value: "system", label: "Systemowy", icon: Monitor },
];

interface Props {
  initialName: string;
  initialEmail: string;
  initialShowProjectTitle: boolean;
  initialClientLogoUrl: string | null;
  initialClientWelcomeMessage: string | null;
  initialAccentColor: string | null;
}

export function SettingsGeneral({
  initialName,
  initialEmail,
  initialShowProjectTitle,
  initialClientLogoUrl,
  initialClientWelcomeMessage,
  initialAccentColor,
}: Props) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [name, setName] = useState(initialName);
  const [nameLoading, setNameLoading] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [emailLoading, setEmailLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [showProjectTitle, setShowProjectTitle] = useState(initialShowProjectTitle);
  const [clientLogoUrl, setClientLogoUrl] = useState<string | null>(initialClientLogoUrl);
  const [welcomeMsg, setWelcomeMsg] = useState(initialClientWelcomeMessage ?? "");
  const [welcomeLoading, setWelcomeLoading] = useState(false);
  const [accentColor, setAccentColor] = useState(initialAccentColor ?? "#2563eb");

  async function handleNameSave() {
    if (!name.trim()) return;
    setNameLoading(true);
    try {
      const res = await patchUser({ name: name.trim() });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || "Błąd podczas zapisywania"); return; }
      toast.success("Imię zostało zaktualizowane");
      router.refresh();
    } finally { setNameLoading(false); }
  }

  async function handleEmailSave() {
    if (!email.trim()) return;
    setEmailLoading(true);
    try {
      const res = await patchUser({ email: email.trim() });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || "Błąd podczas zapisywania"); return; }
      toast.success("Email zaktualizowany. Zaloguj się ponownie.");
      router.refresh();
    } finally { setEmailLoading(false); }
  }

  async function handlePasswordSave() {
    if (newPassword !== confirmPassword) { toast.error("Nowe hasła nie są identyczne"); return; }
    if (newPassword.length < 8) { toast.error("Nowe hasło musi mieć co najmniej 8 znaków"); return; }
    setPasswordLoading(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Błąd podczas zmiany hasła"); return; }
      toast.success("Hasło zostało zmienione");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } finally { setPasswordLoading(false); }
  }

  async function toggleShowProjectTitle() {
    const next = !showProjectTitle;
    const res = await patchUser({ showProjectTitle: next });
    if (res.ok) { setShowProjectTitle(next); toast.success("Zapisano"); }
    else toast.error("Błąd podczas zapisywania");
  }

  async function handleWelcomeSave() {
    setWelcomeLoading(true);
    try {
      const res = await patchUser({ clientWelcomeMessage: welcomeMsg.trim() || null });
      if (res.ok) toast.success("Zapisano");
      else toast.error("Błąd podczas zapisywania");
    } finally { setWelcomeLoading(false); }
  }

  async function handleAccentColorSave(color: string) {
    setAccentColor(color);
    await patchUser({ accentColor: color });
  }

  async function handleRemoveLogo() {
    const res = await patchUser({ clientLogoUrl: null });
    if (res.ok) { setClientLogoUrl(null); toast.success("Logo usunięte"); }
    else toast.error("Błąd podczas usuwania logo");
  }

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Ustawienia ogólne</h1>
        <p className="text-sm text-gray-500 mt-1">Zarządzaj swoim kontem i wyglądem dla klienta</p>
      </div>

      {/* ── Konto ── */}
      <section className="space-y-4">
        <SectionHeader title="Ustawienia konta" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <User size={16} className="text-gray-400" />
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">Profil</h3>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Nazwa</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Twoje imię" onKeyDown={(e) => e.key === "Enter" && handleNameSave()} />
            </div>
            <Button onClick={handleNameSave} disabled={nameLoading || !name.trim() || name.trim() === initialName} size="sm">
              {nameLoading ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-gray-400" />
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">Adres email</h3>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="twoj@email.com" onKeyDown={(e) => e.key === "Enter" && handleEmailSave()} />
            </div>
            <div className="flex items-start gap-2 text-xs text-gray-400 bg-muted rounded-lg px-3 py-2">
              <Info size={13} className="mt-0.5 flex-shrink-0" />
              <span>Zmiana wymaga ponownego zalogowania.</span>
            </div>
            <Button onClick={handleEmailSave} disabled={emailLoading || !email.trim() || email.trim() === initialEmail} size="sm">
              {emailLoading ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-gray-400" />
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">Hasło</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Aktualne hasło</label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Nowe hasło</label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="min. 8 znaków" />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Powtórz nowe hasło</label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" onKeyDown={(e) => e.key === "Enter" && handlePasswordSave()} />
            </div>
          </div>
          <Button onClick={handlePasswordSave} disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword} size="sm">
            {passwordLoading ? "Zmienianie..." : "Zmień hasło"}
          </Button>
        </div>
      </section>

      {/* ── Wygląd dla klienta ── */}
      <section className="space-y-4">
        <SectionHeader title="Wygląd dla klienta" />

        <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
          <SettingRow
            label="Wyświetlaj nazwę projektu"
            description="Nazwa projektu jest widoczna obok logo i nazwy studia na stronie klienta."
            checked={showProjectTitle}
            onToggle={toggleShowProjectTitle}
          />

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ImageIcon size={15} className="text-gray-400" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Logo firmy</p>
            </div>
            <p className="text-xs text-gray-400">Wyświetlane zamiast logo RenderFlow na stronie klienta.</p>
            {clientLogoUrl ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={clientLogoUrl} alt="Logo" className="h-10 object-contain rounded border border-border" />
                <Button size="sm" variant="outline" onClick={handleRemoveLogo}>Usuń logo</Button>
              </div>
            ) : (
              <UploadButton<OurFileRouter, "logoUploader">
                endpoint="logoUploader"
                onClientUploadComplete={async (res) => {
                  const url = res?.[0]?.url;
                  if (url) {
                    await patchUser({ clientLogoUrl: url });
                    setClientLogoUrl(url);
                    toast.success("Logo zapisane");
                  }
                }}
                onUploadError={() => { toast.error("Błąd przesyłania logo"); }}
                appearance={{
                  button: "bg-primary text-primary-foreground hover:opacity-90 text-sm px-4 py-2 rounded-lg font-medium",
                  allowedContent: "text-xs text-gray-400",
                }}
              />
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette size={15} className="text-gray-400" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Kolor akcentu</p>
            </div>
            <p className="text-xs text-gray-400">Główny kolor brandu widoczny na stronie klienta.</p>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                onBlur={(e) => handleAccentColorSave(e.target.value)}
                className="w-10 h-10 rounded-lg border border-border cursor-pointer p-0.5"
              />
              <span className="text-sm text-gray-500 font-mono">{accentColor}</span>
              <Button size="sm" variant="outline" onClick={() => handleAccentColorSave(accentColor)}>Zapisz</Button>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Wiadomość powitalna</p>
            <p className="text-xs text-gray-400">Tekst widoczny na stronie klienta przed listą pomieszczeń.</p>
            <Textarea
              value={welcomeMsg}
              onChange={(e) => setWelcomeMsg(e.target.value)}
              placeholder="np. Witaj! Poniżej znajdziesz rendery do akceptacji..."
              rows={3}
            />
            <Button size="sm" onClick={handleWelcomeSave} disabled={welcomeLoading}>
              {welcomeLoading ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </div>
        </div>
      </section>

      {/* ── Motyw interfejsu ── */}
      <section className="space-y-4">
        <SectionHeader title="Ustawienia interfejsu" />

        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Palette size={16} className="text-gray-400" />
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">Motyw interfejsu</h3>
          </div>
          <div className="flex gap-2">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-colors ${
                  theme === value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-foreground hover:bg-muted"
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
