"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MdSend, MdSmartToy, MdPerson, MdSupportAgent, MdChatBubbleOutline, MdShoppingBag, MdHeadsetMic } from "react-icons/md";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";

type ConversationSummary = {
  id: string;
  phone: string;
  status: "ACTIVE" | "CLOSED";
  orderId: string | null;
  updatedAt: string;
  lastMessage: { content: string; role: "USER" | "ASSISTANT" | "AGENT"; createdAt: string } | null;
};

type Message = {
  id: string;
  role: "USER" | "ASSISTANT" | "AGENT";
  content: string;
  createdAt: string;
};

const AVATAR_COLORS = [
  "bg-[#DCFCE7] text-[#15803D]",
  "bg-[#DBEAFE] text-[#1D4ED8]",
  "bg-[#FCE7F3] text-[#BE185D]",
  "bg-[#FEF3C7] text-[#B45309]",
  "bg-[#EDE9FE] text-[#6D28D9]",
];

function avatarColor(phone: string) {
  const sum = phone.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

function formatRelative(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

export default function WhatsappPanelPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationStatus, setConversationStatus] = useState<"ACTIVE" | "CLOSED" | null>(null);
  const [conversationPhone, setConversationPhone] = useState<string>("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversations = async () => {
    const res = await fetch("/api/panel/whatsapp/conversations");
    if (!res.ok) return;
    const data = (await res.json()) as ConversationSummary[];
    setConversations(data);
    setLoading(false);
  };

  const loadMessages = async (id: string) => {
    const res = await fetch(`/api/panel/whatsapp/conversations/${id}/messages`);
    if (!res.ok) return;
    const data = (await res.json()) as { phone: string; status: "ACTIVE" | "CLOSED"; messages: Message[] };
    setMessages(data.messages);
    setConversationStatus(data.status);
    setConversationPhone(data.phone);
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedId) loadMessages(selectedId);
  }, [selectedId]);

  useRealtimeRefresh(["wati"], () => {
    loadConversations();
    if (selectedId) loadMessages(selectedId);
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const activeCount = conversations.filter((c) => c.status === "ACTIVE").length;

  const handleSend = async () => {
    if (!selectedId || !draft.trim() || sending) return;
    setSending(true);
    const text = draft.trim();
    setDraft("");

    const res = await fetch(`/api/panel/whatsapp/conversations/${selectedId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (res.ok) {
      await loadMessages(selectedId);
      await loadConversations();
    }
    setSending(false);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
      <aside className="flex w-full max-w-xs shrink-0 flex-col border-r border-[#E2E8F0]">
        <div
          className="px-4 py-4 text-white"
          style={{ background: "linear-gradient(120deg, #0E7C82 0%, #27B1B8 60%, #6FC7C3 100%)" }}
        >
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <MdChatBubbleOutline size={18} />
            </span>
            <div>
              <h1 className="text-sm font-bold">WhatsApp</h1>
              <p className="text-xs text-white/80">
                {conversations.length} conversaciones · {activeCount} activas
              </p>
            </div>
          </div>
          <p className="mt-3 rounded-lg bg-white/15 px-3 py-2 text-[11px] leading-snug text-white/90">
            El vendedor IA responde solo. Escribe aquí cuando quieras tomar una conversación para{" "}
            <b>ventas</b> o dar <b>soporte</b> directo.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col gap-3 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-[#F1F5F9]" />
              ))}
            </div>
          )}

          {!loading && conversations.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EFFDFD] text-[#27B1B8]">
                <MdChatBubbleOutline size={30} />
              </span>
              <p className="text-sm font-semibold text-[#0F172A]">Sin conversaciones todavía</p>
              <p className="text-xs leading-relaxed text-[#64748B]">
                En cuanto un cliente le escriba al WhatsApp de Kliniu, la conversación aparece aquí
                automáticamente — con lo que el bot de ventas ya respondió y listo para que entres tú.
              </p>
              <div className="mt-2 flex w-full flex-col gap-2 text-left">
                <div className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] px-3 py-2">
                  <MdShoppingBag size={16} className="text-[#0E7C82]" />
                  <span className="text-xs text-[#334155]">Cierra ventas que el bot dejó a medias</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] px-3 py-2">
                  <MdHeadsetMic size={16} className="text-[#0E7C82]" />
                  <span className="text-xs text-[#334155]">Da soporte postventa desde el mismo chat</span>
                </div>
              </div>
            </div>
          )}

          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`flex w-full items-start gap-3 border-b border-[#F1F5F9] px-4 py-3 text-left transition hover:bg-[#F8FAFC] ${
                selectedId === c.id ? "bg-[#EFFDFD]" : ""
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(c.phone)}`}
              >
                {c.phone.slice(-2)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-[#0F172A]">{c.phone}</span>
                  {c.lastMessage && (
                    <span className="shrink-0 text-[11px] text-[#94A3B8]">
                      {formatRelative(c.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                <p className="line-clamp-1 text-xs text-[#64748B]">{c.lastMessage?.content ?? "Sin mensajes"}</p>
                <span
                  className={`mt-1 inline-block w-fit rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    c.status === "ACTIVE" ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#F1F5F9] text-[#64748B]"
                  }`}
                >
                  {c.status === "ACTIVE" ? "Activa" : c.orderId ? "Pedido generado" : "Cerrada"}
                </span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className="flex flex-1 flex-col">
        {!selected && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#F8FAFC] text-[#94A3B8]">
              <MdChatBubbleOutline size={36} />
            </span>
            <p className="text-sm font-semibold text-[#334155]">Selecciona una conversación</p>
            <p className="max-w-xs text-xs text-[#94A3B8]">
              Verás el historial completo con el cliente, incluyendo lo que ya respondió la IA.
            </p>
          </div>
        )}

        {selected && (
          <>
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-3">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${avatarColor(conversationPhone)}`}
                >
                  {conversationPhone.slice(-2)}
                </span>
                <div>
                  <p className="text-sm font-bold text-[#0F172A]">{conversationPhone}</p>
                  <p className="text-xs text-[#64748B]">
                    {conversationStatus === "ACTIVE" ? "Conversación activa" : "Pedido generado — cerrada"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#F8FAFC] px-5 py-4">
              <div className="flex flex-col gap-3">
                {messages.map((m) => {
                  const isCustomer = m.role === "USER";
                  return (
                    <div key={m.id} className={`flex ${isCustomer ? "justify-start" : "justify-end"}`}>
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                          isCustomer
                            ? "bg-white text-[#0F172A]"
                            : m.role === "AGENT"
                              ? "bg-[#DBEAFE] text-[#1D4ED8]"
                              : "bg-[#27B1B8] text-white"
                        }`}
                      >
                        <div className="mb-1 flex items-center gap-1 text-[10px] opacity-70">
                          {m.role === "USER" && <MdPerson size={12} />}
                          {m.role === "ASSISTANT" && <MdSmartToy size={12} />}
                          {m.role === "AGENT" && <MdSupportAgent size={12} />}
                          <span>
                            {m.role === "USER" ? "Cliente" : m.role === "ASSISTANT" ? "IA" : "Asesor"} ·{" "}
                            {formatTime(m.createdAt)}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-[#E2E8F0] px-4 py-3">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Escribe un mensaje…"
                className="flex-1 rounded-full border border-[#E2E8F0] px-4 py-2 text-sm outline-none focus:border-[#27B1B8]"
              />
              <button
                onClick={handleSend}
                disabled={sending || !draft.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#27B1B8] text-white disabled:opacity-50"
              >
                <MdSend size={16} />
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
