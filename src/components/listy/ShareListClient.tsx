"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ExternalLink, MessageSquare } from "lucide-react";
import ProductCommentPanel from "./ProductCommentPanel";

function parsePrice(price: string | null): number | null {
  if (!price) return null;
  const num = parseFloat(price.replace(/[^\d.,]/g, "").replace(",", "."));
  return isNaN(num) ? null : num;
}

function getCurrency(price: string | null): string {
  if (!price) return "";
  return price.replace(/[\d.,\s]/g, "").trim();
}

interface Product {
  id: string;
  name: string;
  url: string | null;
  imageUrl: string | null;
  price: string | null;
  manufacturer: string | null;
  color: string | null;
  size: string | null;
  description: string | null;
  deliveryTime: string | null;
  quantity: number;
  order: number;
  commentCount: number;
}

interface Section {
  id: string;
  name: string;
  order: number;
  products: Product[];
}

interface ShareListClientProps {
  listName: string;
  projectTitle?: string;
  projectShareToken?: string;
  sections: Section[];
  grandTotal: number;
  grandCurrency: string;
  hasTotal: boolean;
}

export default function ShareListClient({
  listName,
  projectTitle,
  projectShareToken,
  sections,
  grandTotal,
  grandCurrency,
  hasTotal,
}: ShareListClientProps) {
  const [commentsPanelProductId, setCommentsPanelProductId] = useState<string | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const s of sections) {
      for (const p of s.products) {
        init[p.id] = p.commentCount;
      }
    }
    return init;
  });
  const [authorName, setAuthorName] = useState("Klient");

  useEffect(() => {
    const stored = localStorage.getItem("renderflow-author");
    if (stored) setAuthorName(stored);
  }, []);

  const handleCountChange = useCallback((productId: string, count: number) => {
    setCommentCounts((prev) => ({ ...prev, [productId]: count }));
  }, []);

  const homeHref = projectShareToken ? `/share/${projectShareToken}/home` : undefined;

  return (
    <div className="space-y-10">
      {sections.length === 0 && (
        <p className="text-center text-muted-foreground py-16">Lista jest pusta.</p>
      )}

      {sections.map((section) => (
        <div key={section.id}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">{section.name}</h2>
              {section.products.length > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs text-muted-foreground font-medium">
                  {section.products.length}
                </span>
              )}
            </div>
            {(() => {
              let total = 0; let cur = ""; let has = false;
              for (const p of section.products) { const n = parsePrice(p.price); if (n !== null) { total += n * p.quantity; if (!cur) cur = getCurrency(p.price); has = true; } }
              return has ? <span className="text-sm font-semibold">{total.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {cur}</span> : null;
            })()}
          </div>

          {section.products.length === 0 ? (
            <p className="text-sm text-muted-foreground border border-dashed border-border rounded-xl p-6 text-center">
              Brak produktów w tej sekcji
            </p>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {section.products.map((product, i) => {
                const unitPrice = parsePrice(product.price);
                const currency = getCurrency(product.price);
                const totalPrice = unitPrice !== null ? unitPrice * product.quantity : null;
                const last = i === section.products.length - 1;
                const count = commentCounts[product.id] ?? product.commentCount;

                return (
                  <div key={product.id} className={`flex items-center gap-4 px-4 py-3 ${!last ? "border-b border-border" : ""}`}>
                    <span className="w-5 text-right text-xs text-muted-foreground tabular-nums shrink-0">{i + 1}</span>

                    <div className="w-14 h-14 shrink-0 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-lg text-muted-foreground/30 select-none">📦</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      {product.manufacturer && <p className="text-xs text-muted-foreground mt-0.5">{product.manufacturer}</p>}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                        {product.color && <span className="text-xs text-muted-foreground">Kolor: {product.color}</span>}
                        {product.size && <span className="text-xs text-muted-foreground">Rozmiar: {product.size}</span>}
                        {product.deliveryTime && <span className="text-xs text-muted-foreground">Dostawa: {product.deliveryTime}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Szt.:</span>
                        <span className="text-sm font-medium tabular-nums">{product.quantity}</span>
                      </div>

                      {totalPrice !== null && (
                        <div className="text-right min-w-[72px]">
                          <p className="text-sm font-semibold tabular-nums">
                            {totalPrice.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {currency}
                          </p>
                          {product.quantity > 1 && unitPrice !== null && (
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {unitPrice.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} / szt.
                            </p>
                          )}
                        </div>
                      )}

                      {product.url ? (
                        <a href={product.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" title="Otwórz produkt">
                          <ExternalLink size={13} />
                        </a>
                      ) : <span className="w-4" />}

                      {/* Comment icon */}
                      <button
                        onClick={() => setCommentsPanelProductId(product.id)}
                        className="relative flex items-center justify-center w-7 h-7 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Komentarze"
                      >
                        <MessageSquare size={14} />
                        {count > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full bg-[#19213D] text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
                            {count > 99 ? "99+" : count}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {commentsPanelProductId && (() => {
        const product = sections.flatMap((s) => s.products).find((p) => p.id === commentsPanelProductId);
        return product ? (
          <ProductCommentPanel
            productId={commentsPanelProductId}
            productName={product.name}
            isDesigner={false}
            authorName={authorName}
            onClose={() => setCommentsPanelProductId(null)}
            onCountChange={handleCountChange}
          />
        ) : null;
      })()}
    </div>
  );
}
