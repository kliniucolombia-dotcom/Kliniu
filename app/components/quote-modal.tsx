"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getVolumePricing } from "@/lib/volume-discounts";

type Props = {
  open: boolean;
  onClose: () => void;
  productoId: string;
  productoNombre: string;
  productoPrecio: string;
  productoImagen: string;
  productoCodigo?: string;
  cantidadSeleccionada?: number;
  productSlug?: string;
  productSku?: string;
  preciosPorCantidad?: { cantidad: number; precioUnitario: number }[];
  addItem: (item: { id: string; nombre: string; precio: string; precioOriginal?: string; imagen: string; cantidad: number }) => void;
};

type Msg = {
  from: "asesor" | "user";
  text: string;
  cartAction?: { qty: number; precio: string; totalLabel: string };
};

function buildReply(
  qty: number,
  nombre: string,
  precio: string,
  codigo?: string,
  productSlug?: string,
  preciosPorCantidad?: { cantidad: number; precioUnitario: number }[],
  productSku?: string,
): { text: string; cartAction: Msg["cartAction"] } {
  const pricing = getVolumePricing(precio, qty, productSlug, preciosPorCantidad, productSku);
  const { tier, unitPriceLabel, totalLabel } = pricing;
  const codigoLine = codigo ? `Código: ${codigo}\n` : "";

  let text = "";
  if (tier.pct === 0) {
    text = `${codigoLine}Para ${qty.toLocaleString("es-CO")} unidad${qty > 1 ? "es" : ""} aplica precio de lista sin descuento. Cada unidad te queda en ${unitPriceLabel}.\nTotal: ${totalLabel} 😊\n\n¿Quieres agregar esta orden al carrito?`;
  } else if (tier.pct <= 6) {
    text = `${codigoLine}¡Claro que sí! Para ${qty.toLocaleString("es-CO")} unidades te hago un **${tier.pct}% de descuento** 👌\n\nPrecio por unidad: ${unitPriceLabel}\nTotal: ${totalLabel}\n\n¿Agrego esta orden al carrito?`;
  } else if (tier.pct === 8) {
    text = `${codigoLine}¡Excelente cantidad! Para ${qty.toLocaleString("es-CO")} unidades te aplico el **${tier.pct}% de descuento** 🎉\n\nPrecio por unidad: ${unitPriceLabel}\nTotal: ${totalLabel}\n\n¡Es una muy buena inversión! ¿Lo agrego al carrito con ese precio?`;
  } else {
    text = `${codigoLine}¡Wow, eso es un pedido grande! 💪 Para ${qty.toLocaleString("es-CO")} unidades te doy nuestro mejor descuento: **${tier.pct}%**.\n\nPrecio por unidad: ${unitPriceLabel}\nTotal: ${totalLabel}\n\nCon ese volumen tenemos condiciones especiales. ¿Agrego al carrito?`;
  }

  return {
    text,
    cartAction: { qty, precio: unitPriceLabel, totalLabel },
  };
}

