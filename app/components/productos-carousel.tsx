"use client";

import { useRef, useState } from "react";
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
  const [addedSlugs, setAddedSlugs] = useState<Set<string>>(new Set());

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "right" ? 220 : -220, behavior: "smooth" });
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
    <div className="relative min-w-0 flex-1">
      <button
        type="button"
        aria-label="Anterior"
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white text-xl shadow-md transition-colors hover:border-[#27B1B8] hover:text-[#27B1B8]"
      >
        ‹
      </button>

      <div
        ref={scrollRef}
        className="scrollbar-hidden mx-11 flex gap-4 overflow-x-auto pb-2 2xl:gap-5"
      >
        {products.map((p) => {
          const added = addedSlugs.has(p.slug);
          return (
            <div
              key={p.slug}
              className="flex h-[348px] w-[200px] min-w-[200px] shrink-0 flex-col overflow-hidden rounded-2xl border border-black/8 bg-white 2xl:w-[190px] 2xl:min-w-[190px]"
            >
              <div className="flex h-40 items-center justify-center bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.imagen}
                  alt={p.nombre}
                  className="max-h-32 w-auto object-contain"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/product-placeholder.png"; }}
                />
              </div>
              <div className="flex flex-1 flex-col p-3">
                <p className="h-4 line-clamp-1 text-[11px] text-[#999]">
                  {p.descripcion}
                </p>
                <p className="mt-1.5 min-h-[38px] line-clamp-2 text-sm font-semibold leading-snug text-[#111]">
                  {p.nombre}
                </p>
                <p className="mt-1.5 text-base font-bold" style={{ color: "#0C535B" }}>{p.precio}</p>
                <button
                  type="button"
                  onClick={() => handleAdd(p)}
                  className={`mt-auto w-full rounded-full py-2 text-xs font-bold transition-colors ${
                    added
                      ? "bg-[#0C535B] text-white"
                      : "bg-[#27B1B8] text-white hover:bg-[#1E969B]"
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

      <button
        type="button"
        aria-label="Siguiente"
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white text-xl shadow-md transition-colors hover:border-[#27B1B8] hover:text-[#27B1B8]"
      >
        ›
      </button>
    </div>
  );
}
