"use client";

import { useRef } from "react";
import ComboCard, { type ComboCardData } from "./combo-card";
import ComboCtaCard from "./combo-cta-card";


export default function ComboCarousel({ combos }: { combos: ComboCardData[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    if (dir === "right") {
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: 240, behavior: "smooth" });
      }
    } else {
      if (el.scrollLeft <= 4) {
        el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
      } else {
        el.scrollBy({ left: -240, behavior: "smooth" });
      }
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => scroll("left")}
        aria-label="Anterior"
        className="absolute -left-4 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white shadow-sm transition-colors hover:border-[#27B1B8] hover:text-[#27B1B8]"
      >
        ‹
      </button>

      <div ref={scrollRef} className="motion-list scrollbar-hidden flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
        {combos.map((combo) => (
          <ComboCard key={combo.id} combo={combo} className="w-[280px] min-w-[280px] shrink-0 snap-start" />
        ))}

        {/* CTA card — en desktop vive en la columna izquierda */}
        <ComboCtaCard className="w-[280px] min-w-[280px] shrink-0 snap-start lg:hidden" />
      </div>

      <button
        type="button"
        onClick={() => scroll("right")}
        aria-label="Siguiente"
        className="absolute -right-4 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white shadow-sm transition-colors hover:border-[#27B1B8] hover:text-[#27B1B8]"
      >
        ›
      </button>
    </div>
  );
}
