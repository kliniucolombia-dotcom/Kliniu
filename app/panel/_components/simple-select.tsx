"use client";
import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

export function SimpleSelect({
  value,
  options,
  onChange,
  className,
  triggerClassName,
  placeholder,
  hideChevron,
  openUp,
  disabled,
  portal,
  multiple,
}: {
  value: string;
  options: { value: string; label: ReactNode }[];
  onChange: (value: string) => void;
  className?: string;
  triggerClassName?: string;
  placeholder?: string;
  hideChevron?: boolean;
  openUp?: boolean;
  disabled?: boolean;
  /** Renderiza el menú en <body> (fixed) para que no lo corte un contenedor con overflow. */
  portal?: boolean;
  /** Selección múltiple: `value` es una lista separada por comas; "all" (si existe) limpia. */
  multiple?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // El menú portalizado vive fuera de `ref`, hay que contarlo como "dentro"
      if (ref.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  // El menú portalizado va en coordenadas de viewport: se recalcula al abrir y
  // se cierra si algo scrollea debajo (así no queda flotando fuera de sitio).
  // El ancho real del menú solo se conoce tras montarlo, así que se reposiciona
  // en el siguiente frame para no salirse por el borde derecho de la pantalla.
  useEffect(() => {
    if (!open || !portal) return;
    let raf = 0;
    let attempts = 0;
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const margin = 8;
      const menuEl = menuRef.current;
      // El ancho real solo se conoce tras montar el menú: se estima una primera
      // vez (sin salirse) y se refina en el siguiente frame.
      const estimate = Math.min(280, Math.max(rect.width, 160));
      if (!menuEl && attempts < 3) {
        attempts++;
        let estLeft = rect.left;
        if (estLeft + estimate > window.innerWidth - margin) estLeft = window.innerWidth - estimate - margin;
        if (estLeft < margin) estLeft = margin;
        setMenuPos({ top: openUp ? rect.top : rect.bottom + 4, left: estLeft, width: rect.width });
        raf = requestAnimationFrame(place);
        return;
      }
      const menuWidth = menuEl ? menuEl.getBoundingClientRect().width : estimate;
      let left = rect.left;
      if (left + menuWidth > window.innerWidth - margin) left = window.innerWidth - menuWidth - margin;
      if (left < margin) left = margin;
      setMenuPos({ top: openUp ? rect.top : rect.bottom + 4, left, width: rect.width });
    };
    raf = requestAnimationFrame(place);
    const close = () => setOpen(false);
    const onScroll = (e: Event) => {
      // Ignora el scroll dentro del propio menú (rueda del ratón / barra)
      if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) return;
      close();
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [open, portal, openUp]);

  const sel = multiple ? value.split(",").filter((v) => v && v !== "all") : [];
  const isOn = (v: string) => (multiple ? (v === "all" ? sel.length === 0 : sel.includes(v)) : v === value);
  const pick = (v: string) => {
    if (!multiple) { onChange(v); setOpen(false); return; }
    if (v === "all") { onChange("all"); return; }
    const next = sel.includes(v) ? sel.filter((x) => x !== v) : [...sel, v];
    onChange(next.length ? next.join(",") : "all");
  };
  const selected = multiple
    ? options.find((o) => o.value === (sel[0] ?? "all"))
    : options.find((o) => o.value === value);

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className={`${
          triggerClassName ??
          "flex w-full items-center justify-between rounded-xl border border-[#E2E8F0] px-3 py-2 text-left text-sm text-[#1A1A1A]"
        } disabled:opacity-50`}
      >
        <span className="flex items-center gap-1.5">
          {selected?.label ?? placeholder ?? ""}
          {sel.length > 1 && <span className="rounded-full bg-[#E2E8F0] px-1.5 text-[10px] font-bold text-[#475569]">+{sel.length - 1}</span>}
        </span>
        {!hideChevron && <span className="text-[#94A3B8]">▾</span>}
      </button>
      {open && (() => {
        const menu = (
          <div
            ref={menuRef}
            className={`${portal ? "fixed" : "absolute left-0"} z-50 max-h-48 w-max min-w-full max-w-[280px] overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white py-1 shadow-lg ${
              portal ? "" : openUp ? "bottom-full mb-1" : "top-full mt-1"
            }`}
            style={portal && menuPos ? { top: menuPos.top, left: menuPos.left, minWidth: menuPos.width, transform: openUp ? "translateY(-100%)" : undefined } : undefined}
          >
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => pick(o.value)}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-[#F1F5F9] ${
                  isOn(o.value) ? "bg-[#EFFCF7] font-bold text-[#0F9D6A]" : "text-[#1A1A1A]"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        );
        if (!portal) return menu;
        return menuPos ? createPortal(menu, document.body) : null;
      })()}
    </div>
  );
}
