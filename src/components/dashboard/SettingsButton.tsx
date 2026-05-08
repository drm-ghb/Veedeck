"use client";

import { Settings, Sun, Moon, Monitor } from "@/components/ui/icons";
import { useState, useRef, useEffect } from "react";
import { useTheme, type Theme } from "@/lib/theme";

const OPTIONS: { value: Theme; label: string; icon: React.ElementType }[] = [
  { value: "light",  label: "Jasny",      icon: Sun },
  { value: "dark",   label: "Ciemny",     icon: Moon },
  { value: "system", label: "Systemowy",  icon: Monitor },
];

export function SettingsButton() {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Ustawienia"
        className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-muted"
      >
        <Settings size={18} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-lg p-3 w-44">
          <p className="text-xs font-semibold text-muted-foreground mb-2 px-1">Motyw</p>
          <div className="flex flex-col gap-0.5">
            {OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => { setTheme(value); setOpen(false); }}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors w-full text-left ${
                  theme === value
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