export default function QuoteModal({ open, onClose, productoId, productoNombre, productoPrecio, productoImagen, productoCodigo, cantidadSeleccionada, productSlug, productSku, preciosPorCantidad, addItem }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [addedQty, setAddedQty] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setInput("");
      setTyping(false);
      setAddedQty(null);
      const qty = cantidadSeleccionada && cantidadSeleccionada > 0 ? cantidadSeleccionada : undefined;
      if (qty) {
        const { text, cartAction } = buildReply(qty, productoNombre, productoPrecio, productoCodigo, productSlug, preciosPorCantidad, productSku);
        setMsgs([{
          from: "asesor",
          text: `¡Hola! 👋 Soy tu asesor Kliniu.\n\nVeo que tienes seleccionadas **${qty.toLocaleString("es-CO")} unidad${qty > 1 ? "es" : ""}** de **${productoNombre}**.\n\n${text}`,
          cartAction,
        }]);
      } else {
        setMsgs([{
          from: "asesor",
          text: `¡Hola! 👋 Soy tu asesor Kliniu.\n\n¿Cuántas unidades de **${productoNombre}** necesitas? Según la cantidad te consigo el mejor precio.`,
        }]);
      }
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open, productoNombre, productoPrecio, productoCodigo, cantidadSeleccionada, productSlug, productSku, preciosPorCantidad]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, typing]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleAddToCart = (qty: number, precioUnitario: string) => {
    const hasDiscount = precioUnitario !== productoPrecio;
    addItem({
      id: productoId,
      nombre: productoNombre,
      precio: precioUnitario,
      precioOriginal: hasDiscount ? productoPrecio : undefined,
      imagen: productoImagen,
      cantidad: qty,
    });
    setAddedQty(qty);
    setMsgs((prev) => [
      ...prev,
      {
        from: "asesor",
        text: `✅ ¡Listo! Agregué **${qty.toLocaleString("es-CO")} unidades** al carrito con el precio con descuento incluido.\n\nPuedes ir al carrito para completar tu compra.`,
      },
    ]);
  };

  const getAsesorResponse = (raw: string): { text: string; cartAction?: Msg["cartAction"] } => {
    const lower = raw.toLowerCase().trim();

    // Número detectado — va primero para que "hola quiero 6 unidades" calcule el descuento
    const qty = parseInt(raw.replace(/[^\d]/g, ""), 10);
    if (!isNaN(qty) && qty > 0 && /\d/.test(raw)) {
      return buildReply(qty, productoNombre, productoPrecio, productoCodigo, productSlug, preciosPorCantidad, productSku);
    }

    // Saludos
    if (/^(hola|holi|hey|buenas|buenos|buen día|buen dia|hello|hi|qué más|que mas|quiubo|quiubas)/.test(lower)) {
      const greetings = [
        `¡Hola, qué gusto saludarte! 😄 Estoy aquí para ayudarte a conseguir el mejor precio en **${productoNombre}**. ¿Cuántas unidades necesitas?`,
        `¡Hola! Bienvenido/a 👋 Cuéntame, ¿para cuántas unidades de **${productoNombre}** te puedo cotizar?`,
        `¡Buenas! Con gusto te ayudo 😊 Solo dime cuántas unidades necesitas y te armo la cotización al instante.`,
      ];
      return { text: greetings[Math.floor(Math.random() * greetings.length)] };
    }

    // Cómo estás
    if (/(cómo est|como est|cómo vas|como vas|qué tal|que tal|todo bien|todo mal)/.test(lower)) {
      return { text: `¡Muy bien, gracias por preguntar! 😊 Todo listo para atenderte. ¿Cuántas unidades de **${productoNombre}** estás buscando?` };
    }

    // Preguntas de precio
    if (/(precio|cuánto|cuanto|vale|cuesta|costo|valor)/.test(lower)) {
      return { text: `El precio de lista del **${productoNombre}** es **${productoPrecio}** por unidad 💰\n\nPero si compras en cantidad te puedo dar un descuento. ¿Cuántas unidades necesitas?` };
    }

    // Preguntas de descuento
    if (/(descuento|rebaja|oferta|promoción|promo|porcentaje|mejor precio)/.test(lower)) {
      return { text: `Claro que sí, manejamos descuentos por volumen 🎉\n\n• 12 - 49 unidades → **5% off**\n• 50 - 99 unidades → **6% off**\n• 100 - 999 unidades → **8% off**\n• 1.000+ unidades → **15% off**\n\n¿Cuántas unidades necesitas?` };
    }

    // Preguntas de envío
    if (/(envío|envio|despacho|demora|entrega|llega|shipping)/.test(lower)) {
      return { text: `Hacemos envíos a todo Colombia 🇨🇴 El tiempo de entrega es de **2 a 5 días hábiles** dependiendo del destino.\n\n¿Cuántas unidades te cotizo?` };
    }

    // Despedidas
    if (/(gracias|muchas gracias|chao|chau|hasta luego|nos vemos|bye)/.test(lower)) {
      return { text: `¡Con mucho gusto! 😊 Cuando quieras cotizar solo escríbeme. ¡Que tengas un excelente día! 👋` };
    }

    // Respuesta genérica natural
    const fallbacks = [
      `¡Claro! Con gusto te ayudo 😊 Para darte el mejor precio necesito saber: ¿cuántas unidades de **${productoNombre}** necesitas?`,
      `Entendido, estoy aquí para lo que necesites 👌 Cuéntame la cantidad que buscas y te armo la cotización.`,
      `¡Perfecto! Dime cuántas unidades necesitas y te calculo el precio con descuento al instante 🚀`,
    ];
    return { text: fallbacks[Math.floor(Math.random() * fallbacks.length)] };
  };

  const send = () => {
    const raw = input.trim();
    if (!raw) return;

    setMsgs((prev) => [...prev, { from: "user", text: raw }]);
    setInput("");
    setTyping(true);

    const delay = raw.length > 20 ? 1400 : 900;
    setTimeout(() => {
      const reply = getAsesorResponse(raw);
      setMsgs((prev) => [...prev, { from: "asesor", text: reply.text, cartAction: reply.cartAction }]);
      setTyping(false);
    }, delay);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        className="relative flex w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-white"
        style={{ height: "min(600px, 90vh)", boxShadow: "0 32px 80px rgba(0,0,0,0.3)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 px-4 py-3" style={{ background: "#0C535B" }}>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg">🦭</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Asesor Kliniu</p>
            <p className="text-[10px] text-white/60">En línea ahora</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ background: "#f0f2f5" }}>
          {msgs.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.from === "user" ? "items-end" : "items-start"}`}>
              <div
                className="max-w-[84%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm"
                style={{
                  background: msg.from === "user" ? "#0C535B" : "#fff",
                  color: msg.from === "user" ? "#fff" : "#1a1a1a",
                  borderBottomRightRadius: msg.from === "user" ? 4 : undefined,
                  borderBottomLeftRadius: msg.from === "asesor" ? 4 : undefined,
                  whiteSpace: "pre-wrap",
                }}
              >
                {msg.text.split(/\*\*(.+?)\*\*/g).map((part, j) =>
                  j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                )}
              </div>

              {/* CTA agregar al carrito */}
              {msg.cartAction && addedQty !== msg.cartAction.qty && (
                <button
                  type="button"
                  onClick={() => handleAddToCart(msg.cartAction!.qty, msg.cartAction!.precio)}
                  className="mt-2 flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
                  style={{ background: "#0C535B" }}
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
                  </svg>
                  Aplicar descuento y agregar · {msg.cartAction.totalLabel}
                </button>
              )}

              {/* CTA ir al carrito después de agregar */}
              {msg.cartAction && addedQty === msg.cartAction.qty && (
                <Link
                  href="/carrito"
                  onClick={onClose}
                  className="mt-2 flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
                  style={{ background: "#27B1B8" }}
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  ¡Agregado! Ver carrito →
                </Link>
              )}
            </div>
          ))}

          {typing && (
            <div className="flex items-start">
              <div className="rounded-2xl bg-white px-4 py-3 shadow-sm" style={{ borderBottomLeftRadius: 4 }}>
                <div className="flex gap-1 items-center h-4">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-2 w-2 rounded-full bg-[#bbb] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 flex items-center gap-2 border-t border-black/8 bg-white px-3 py-3">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder="Ej: 50, 100, 500..."
            className="flex-1 rounded-full border border-black/10 bg-[#f0f2f5] px-4 py-2.5 text-sm outline-none focus:border-[#27B1B8] focus:bg-white transition-colors"
          />
          <button
            type="button"
            onClick={send}
            disabled={!input.trim() || typing}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-40"
            style={{ background: "#0C535B" }}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
