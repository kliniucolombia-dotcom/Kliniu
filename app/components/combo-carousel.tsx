"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

type Combo = {
  id: string;
  nombre: string;
  imagen: string;
  destacado: boolean;
  items: string[];
  precio: string;
  href: string;
};

export default function ComboCarousel({ combos }: { combos: Combo[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "right" ? 240 : -240, behavior: "smooth" });
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

      <div ref={scrollRef} className="motion-list scrollbar-hidden flex gap-4 overflow-x-auto pb-2">
        {combos.map((combo) => (
          <div
            key={combo.id}
            className="motion-card interactive-lift relative w-[210px] min-w-[210px] shrink-0 overflow-hidden rounded-2xl border border-black/8 bg-white"
          >
            {combo.destacado && (
              <span className="absolute left-3 top-3 z-10 rounded-lg bg-[#f5a623] px-2.5 py-1 text-[10px] font-bold text-white">
                Más vendido
              </span>
            )}
            <div className="flex h-36 items-center justify-center bg-[#f8f8f7] p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={combo.imagen} alt={combo.nombre} className="image-lift h-full w-full object-contain" />
            </div>
            <div className="space-y-2 p-4">
              <p className="font-semibold text-[#111]">{combo.nombre}</p>
              <ul className="space-y-1">
                {combo.items.map((item) => (
                  <li key={item} className="flex items-start gap-1.5 text-xs text-[#555]">
                    <span className="mt-px text-[#27B1B8]">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between pt-1">
                <p className="font-bold text-[#111]">{combo.precio}</p>
                <Link
                  href={combo.href}
                  className="rounded-full border border-[#27B1B8] px-3 py-1 text-xs font-bold text-[#27B1B8] transition-colors hover:bg-[#27B1B8] hover:text-white"
                >
                  Ver combo
                </Link>
              </div>
            </div>
          </div>
        ))}

        {/* CTA card */}
        <div className="motion-card interactive-lift relative flex w-[260px] min-w-[260px] shrink-0 flex-col items-center overflow-hidden rounded-[8px] bg-[#b9e5dc] px-8 pb-5 pt-7 text-center text-[#0C535B]">
          <div className="relative z-10">
            <p className="text-[20px] font-extrabold leading-tight text-[#0A5560]">Arma tu combo</p>
            <p className="mx-auto mt-3 max-w-[13rem] text-[14px] font-bold leading-[1.15] text-[#0A5560]">
              Te ayudamos a armar la solución perfecta para tus espacios.
            </p>
          </div>
          <div className="relative z-0 -mx-8 mt-4 px-3">
            <Image
              src="/foca-arma-tu-combo.png"
              alt="Foca Kliniu con productos para armar combo"
              width={260}
              height={174}
              className="image-lift h-auto w-full object-contain"
            />
          </div>
          <Link
            href="/contacto"
            className="shine-sweep relative z-10 mt-6 inline-flex rounded-full bg-[#0C535B] px-7 py-2.5 text-[14px] font-extrabold leading-none text-white transition-opacity hover:opacity-90"
          >
            Cotizar ahora
          </Link>
        </div>
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
