"use client";

import Link from "next/link";
import { MdShoppingCart } from "react-icons/md";
import { useCart } from "./cart-provider";
import { useSaleMode } from "./sale-mode-provider";
import ComboPrice from "./combo-price";
import WhatsAppBuyCTA, { WHATSAPP_ICON } from "./whatsapp-buy-cta";

const MAX_VISIBLE_ITEMS = 3;

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
  sellerPhone?: string | null;
};

export default function ComboCard({ combo, className = "" }: { combo: ComboCardData; className?: string }) {
  const { addItem } = useCart();
  const saleMode = useSaleMode();

  const visibleItems = combo.items.slice(0, MAX_VISIBLE_ITEMS);
  const extraItems = combo.items.length - visibleItems.length;

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
    <div className={`interactive-lift relative flex flex-col overflow-hidden rounded-2xl border border-black/8 bg-white ${className}`}>
      {combo.destacado && (
        <span className="absolute left-3 top-3 z-10 rounded-lg bg-[#f5a623] px-2.5 py-1 text-[10px] font-bold text-white">
          Más vendido
        </span>
      )}
      <Link href={`/combo/${combo.id}`} className="flex h-56 shrink-0 items-center justify-center bg-white p-4 sm:h-64">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={combo.imagen} alt={combo.nombre} className="h-full w-full object-contain" />
      </Link>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <Link href={`/combo/${combo.id}`} className="line-clamp-2 min-h-[2.75rem] text-[17px] font-semibold leading-snug text-[#111] transition-colors hover:text-[#27B1B8]">
          {combo.nombre}
        </Link>

        <div>
          <p className="text-xs font-semibold text-[#333]">Incluye:</p>
          <ul className="mt-2 space-y-1.5">
            {visibleItems.map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs leading-snug text-[#6b7280]">
                <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[#22C55E] text-[9px] font-bold leading-none text-white">✓</span>
                <span className="line-clamp-1">{item}</span>
              </li>
            ))}
          </ul>
          {extraItems > 0 && (
            <p className="mt-2 text-xs font-semibold text-[#F07826]">+{extraItems} productos más</p>
          )}
        </div>

        <div className="mt-auto border-t border-black/8 pt-3">
          <ComboPrice
            price={combo.precioNumero}
            normalPrice={combo.precioNormal}
            priceClassName="text-xl font-extrabold text-[#0C535B]"
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {saleMode === "whatsapp" ? (
            <WhatsAppBuyCTA
              nombre={combo.nombre}
              phone={combo.sellerPhone}
              className="shine-sweep flex w-full min-w-0 items-center justify-center gap-1.5 rounded-full bg-[#25D366] px-2 py-2.5 text-xs font-bold text-white hover:bg-[#128C7E] sm:flex-1"
            >
              {WHATSAPP_ICON}
              WhatsApp
            </WhatsAppBuyCTA>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              className="shine-sweep flex w-full min-w-0 items-center justify-center gap-1.5 rounded-full bg-[#F07826] px-2 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#d4621a] sm:flex-1"
            >
              <MdShoppingCart size={15} />
              Agregar
            </button>
          )}
          <Link
            href={`/combo/${combo.id}`}
            className="w-full min-w-0 whitespace-nowrap rounded-full border border-black/10 px-2 py-2.5 text-center text-xs font-semibold text-[#444] transition-colors hover:border-[#27B1B8] hover:text-[#27B1B8] sm:flex-1"
          >
            Ver combo
          </Link>
        </div>
      </div>
    </div>
  );
}
