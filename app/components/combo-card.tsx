"use client";

import Link from "next/link";
import { useCart } from "./cart-provider";
import { useSaleMode } from "./sale-mode-provider";
import ComboPrice from "./combo-price";
import WhatsAppBuyCTA, { WHATSAPP_ICON } from "./whatsapp-buy-cta";

export type ComboCardData = {
  id: string;
  nombre: string;
  imagen: string;
  destacado?: boolean;
  items: string[];
  precio: string;
  precioNumero: number;
  precioNormal: number;
  sku: string;
};

export default function ComboCard({ combo, className = "" }: { combo: ComboCardData; className?: string }) {
  const { addItem } = useCart();
  const saleMode = useSaleMode();

  const handleAdd = () =>
    addItem({
      id: combo.id,
      nombre: combo.nombre,
      precio: combo.precio,
      imagen: combo.imagen,
      sku: combo.sku,
      isCombo: true,
      comboId: combo.id,
    });

  return (
    <div className={`interactive-lift relative overflow-hidden rounded-2xl border border-black/8 bg-white ${className}`}>
      {combo.destacado && (
        <span className="absolute left-3 top-3 z-10 rounded-lg bg-[#f5a623] px-2.5 py-1 text-[10px] font-bold text-white">
          Más vendido
        </span>
      )}
      <Link href={`/combo/${combo.id}`} className="flex aspect-[3/4] items-center justify-center bg-white p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={combo.imagen} alt={combo.nombre} className="h-full w-full object-contain" />
      </Link>
      <div className="flex flex-col gap-2 p-4">
        <Link href={`/combo/${combo.id}`} className="font-semibold text-[#111] transition-colors hover:text-[#27B1B8]">
          {combo.nombre}
        </Link>
        <ul className="space-y-1">
          {combo.items.map((item) => (
            <li key={item} className="flex items-start gap-1.5 text-xs text-[#555]">
              <span className="mt-px text-[#27B1B8]">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <div className="mt-1 border-t border-black/8 pt-2">
          <ComboPrice price={combo.precioNumero} normalPrice={combo.precioNormal} />
        </div>
        <div className="mt-1 flex items-center gap-2">
          {saleMode === "whatsapp" ? (
            <WhatsAppBuyCTA
              nombre={combo.nombre}
              className="shine-sweep flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#25D366] py-2 text-xs font-bold text-white hover:bg-[#128C7E]"
            >
              {WHATSAPP_ICON}
              WhatsApp
            </WhatsAppBuyCTA>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              className="shine-sweep flex-1 rounded-full bg-[#F07826] py-2 text-xs font-bold text-white transition-colors hover:bg-[#d4621a]"
            >
              Agregar
            </button>
          )}
          <Link
            href={`/combo/${combo.id}`}
            className="flex-1 rounded-full border border-black/10 py-2 text-center text-xs font-semibold text-[#444] transition-colors hover:border-[#27B1B8] hover:text-[#27B1B8]"
          >
            Ver combo
          </Link>
        </div>
      </div>
    </div>
  );
}
