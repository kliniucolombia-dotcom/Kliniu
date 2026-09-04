"use client";
import { useState, useEffect, useRef } from "react";
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
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
  triggerClassName?: string;
  placeholder?: string;
  hideChevron?: boolean;
  openUp?: boolean;
  disabled?: boolean;
  /** Renderiza el menú en <body> (fixed) para que no lo corte un contenedor con overflow. */
  portal?: boolean;
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
  useEffect(() => {
    if (!open || !portal) return;
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) setMenuPos({ top: openUp ? rect.top : rect.bottom + 4, left: rect.left, width: rect.width });
    };
    place();
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open, portal, openUp]);

  const selected = options.find((o) => o.value === value);

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
        <span>{selected?.label ?? placeholder ?? ""}</span>
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
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-[#F1F5F9] ${
                  o.value === value ? "bg-[#EFFCF7] font-bold text-[#0F9D6A]" : "text-[#1A1A1A]"
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
