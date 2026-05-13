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
};

export default function AddToCartButton({
  id,
  nombre,
  precio,
  imagen,
  cantidad = 1,
  disabled = false,
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
      className={`inline-flex rounded-full px-5 py-3 text-sm font-semibold transition-colors duration-200 ${
        disabled
          ? "cursor-not-allowed bg-[#d8dbe0] text-[#6b7280]"
          : added
          ? "bg-[#0C535B] text-white"
          : "bg-[#27B1B8] text-white hover:bg-[#1E969B]"
      }`}
    >
      {disabled ? "Sin stock" : added ? "Agregado" : "Agregar al carrito"}
    </button>
  );
}
