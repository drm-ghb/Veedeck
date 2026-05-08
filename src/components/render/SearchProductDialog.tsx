"use client";

import { useState } from "react";
import { Search, X, Package, SlidersHorizontal, ChevronDown, ChevronRight, Loader2 } from "@/components/ui/icons";
import { useProductSearch } from "@/components/produkty/useProductSearch";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  const search = useProductSearch();
  const [showFilters, setShowFilters] = useState(false);
  const [expandedFilters, setExpandedFilters] = useState<Record<string, boolean>>({
    categories: true,
    manufacturers: true,
    colors: true,
  });
  const [filterSearch, setFilterSearch] = useState<Record<string, string>>({
    categories: "",
    manufacturers: "",
    colors: "",
  });

  const toggleSection = (key: string) =>
    setExpandedFilters((prev) => ({ ...prev, [key]: !prev[key] }));

  const getActiveCount = (key: keyof typeof search.filters) =>
    search.filters[key].length;

  const totalActiveFilters =
    getActiveCount("categories") + getActiveCount("manufacturers") + getActiveCount("colors");

  function handleClose() {
    search.resetFilters();
    setFilterSearch({ categories: "", manufacturers: "", colors: "" });
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative w-full sm:max-w-3xl bg-background rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden h-[90svh] sm:h-[85vh]">
        {/* Header — search bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
          <Search size={16} className="text-muted-foreground shrink-0" />
          <Input
            autoFocus
            value={search.query}
            onChange={(e) => search.handleQueryChange(e.target.value)}
            placeholder="Szukaj produktu..."
            className="flex-1 border-0 shadow-none focus-visible:ring-0 px-0 text-sm bg-transparent"
          />
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            title="Filtry zaawansowane"
            className={`relative flex-shrink-0 transition-colors ${
              showFilters || totalActiveFilters > 0
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <SlidersHorizontal size={16} />
            {totalActiveFilters > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[9px] font-bold flex items-center justify-center">
                {totalActiveFilters}
              </span>
            )}
          </button>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left sidebar — filters */}
          {showFilters && search.availableFilters && (
            <div className="w-56 border-r border-border overflow-y-auto flex-shrink-0">
              <div className="p-4 space-y-4">
                {/* Kategorie */}
                {search.availableFilters.categories.length > 0 && (
                  <div>
                    <button
                      onClick={() => toggleSection("categories")}
                      className="flex items-center justify-between w-full mb-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Kategorie</span>
                        {getActiveCount("categories") > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {getActiveCount("categories")}
                          </Badge>
                        )}
                      </div>
                      {expandedFilters.categories ? (
                        <ChevronDown size={14} className="text-muted-foreground" />
                      ) : (
                        <ChevronRight size={14} className="text-muted-foreground" />
                      )}
                    </button>
                    {expandedFilters.categories && (
                      <div className="space-y-2 ml-1">
                        {search.availableFilters.categories.length > 5 && (
                          <Input
                            placeholder="Szukaj..."
                            value={filterSearch.categories}
                            onChange={(e) =>
                              setFilterSearch((p) => ({ ...p, categories: e.target.value }))
                            }
                            className="h-7 text-xs"
                          />
                        )}
                        {search.availableFilters.categories
                          .filter((v) =>
                            v.toLowerCase().includes(filterSearch.categories.toLowerCase())
                          )
                          .map((v) => (
                            <div key={v} className="flex items-center gap-2">
                              <Checkbox
                                id={`cat-${v}`}
                                checked={search.filters.categories.includes(v)}
                                onCheckedChange={() =>
                                  search.handleFilterChange("categories", v)
                                }
                              />
                              <label
                                htmlFor={`cat-${v}`}
                                className="text-sm cursor-pointer flex-1 truncate"
                              >
                                {v}
                              </label>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Producenci */}
                {search.availableFilters.manufacturers.length > 0 && (
                  <div>
                    <button
                      onClick={() => toggleSection("manufacturers")}
                      className="flex items-center justify-between w-full mb-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Producenci</span>
                        {getActiveCount("manufacturers") > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {getActiveCount("manufacturers")}
                          </Badge>
                        )}
                      </div>
                      {expandedFilters.manufacturers ? (
                        <ChevronDown size={14} className="text-muted-foreground" />
                      ) : (
                        <ChevronRight size={14} className="text-muted-foreground" />
                      )}
                    </button>
                    {expandedFilters.manufacturers && (
                      <div className="space-y-2 ml-1">
                        {search.availableFilters.manufacturers.length > 5 && (
                          <Input
                            placeholder="Szukaj..."
                            value={filterSearch.manufacturers}
                            onChange={(e) =>
                              setFilterSearch((p) => ({ ...p, manufacturers: e.target.value }))
                            }
                            className="h-7 text-xs"
                          />
                        )}
                        <div className="max-h-40 overflow-y-auto space-y-2">
                          {search.availableFilters.manufacturers
                            .filter((v) =>
                              v.toLowerCase().includes(filterSearch.manufacturers.toLowerCase())
                            )
                            .map((v) => (
                              <div key={v} className="flex items-center gap-2">
                                <Checkbox
                                  id={`mfr-${v}`}
                                  checked={search.filters.manufacturers.includes(v)}
                                  onCheckedChange={() =>
                                    search.handleFilterChange("manufacturers", v)
                                  }
                                />
                                <label
                                  htmlFor={`mfr-${v}`}
                                  className="text-sm cursor-pointer flex-1 truncate"
                                >
                                  {v}
                                </label>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Kolory */}
                {search.availableFilters.colors.length > 0 && (
                  <div>
                    <button
                      onClick={() => toggleSection("colors")}
                      className="flex items-center justify-between w-full mb-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Kolory</span>
                        {getActiveCount("colors") > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {getActiveCount("colors")}
                          </Badge>
                        )}
                      </div>
                      {expandedFilters.colors ? (
                        <ChevronDown size={14} className="text-muted-foreground" />
                      ) : (
                        <ChevronRight size={14} className="text-muted-foreground" />
                      )}
                    </button>
                    {expandedFilters.colors && (
                      <div className="space-y-2 ml-1">
                        {search.availableFilters.colors.length > 5 && (
                          <Input
                            placeholder="Szukaj..."
                            value={filterSearch.colors}
                            onChange={(e) =>
                              setFilterSearch((p) => ({ ...p, colors: e.target.value }))
                            }
                            className="h-7 text-xs"
                          />
                        )}
                        <div className="max-h-40 overflow-y-auto space-y-2">
                          {search.availableFilters.colors
                            .filter((v) =>
                              v.toLowerCase().includes(filterSearch.colors.toLowerCase())
                            )
                            .map((v) => (
                              <div key={v} className="flex items-center gap-2">
                                <Checkbox
                                  id={`color-${v}`}
                                  checked={search.filters.colors.includes(v)}
                                  onCheckedChange={() =>
                                    search.handleFilterChange("colors", v)
                                  }
                                />
                                <label
                                  htmlFor={`color-${v}`}
                                  className="text-sm cursor-pointer flex-1 truncate"
                                >
                                  {v}
                                </label>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {totalActiveFilters > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      search.resetFilters();
                      setFilterSearch({ categories: "", manufacturers: "", colors: "" });
                    }}
                    className="w-full"
                  >
                    Wyczyść filtry
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Right panel — results */}
          <div className="flex-1 overflow-y-auto min-w-0">
            {search.loading && (
              <div className="flex items-center justify-center h-32">
                <Loader2 size={24} className="animate-spin text-muted-foreground" />
              </div>
            )}
            {!search.loading && search.products.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                <Package size={28} className="opacity-30" />
                <p className="text-sm">
                  {search.query || totalActiveFilters > 0
                    ? "Brak wyników"
                    : "Zacznij wpisywać nazwę produktu"}
                </p>
              </div>
            )}
            {!search.loading && search.products.length > 0 && (
              <div className="divide-y divide-border">
                {search.products.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelect(p as Product);
                      handleClose();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                  >
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-[120px] h-[120px] rounded-lg object-cover flex-shrink-0 border border-border"
                      />
                    ) : (
                      <div className="w-[120px] h-[120px] rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <Package size={20} className="text-muted-foreground opacity-40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug line-clamp-2">{p.name}</p>
                      {p.manufacturer && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.manufacturer}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
