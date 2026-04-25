"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  token: string;
  requireClientEmail: boolean;
  clientLogoUrl?: string | null;
  designerName?: string | null;
  children: React.ReactNode;
}

export default function ClientNameGate({ token, requireClientEmail, clientLogoUrl, designerName, children }: Props) {
  const [nameSet, setNameSet] = useState<boolean | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(`veedeck-author-${token}`);
    setNameSet(!!saved);
  }, [token]);

  function handleSetName() {
    if (!nameInput.trim()) return;
    if (requireClientEmail && !emailInput.trim()) return;
    localStorage.setItem(`veedeck-author-${token}`, nameInput.trim());
    if (emailInput.trim()) localStorage.setItem(`veedeck-author-email-${token}`, emailInput.trim());
    // Emit storage event so other components (navbar, greeting) pick up the change
    window.dispatchEvent(new Event("storage"));
    setNameSet(true);
  }

  if (nameSet === null) return null;

  if (!nameSet) return (
    <div className="flex items-center justify-center min-h-screen px-4 py-10 bg-muted/40">
      <div className="w-full max-w-sm">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <p className="text-sm text-muted-foreground text-center mb-5">
            Witaj w panelu klienta projektanta:
          </p>

          {(clientLogoUrl || designerName) && (
            <div className="flex items-center justify-center gap-3 mb-6">
              {clientLogoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={clientLogoUrl} alt="Logo" className="h-10 w-10 rounded-full object-contain" />
              )}
              {designerName && (
                <span className="text-lg font-semibold">{designerName}</span>
              )}
            </div>
          )}

          <p className="text-sm text-muted-foreground text-center mb-5">
            Podaj swoje imię, aby móc przeglądać swój projekt
          </p>

          <div className="space-y-2">
            <Input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Twoje imię"
              onKeyDown={(e) => e.key === "Enter" && !requireClientEmail && handleSetName()}
              autoFocus
            />
            {requireClientEmail && (
              <Input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Twój email"
                onKeyDown={(e) => e.key === "Enter" && handleSetName()}
              />
            )}
            <Button
              onClick={handleSetName}
              disabled={!nameInput.trim() || (requireClientEmail && !emailInput.trim())}
              className="w-full mt-1"
            >
              Przejdź do panelu
            </Button>
          </div>
        </div>

        {/* Powered by veedeck */}
        <div className="flex items-center justify-center gap-1.5 mt-5 opacity-60">
          <span className="text-xs text-muted-foreground">Powered by</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/veedeck_ikona.png" alt="veedeck" className="h-4 w-4 shrink-0 object-contain" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/vee_black.png" alt="veedeck" className="dark:hidden shrink-0" style={{ height: "11px", width: "auto" }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/veedeckicon.png" alt="" className="hidden dark:block shrink-0" style={{ height: "11px", width: "auto" }} />
        </div>
      </div>
    </div>
  );

  return <>{children}</>;
}
