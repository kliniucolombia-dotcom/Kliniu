"use client";
import { useState, useEffect, useRef } from "react";

export function SimpleSelect({
  value,
  options,
  onChange,
  className,
  triggerClassName,
  placeholder,
  hideChevron,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
  triggerClassName?: string;
  placeholder?: string;
  hideChevron?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={
          triggerClassName ??
          "flex w-full items-center justify-between rounded-xl border border-[#E2E8F0] px-3 py-2 text-left text-sm text-[#1A1A1A]"
        }
      >
        <span>{selected?.label ?? placeholder ?? ""}</span>
        {!hideChevron && <span className="text-[#94A3B8]">▾</span>}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 max-h-48 w-max min-w-full max-w-[280px] overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white py-1 shadow-lg">
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
      )}
    </div>
  );
}
