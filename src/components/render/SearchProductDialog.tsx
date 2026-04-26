"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Package } from "lucide-react";

interface Product {
  id: string;
  name: string;
  imageUrl: string | null;
  url: string | null;
  price: string | null;
  manufacturer: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (product: Product) => void;
}

export default function SearchProductDialog({ open, onClose, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setProducts([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!open) return;
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setProducts(Array.isArray(data) ? data.slice(0, 30) : []);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-md bg-background rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={16} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj produktu..."
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
          />
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div className="overflow-y-auto flex-1">
          {loading && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">Szukanie...</div>
          )}
          {!loading && products.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
              <Package size={28} className="opacity-30" />
              <p className="text-sm">{query ? "Brak wyników" : "Zacznij wpisywać nazwę produktu"}</p>
            </div>
          )}
          {!loading && products.map((p) => (
            <button
              key={p.id}
              onClick={() => { onSelect(p); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors border-b border-border/50 last:border-0 text-left"
            >
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="w-10 h-10 rounded-lg object-cover shrink-0 border border-border"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Package size={16} className="text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {[p.manufacturer, p.price].filter(Boolean).join(" · ") || "Brak szczegółów"}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
