"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MdSend, MdSmartToy, MdPerson, MdSupportAgent } from "react-icons/md";
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

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
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
        <div className="border-b border-[#E2E8F0] px-4 py-3">
          <h1 className="text-sm font-bold text-[#0F172A]">WhatsApp</h1>
          <p className="text-xs text-[#64748B]">{conversations.length} conversaciones</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading && <p className="p-4 text-sm text-[#64748B]">Cargando…</p>}
          {!loading && conversations.length === 0 && (
            <p className="p-4 text-sm text-[#64748B]">Sin conversaciones todavía.</p>
          )}
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`flex w-full flex-col gap-1 border-b border-[#F1F5F9] px-4 py-3 text-left transition hover:bg-[#F8FAFC] ${
                selectedId === c.id ? "bg-[#EFFDFD]" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#0F172A]">{c.phone}</span>
                {c.lastMessage && (
                  <span className="text-[11px] text-[#94A3B8]">{formatTime(c.lastMessage.createdAt)}</span>
                )}
              </div>
              <p className="line-clamp-1 text-xs text-[#64748B]">
                {c.lastMessage?.content ?? "Sin mensajes"}
              </p>
              <span
                className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  c.status === "ACTIVE" ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#F1F5F9] text-[#64748B]"
                }`}
              >
                {c.status === "ACTIVE" ? "Activa" : "Cerrada"}
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className="flex flex-1 flex-col">
        {!selected && (
          <div className="flex flex-1 items-center justify-center text-sm text-[#94A3B8]">
            Selecciona una conversación
          </div>
        )}

        {selected && (
          <>
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-3">
              <div>
                <p className="text-sm font-bold text-[#0F172A]">{conversationPhone}</p>
                <p className="text-xs text-[#64748B]">
                  {conversationStatus === "ACTIVE" ? "Conversación activa" : "Pedido generado — cerrada"}
                </p>
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
