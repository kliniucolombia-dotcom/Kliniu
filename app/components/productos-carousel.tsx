"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "./cart-provider";
import type { StoreProduct } from "@/lib/products";

export default function ProductosCarousel({
  products,
}: {
  products: StoreProduct[];
}) {
  const { addItem } = useCart();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [addedSlugs, setAddedSlugs] = useState<Set<string>>(new Set());
  const [activeDot, setActiveDot] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const updateOverflow = () => {
      setCanScroll(el.scrollWidth > el.clientWidth + 4);
    };

    const updateDot = () => {
      const cardWidth = 216; // 200px card + 16px gap
      const index = Math.round(el.scrollLeft / cardWidth);
      setActiveDot(Math.min(index, products.length - 1));
    };

    updateOverflow();
    el.addEventListener("scroll", updateDot, { passive: true });
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(el);
    window.addEventListener("resize", updateOverflow);

    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", updateDot);
      window.removeEventListener("resize", updateOverflow);
    };
  }, [products.length]);

  const scrollToIndex = (index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: index * 216, behavior: "smooth" });
  };

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    if (dir === "right") {
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: 220, behavior: "smooth" });
      }
    } else {
      if (el.scrollLeft <= 4) {
        el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
      } else {
        el.scrollBy({ left: -220, behavior: "smooth" });
      }
    }
  };

  const handleAdd = (p: StoreProduct) => {
    addItem({ id: p.slug, nombre: p.nombre, precio: p.precio, imagen: p.imagen });
    setAddedSlugs((prev) => new Set(prev).add(p.slug));
    setTimeout(() => {
      setAddedSlugs((prev) => {
        const next = new Set(prev);
        next.delete(p.slug);
        return next;
      });
    }, 1400);
  };

  return (
    <div className={`relative min-w-0 max-w-full ${canScroll ? "w-full flex-1" : "w-fit"}`}>
      {canScroll && (
        <button
          type="button"
          aria-label="Anterior"
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white text-xl shadow-md transition-colors hover:border-[#27B1B8] hover:text-[#27B1B8]"
        >
          ‹
        </button>
      )}

      <div
        ref={scrollRef}
        className={`motion-list scrollbar-hidden flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 py-3 2xl:gap-5 ${canScroll ? "mx-11" : "mx-0"}`}
      >
        {products.map((p) => {
          const added = addedSlugs.has(p.slug);
          return (
            <div
              key={p.slug}
              className="interactive-lift flex h-[370px] w-[200px] min-w-[200px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-black/8 bg-white 2xl:w-[190px] 2xl:min-w-[190px]"
            >
              <div className="flex h-40 items-center justify-center bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.imagen}
                  alt={p.nombre}
                  className="image-lift max-h-32 w-auto object-contain"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/product-placeholder.png"; }}
                />
              </div>
              <div className="flex flex-1 flex-col p-3">
                <p className="h-5 line-clamp-1 text-[11px] text-[#999]">
                  {p.descripcion}
                </p>
                <p className="mt-1.5 h-[54px] line-clamp-3 text-sm font-semibold leading-snug text-[#111]">
                  {p.nombre}
                </p>
                <p className="mt-1.5 h-6 text-base font-bold" style={{ color: "#0C535B" }}>{p.precio}</p>
                <button
                  type="button"
                  onClick={() => handleAdd(p)}
                  className={`shine-sweep mt-auto w-full rounded-full py-2 text-xs font-bold transition-colors ${
                    added
                      ? "bg-[#d4621a] text-white"
                      : "bg-[#F07826] text-white hover:bg-[#d4621a]"
                  }`}
                >
                  {added ? "✓ Agregado" : "Agregar al carrito"}
                </button>
                <Link
                  href={`/producto/${p.slug}`}
                  className="mt-1.5 w-full rounded-full border border-black/10 py-2 text-center text-xs font-semibold text-[#444] transition-colors hover:border-[#27B1B8] hover:text-[#27B1B8]"
                >
                  Ver producto
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {canScroll && (
        <button
          type="button"
          aria-label="Siguiente"
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white text-xl shadow-md transition-colors hover:border-[#27B1B8] hover:text-[#27B1B8]"
        >
          ›
        </button>
      )}

      {canScroll && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {products.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ir al producto ${i + 1}`}
              onClick={() => scrollToIndex(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === activeDot
                  ? "w-5 bg-[#0C535B]"
                  : "w-2 bg-[#0C535B]/25 hover:bg-[#0C535B]/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
