"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

const STARTERS = [
  "¿Quién no nos compra hace más de 6 meses?",
  "¿A quién le vendimos hace 2 años?",
  "¿Cuáles son los clientes más grandes de este año?",
  "¿Qué producto se vendió más este mes?",
  "¿Hay pedidos por facturar este mes?",
  "¿Qué productos tienen stock bajo?",
];

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function OdooSalesChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hola, soy tu asistente comercial conectado a Odoo.\n\nPuedo ayudarte con:\n• Clientes inactivos que no compran hace meses o años\n• Quién compró en un período específico del pasado\n• Estadísticas de ventas y productos\n• Historial de compras por cliente\n• Stock bajo\n\nPregúntame lo que necesites en lenguaje natural.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const disabled = loading || input.trim().length === 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function ask(message: string) {
    const clean = message.trim();
    if (!clean || loading) return;

    const userMessage: ChatMessage = { id: makeId(), role: "user", content: clean };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setLoading(true);

    const history = messages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const response = await fetch("/api/odoo/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: clean, history }),
      });
      const payload = (await response.json()) as { message?: string; error?: string };
      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          content: payload.message || payload.error || "No pude consultar Odoo en este momento.",
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        { id: makeId(), role: "assistant", content: "No pude conectar con el asistente. Intenta de nuevo." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!disabled) void ask(input);
  }

  return (
    <div className="grid min-h-[calc(100vh-12rem)] gap-5 lg:grid-cols-[1fr_300px]">
      <section className="flex min-h-[620px] flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
        <div className="border-b border-[#E2E8F0] px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Chat interno</p>
          <h2 className="mt-1 text-lg font-black text-[#1A1A1A]">Asistente de ventas Odoo</h2>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-[#F8FAFC] p-5">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[82%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "bg-[#27B1B8] text-white"
                    : "border border-[#E2E8F0] bg-white text-[#1A1A1A]"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-bold text-[#64748B]">
                Consultando Odoo...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={onSubmit} className="border-t border-[#E2E8F0] bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ej: ¿Quién no nos compra hace más de un año?"
              className="min-w-0 flex-1 rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-semibold text-[#1A1A1A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#27B1B8]"
            />
            <button
              type="submit"
              disabled={disabled}
              className="shrink-0 rounded-xl bg-[#27B1B8] px-5 py-3 text-sm font-black text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Enviar
            </button>
          </div>
        </form>
      </section>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Preguntas rápidas</p>
          <div className="mt-4 space-y-2">
            {STARTERS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => void ask(suggestion)}
                disabled={loading}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-left text-xs font-bold leading-5 text-[#64748B] transition-colors hover:border-[#27B1B8] hover:text-[#0C535B] disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#D7F2F3] bg-[#E8FAFB] p-5">
          <p className="text-xs font-black uppercase tracking-widest text-[#0C535B]">Ahora responde</p>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-[#0C535B]">
            <li>• Clientes inactivos por período</li>
            <li>• Quién compró hace X tiempo</li>
            <li>• Top clientes y productos</li>
            <li>• Historial por cliente</li>
            <li>• Stock bajo y facturación</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
