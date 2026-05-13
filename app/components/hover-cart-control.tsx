"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "./cart-provider";

type Props = {
  id: string;
  nombre: string;
  precio: string;
  imagen: string;
  disabled?: boolean;
};

export default function HoverCartControl({
  id,
  nombre,
  precio,
  imagen,
  disabled = false,
}: Props) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [cantidad, setCantidad] = useState(1);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleAdd = () => {
    if (disabled) return;

    Array.from({ length: cantidad }).forEach(() => {
      addItem({ id, nombre, precio, imagen });
    });
    setAdded(true);

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setAdded(false);
    }, 1400);
  };

  return (
    <div className="group/cart absolute bottom-4 right-4 z-20">
      <button
        type="button"
        aria-label={`Agregar ${nombre} al carrito`}
        disabled={disabled}
        className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/85 shadow-[0_14px_28px_rgba(15,23,42,0.18)] transition-all duration-250 ease-out focus-visible:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#27B1B8] focus-visible:ring-offset-2 ${
          disabled
            ? "cursor-not-allowed bg-[#e6e7ea] text-[#7a8087]"
            : "bg-[#f8f8f7] text-[#0C535B] hover:-translate-y-0.5 hover:bg-white hover:text-[#27B1B8] hover:shadow-[0_18px_34px_rgba(15,23,42,0.22)]"
        }`}
      >
        <span className="text-lg transition-transform duration-250 ease-out group-hover/cart:scale-105 group-focus-within/cart:scale-105">
          🛒
        </span>
      </button>

      <div className={`absolute bottom-0 right-0 translate-y-3 transition-all duration-250 ease-out ${
        disabled
          ? "pointer-events-none opacity-0"
          : "pointer-events-none opacity-0 group-hover/cart:pointer-events-auto group-hover/cart:translate-y-0 group-hover/cart:opacity-100 group-focus-within/cart:pointer-events-auto group-focus-within/cart:translate-y-0 group-focus-within/cart:opacity-100"
      }`}>
        <div className="min-w-[264px] rounded-[1.1rem] border border-black/8 bg-white/98 p-2 shadow-[0_18px_34px_rgba(15,23,42,0.14)]">
          <div className="flex items-center gap-2.5">
            <div className="flex overflow-hidden rounded-[0.95rem] border border-black/10 bg-white">
              <button
                type="button"
                aria-label="Disminuir cantidad"
                onClick={() => setCantidad((current) => Math.max(1, current - 1))}
                className="inline-flex h-10 w-9 items-center justify-center text-lg text-[#4f545a] transition-colors duration-200 hover:bg-[#f5f5f5]"
              >
                -
              </button>
              <span className="inline-flex h-10 min-w-[2.8rem] items-center justify-center border-x border-black/10 px-1 text-sm font-medium text-[#1f2328]">
                {cantidad}
              </span>
              <button
                type="button"
                aria-label="Aumentar cantidad"
                onClick={() => setCantidad((current) => current + 1)}
                className="inline-flex h-10 w-9 items-center justify-center text-lg text-[#4f545a] transition-colors duration-200 hover:bg-[#f5f5f5]"
              >
                +
              </button>
            </div>

            <button
              type="button"
              onClick={handleAdd}
              className={`inline-flex h-10 min-w-[124px] flex-1 items-center justify-center whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold text-white transition-colors duration-200 ${
                added
                  ? "bg-[#0C535B]"
                  : "bg-[#27B1B8] hover:bg-[#1E969B]"
              }`}
            >
              {added ? "Agregado" : "Agregar al carrito"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
