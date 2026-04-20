"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, RefreshCw, Trash2, Eye, EyeOff, Puzzle } from "lucide-react";

interface Props {
  initialKey: string | null;
}

export function SettingsExtension({ initialKey }: Props) {
  const [apiKey, setApiKey] = useState<string | null>(initialKey);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);

  const maskedKey = apiKey ? apiKey.slice(0, 8) + "••••••••••••••••••••••••••••" : null;

  async function generateKey() {
    setLoading(true);
    try {
      const method = apiKey ? "POST" : "GET";
      const res = await fetch("/api/extension/key", { method });
      const data = await res.json();
      setApiKey(data.key);
      setRevealed(true);
      toast.success(apiKey ? "Klucz wygenerowany ponownie" : "Klucz API gotowy");
    } catch {
      toast.error("Nie udało się wygenerować klucza");
    } finally {
      setLoading(false);
    }
  }

  async function revokeKey() {
    if (!confirm("Na pewno chcesz unieważnić klucz API? Wtyczka przestanie działać.")) return;
    setLoading(true);
    try {
      await fetch("/api/extension/key", { method: "DELETE" });
      setApiKey(null);
      setRevealed(false);
      toast.success("Klucz unieważniony");
    } catch {
      toast.error("Nie udało się unieważnić klucza");
    } finally {
      setLoading(false);
    }
  }

  function copyKey() {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    toast.success("Klucz skopiowany do schowka");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Puzzle size={20} className="text-primary" />
          veepick — wtyczka do przeglądarki
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Zainstaluj wtyczkę veepick w Chrome i dodawaj produkty ze stron bezpośrednio do swoich list.
        </p>
      </div>

      {/* API Key section */}
      <div className="border border-border rounded-xl p-5 space-y-4 bg-card">
        <div>
          <p className="text-sm font-medium text-foreground">Klucz API</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Wklej ten klucz w ustawieniach wtyczki veepick, aby połączyć ją ze swoim kontem.
          </p>
        </div>

        {apiKey ? (
          <div className="flex items-center gap-2">
            {/* Key display */}
            <div className="flex-1 bg-muted rounded-lg px-3 py-2 font-mono text-sm text-foreground select-all break-all">
              {revealed ? apiKey : maskedKey}
            </div>
            {/* Reveal */}
            <button
              onClick={() => setRevealed((v) => !v)}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              title={revealed ? "Ukryj klucz" : "Pokaż klucz"}
              type="button"
            >
              {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            {/* Copy */}
            <button
              onClick={copyKey}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              title="Kopiuj klucz"
              type="button"
            >
              <Copy size={16} />
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Nie wygenerowano jeszcze klucza API.
          </p>
        )}

        <div className="flex gap-2 flex-wrap">
          <Button onClick={generateKey} disabled={loading} size="sm" variant={apiKey ? "outline" : "default"}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {apiKey ? "Wygeneruj nowy klucz" : "Wygeneruj klucz API"}
          </Button>
          {apiKey && (
            <Button onClick={revokeKey} disabled={loading} size="sm" variant="ghost" className="text-destructive hover:text-destructive">
              <Trash2 size={14} />
              Unieważnij klucz
            </Button>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="border border-border rounded-xl p-5 space-y-3 bg-card">
        <p className="text-sm font-medium text-foreground">Jak zainstalować wtyczkę?</p>
        <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
          <li>Pobierz folder <code className="bg-muted px-1 rounded text-xs">veepick/</code> z projektu</li>
          <li>Otwórz Chrome i wejdź na <code className="bg-muted px-1 rounded text-xs">chrome://extensions</code></li>
          <li>Włącz <strong className="text-foreground">Tryb dewelopera</strong> (prawy górny róg)</li>
          <li>Kliknij <strong className="text-foreground">Załaduj rozpakowany</strong> i wybierz folder <code className="bg-muted px-1 rounded text-xs">veepick/</code></li>
          <li>Kliknij ikonę wtyczki w pasku narzędzi, wpisz adres swojej aplikacji i klucz API powyżej</li>
        </ol>
      </div>
    </div>
  );
}
