"use client";

import { useState } from "react";
import { useCart } from "./cart-provider";

type Props = {
  id: string;
  nombre: string;
  precio: string;
  imagen: string;
  cantidad?: number;
  disabled?: boolean;
  className?: string;
};

export default function AddToCartButton({
  id,
  nombre,
  precio,
  imagen,
  cantidad = 1,
  disabled = false,
  className = "",
}: Props) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        addItem({ id, nombre, precio, imagen, cantidad });
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1200);
      }}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-colors duration-200 ${className} ${
        disabled
          ? "cursor-not-allowed border border-black/10 bg-[#f2f2f1] text-[#6b7280]"
          : added
          ? "border border-[#0C535B] bg-[#0C535B] text-white"
          : "border border-[#27B1B8]/40 bg-[#EAF8F7] text-[#0C535B] hover:bg-[#27B1B8] hover:text-white hover:border-[#27B1B8]"
      }`}
    >
      {disabled ? (
        "Sin stock"
      ) : added ? (
        <>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Agregado
        </>
      ) : (
        <>
          Agregar al carrito
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        </>
      )}
    </button>
  );
}
