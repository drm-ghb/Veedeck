"use client";

import { useEffect, useState } from "react";

interface Section {
  id: string;
  name: string;
}

interface Props {
  sections: Section[];
  /** Pixels to offset when scrolling to section (e.g. sticky toolbar height). Default 0. */
  scrollOffset?: number;
}

export default function ListSectionNav({ sections, scrollOffset = 0 }: Props) {
  const [activeId, setActiveId] = useState<string | null>(sections[0]?.id ?? null);

  useEffect(() => {
    if (sections.length === 0) return;

    const scrollEl =
      (document.querySelector("main[data-scroll-root]") as HTMLElement | null) ??
      (document.querySelector("main") as HTMLElement | null);
    if (!scrollEl) return;

    function update() {
      let found: string | null = null;
      // threshold = toolbar height + a bit of breathing room
      const threshold = scrollOffset + 40;
      for (const s of sections) {
        const el = document.getElementById(`section-nav-${s.id}`);
        if (!el) continue;
        const top = el.getBoundingClientRect().top - scrollEl!.getBoundingClientRect().top;
        if (top < threshold) found = s.id;
      }
      setActiveId(found ?? sections[0]?.id ?? null);
    }

    scrollEl.addEventListener("scroll", update, { passive: true });
    update();
    return () => scrollEl.removeEventListener("scroll", update);
  }, [sections, scrollOffset]);

  if (sections.length <= 1) return null;

  function goTo(id: string) {
    const el = document.getElementById(`section-nav-${id}`);
    if (!el) return;
    const scrollEl =
      (document.querySelector("main[data-scroll-root]") as HTMLElement | null) ??
      (document.querySelector("main") as HTMLElement | null);
    if (scrollEl) {
      const elTop = el.getBoundingClientRect().top - scrollEl.getBoundingClientRect().top;
      scrollEl.scrollTop += elTop - scrollOffset - 16;
    } else {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setActiveId(id);
  }

  return (
    <nav className="space-y-0.5">
      {sections.map((s) => (
        <button
          key={s.id}
          onClick={() => goTo(s.id)}
          title={s.name}
          className={`w-full text-left px-2 py-1 text-xs rounded-md transition-colors truncate block ${
            activeId === s.id
              ? "bg-muted text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          {s.name}
        </button>
      ))}
    </nav>
  );
}
