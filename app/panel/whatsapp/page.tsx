"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  MdAdd,
  MdArrowBack,
  MdCheckCircle,
  MdClose,
  MdErrorOutline,
  MdExpandMore,
  MdFilterList,
  MdHeadsetMic,
  MdLockClock,
  MdMoreVert,
  MdOutlineAssignment,
  MdOutlineDescription,
  MdPerson,
  MdSearch,
  MdSend,
  MdSmartToy,
  MdSupportAgent,
  MdWhatsapp,
} from "react-icons/md";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";

type ConversationSummary = {
  id: string;
  phone: string;
  status: "ACTIVE" | "CLOSED";
  salesStage: "NEW" | "IN_PROGRESS" | "FOLLOW_UP" | "SOLD";
  notes: string | null;
  botPaused: boolean;
  orderId: string | null;
  odooOrderId: number | null;
  odooOrderName: string | null;
  odooSyncStatus: "NOT_SYNCED" | "SYNCED" | "FAILED";
  odooSyncError: string | null;
  followUpSentAt: string | null;
  updatedAt: string;
  lastMessage: { content: string; role: "USER" | "ASSISTANT" | "AGENT"; createdAt: string } | null;
};

type ConversationFilter = "ALL" | "NEW" | "ACTIVE" | "SOLD" | "CLOSED";
type SalesStage = "NEW" | "IN_PROGRESS" | "FOLLOW_UP" | "SOLD";
type ConversationTab = "CHAT" | "INFORMATION" | "HISTORY" | "NOTES" | "FILES";

const CONVERSATION_FILTERS: Array<{ value: ConversationFilter; label: string }> = [
  { value: "ALL", label: "Todos" },
  { value: "NEW", label: "Nuevos" },
  { value: "ACTIVE", label: "En conversación" },
  { value: "SOLD", label: "Vendidos" },
  { value: "CLOSED", label: "Cerradas" },
];

const FILTER_HEADER_CLASSES: Record<ConversationFilter, string> = {
  ALL: "from-[#075E54] via-[#0E7C82] to-[#35B8BE]",
  NEW: "from-[#5B21B6] via-[#7C3AED] to-[#A78BFA]",
  ACTIVE: "from-[#1E40AF] via-[#2563EB] to-[#60A5FA]",
  SOLD: "from-[#14532D] via-[#16A34A] to-[#4ADE80]",
  CLOSED: "from-[#334155] via-[#475569] to-[#64748B]",
};

const FILTER_ACTIVE_BUTTON_CLASSES: Record<ConversationFilter, string> = {
  ALL: "bg-white text-[#0E7C82] ring-white",
  NEW: "bg-[#4C1D95] text-white ring-[#C4B5FD]",
  ACTIVE: "bg-[#1E3A8A] text-white ring-[#BFDBFE]",
  SOLD: "bg-[#14532D] text-white ring-[#BBF7D0]",
  CLOSED: "bg-[#1E293B] text-white ring-[#CBD5E1]",
};

const SALES_STAGE_META: Record<SalesStage, { label: string; className: string; rowClassName: string; stripeClassName: string }> = {
  NEW: { label: "Nuevo", className: "bg-[#EDE9FE] text-[#6D28D9]", rowClassName: "bg-[#FAF8FF] hover:bg-[#F4F0FF]", stripeClassName: "border-l-[#8B5CF6]" },
  IN_PROGRESS: { label: "En conversación", className: "bg-[#DBEAFE] text-[#1D4ED8]", rowClassName: "bg-[#F5FAFF] hover:bg-[#EFF6FF]", stripeClassName: "border-l-[#3B82F6]" },
  FOLLOW_UP: { label: "En conversación", className: "bg-[#DBEAFE] text-[#1D4ED8]", rowClassName: "bg-[#F5FAFF] hover:bg-[#EFF6FF]", stripeClassName: "border-l-[#3B82F6]" },
  SOLD: { label: "Vendido", className: "bg-[#DCFCE7] text-[#15803D]", rowClassName: "bg-[#F0FDF4] hover:bg-[#DCFCE7]", stripeClassName: "border-l-[#22C55E]" },
};

const CLOSED_META = {
  label: "Cerrada",
  className: "bg-[#E2E8F0] text-[#334155]",
  rowClassName: "bg-[#F8FAFC] hover:bg-[#F1F5F9]",
  stripeClassName: "border-l-[#64748B]",
};

function getSalesStageMeta(value: unknown) {
  return value === "IN_PROGRESS" || value === "FOLLOW_UP" || value === "SOLD" || value === "NEW"
    ? SALES_STAGE_META[value]
    : SALES_STAGE_META.NEW;
}

function normalizeSalesStage(value: unknown): SalesStage {
  if (value === "FOLLOW_UP") return "IN_PROGRESS";
  return value === "IN_PROGRESS" || value === "SOLD" || value === "NEW" ? value : "NEW";
}

const CONVERSATION_TABS: Array<{ value: ConversationTab; label: string }> = [
  { value: "CHAT", label: "Chat" },
  { value: "INFORMATION", label: "Información" },
  { value: "HISTORY", label: "Historial" },
  { value: "NOTES", label: "Notas" },
  { value: "FILES", label: "Archivos" },
];

type Message = {
  id: string;
  role: "USER" | "ASSISTANT" | "AGENT";
  content: string;
  createdAt: string;
};

type WatiTemplate = {
  name: string;
  status: string;
  language: string;
  body: string;
  bodyOriginal: string;
  footer: string | null;
  parameters: Array<{ name: string; defaultValue: string }>;
};

type NewConversationResult = {
  id: string;
  phone: string;
  status: "ACTIVE" | "CLOSED";
  salesStage: SalesStage;
  notes: string | null;
  botPaused: boolean;
  messages: Message[];
};

const AVATAR_COLORS = [
  "bg-[#DCFCE7] text-[#15803D]",
  "bg-[#DBEAFE] text-[#1D4ED8]",
  "bg-[#FCE7F3] text-[#BE185D]",
  "bg-[#FEF3C7] text-[#B45309]",
  "bg-[#EDE9FE] text-[#6D28D9]",
];

function avatarColor(phone: string) {
  const sum = phone.split("").reduce((acc, character) => acc + character.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

function formatRelative(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

function readableError(data: unknown, fallback: string) {
  if (typeof data === "object" && data && "error" in data && typeof data.error === "string") {
    return data.error;
  }
  return fallback;
}

function renderTemplatePreview(template: WatiTemplate, values: Record<string, string>) {
  return template.bodyOriginal.replace(
    /\{\{([^}]+)\}\}/g,
    (_match, key: string) => values[key.trim()] || `{{${key}}}`,
  );
}

function templateDisplayName(name: string) {
  if (name === "kliniu_combo_premium_es") return "Combo Premium Kliniu";
  return name
    .replace(/_wati$/i, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function templateLanguage(language: string) {
  const normalized = language.toLowerCase();
  if (normalized.startsWith("es") || normalized.includes("spanish")) return "Español";
  if (normalized.startsWith("en") || normalized.includes("english")) return "Inglés";
  return language;
}

function NewConversationModal({
  templates,
  templatesLoading,
  templatesError,
  onClose,
  onCreated,
}: {
  templates: WatiTemplate[];
  templatesLoading: boolean;
  templatesError: string;
  onClose: () => void;
  onCreated: (conversation: NewConversationResult) => void;
}) {
  const [mode, setMode] = useState<"template" | "session">("template");
  const [phone, setPhone] = useState("");
  const [text, setText] = useState("");
  const [selectedTemplateName, setSelectedTemplateName] = useState("");
  const [parameterValues, setParameterValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);

  const selectedTemplate =
    templates.find((template) => template.name === selectedTemplateName) ?? templates[0] ?? null;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const selectTemplate = (name: string) => {
    const template = templates.find((item) => item.name === name);
    setSelectedTemplateName(name);
    setParameterValues(
      Object.fromEntries(
        (template?.parameters ?? []).map((parameter) => [parameter.name, parameter.defaultValue]),
      ),
    );
    setTemplateMenuOpen(false);
  };

  const submit = async () => {
    if (!phone.trim() || submitting) return;
    setSubmitting(true);
    setError("");

    const body =
      mode === "session"
        ? { mode, phone, text }
        : {
            mode,
            phone,
            templateName: selectedTemplate?.name ?? "",
            parameters: (selectedTemplate?.parameters ?? []).map((parameter) => ({
              name: parameter.name,
              value: parameterValues[parameter.name] ?? "",
            })),
          };

    try {
      const response = await fetch("/api/panel/whatsapp/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as NewConversationResult | { error?: string };

      if (!response.ok) {
        setError(readableError(data, "No fue posible enviar el mensaje."));
        return;
      }

      onCreated(data as NewConversationResult);
    } catch {
      setError("No fue posible conectar con el servidor.");
    } finally {
      setSubmitting(false);
    }
  };

  const templateReady =
    selectedTemplate &&
    selectedTemplate.parameters.every((parameter) => parameterValues[parameter.name]?.trim());
  const canSubmit =
    phone.trim() &&
    (mode === "session" ? text.trim() : Boolean(templateReady)) &&
    !submitting;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-[#0F172A]/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-chat-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-white/60 bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl">
        <div className="relative shrink-0 overflow-hidden rounded-t-3xl bg-gradient-to-br from-[#075E54] via-[#0E7C82] to-[#27B1B8] px-5 py-5 pr-16 text-white sm:px-6">
          <div className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full bg-white/10" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white ring-1 ring-white/25 transition hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white"
          >
            <MdClose className="pointer-events-none" size={22} />
          </button>
          <div className="relative flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <MdWhatsapp size={27} />
            </span>
            <div>
              <h2 id="new-chat-title" className="text-lg font-bold">
                Iniciar conversación
              </h2>
              <p className="text-sm text-white/75">Escribe a cualquier contacto desde Kliniu</p>
            </div>
          </div>
        </div>

        <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain p-4 sm:p-6">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#475569]">
              Número de WhatsApp
            </span>
            <div className="flex items-center rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3 transition focus-within:border-[#27B1B8] focus-within:ring-4 focus-within:ring-[#27B1B8]/10">
              <MdWhatsapp className="text-[#16A34A]" size={20} />
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Ej. 573001234567"
                inputMode="tel"
                autoFocus
                className="w-full bg-transparent px-3 py-3 text-sm text-[#0F172A] outline-none"
              />
            </div>
            <span className="mt-1.5 block text-[11px] text-[#64748B]">
              Incluye indicativo de país. Si escribes 10 dígitos, usaremos Colombia (+57).
            </span>
          </label>

          <div>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#475569]">
              Tipo de envío
            </span>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#F1F5F9] p-1">
              <button
                type="button"
                onClick={() => setMode("template")}
                className={`rounded-lg px-3 py-2.5 text-xs font-semibold transition ${
                  mode === "template"
                    ? "bg-white text-[#0E7C82] shadow-sm"
                    : "text-[#64748B] hover:text-[#334155]"
                }`}
              >
                Plantilla aprobada
              </button>
              <button
                type="button"
                onClick={() => setMode("session")}
                className={`rounded-lg px-3 py-2.5 text-xs font-semibold transition ${
                  mode === "session"
                    ? "bg-white text-[#0E7C82] shadow-sm"
                    : "text-[#64748B] hover:text-[#334155]"
                }`}
              >
                Mensaje libre
              </button>
            </div>
          </div>

          {mode === "template" ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-xl border border-[#BAE6FD] bg-[#F0F9FF] p-3 text-xs text-[#075985]">
                <MdCheckCircle className="mt-0.5 shrink-0" size={17} />
                <p>Funciona aunque el cliente nunca haya escrito o hayan pasado más de 24 horas.</p>
              </div>

              {templatesLoading ? (
                <div className="space-y-2">
                  <div className="h-11 animate-pulse rounded-xl bg-[#F1F5F9]" />
                  <div className="h-24 animate-pulse rounded-xl bg-[#F1F5F9]" />
                </div>
              ) : templatesError ? (
                <div className="flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs text-[#B91C1C]">
                  <MdErrorOutline className="mt-0.5 shrink-0" size={17} />
                  <p>{templatesError}</p>
                </div>
              ) : templates.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#CBD5E1] p-4 text-center text-xs text-[#64748B]">
                  No hay plantillas aprobadas en WATI.
                </div>
              ) : (
                <>
                  <div className="relative">
                    <span className="mb-2 block text-xs font-semibold text-[#334155]">Plantilla</span>
                    <button
                      type="button"
                      onClick={() => setTemplateMenuOpen((open) => !open)}
                      aria-haspopup="listbox"
                      aria-expanded={templateMenuOpen}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#CBD5E1] bg-white px-3 py-3 text-left outline-none transition hover:border-[#94A3B8] focus:border-[#27B1B8] focus:ring-4 focus:ring-[#27B1B8]/10"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-[#0F172A]">
                          {selectedTemplate ? templateDisplayName(selectedTemplate.name) : "Selecciona una plantilla"}
                        </span>
                        {selectedTemplate ? (
                          <span className="mt-0.5 block text-[11px] text-[#64748B]">
                            {templateLanguage(selectedTemplate.language)}
                          </span>
                        ) : null}
                      </span>
                      <MdExpandMore
                        className={`shrink-0 text-[#64748B] transition ${templateMenuOpen ? "rotate-180" : ""}`}
                        size={22}
                      />
                    </button>

                    {templateMenuOpen ? (
                      <div
                        role="listbox"
                        className="absolute z-30 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-[#DCE5EA] bg-white p-1.5 shadow-xl shadow-[#0F172A]/15"
                      >
                        {templates.map((template) => {
                          const active = selectedTemplate?.name === template.name;
                          return (
                            <button
                              key={template.name}
                              type="button"
                              role="option"
                              aria-selected={active}
                              onClick={() => selectTemplate(template.name)}
                              className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                                active ? "bg-[#E8FAFB] text-[#0E7C82]" : "text-[#334155] hover:bg-[#F8FAFC]"
                              }`}
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold">
                                  {templateDisplayName(template.name)}
                                </span>
                                <span className="block text-[11px] opacity-70">
                                  {templateLanguage(template.language)}
                                </span>
                              </span>
                              {active ? <MdCheckCircle className="shrink-0" size={18} /> : null}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>

                  {selectedTemplate?.parameters.map((parameter) => (
                    <label key={parameter.name} className="block">
                      <span className="mb-2 block text-xs font-semibold capitalize text-[#334155]">
                        {parameter.name}
                      </span>
                      <input
                        value={parameterValues[parameter.name] ?? parameter.defaultValue}
                        onChange={(event) =>
                          setParameterValues((current) => ({
                            ...current,
                            [parameter.name]: event.target.value,
                          }))
                        }
                        placeholder={`Valor para ${parameter.name}`}
                        className="w-full rounded-xl border border-[#CBD5E1] px-3 py-3 text-sm outline-none focus:border-[#27B1B8]"
                      />
                    </label>
                  ))}

                  {selectedTemplate ? (
                    <div className="rounded-2xl bg-[#E7FFDB] p-4">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#15803D]">
                        Vista previa
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#14532D]">
                        {renderTemplatePreview(selectedTemplate, parameterValues)}
                      </p>
                      {selectedTemplate.footer ? (
                        <p className="mt-2 text-[11px] text-[#4D7C0F]">{selectedTemplate.footer}</p>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3 text-xs text-[#92400E]">
                <MdLockClock className="mt-0.5 shrink-0" size={17} />
                <p>Solo funciona si el cliente escribió durante las últimas 24 horas.</p>
              </div>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-[#334155]">Mensaje</span>
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  rows={4}
                  maxLength={4096}
                  placeholder="Hola, ¿cómo podemos ayudarte?"
                  className="w-full resize-none rounded-xl border border-[#CBD5E1] px-3 py-3 text-sm outline-none focus:border-[#27B1B8]"
                />
              </label>
            </div>
          )}

          {error ? (
            <div className="flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs text-[#B91C1C]">
              <MdErrorOutline className="mt-0.5 shrink-0" size={17} />
              <p>{error}</p>
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2 border-t border-[#E2E8F0] pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-3 text-sm font-semibold text-[#64748B] transition hover:bg-[#F1F5F9] sm:py-2.5"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0E7C82] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#0E7C82]/20 transition hover:bg-[#086970] disabled:cursor-not-allowed disabled:opacity-45 sm:py-2.5"
            >
              <MdSend size={17} />
              {submitting ? "Enviando…" : "Enviar por WhatsApp"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WhatsappPanelPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationStatus, setConversationStatus] = useState<"ACTIVE" | "CLOSED" | null>(null);
  const [conversationSalesStage, setConversationSalesStage] = useState<SalesStage>("NEW");
  const [conversationNotes, setConversationNotes] = useState("");
  const [conversationBotPaused, setConversationBotPaused] = useState(false);
  const [activeTab, setActiveTab] = useState<ConversationTab>("CHAT");
  const [conversationPhone, setConversationPhone] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [conversationFilter, setConversationFilter] = useState<ConversationFilter>("ALL");
  const [showNewChat, setShowNewChat] = useState(false);
  const [templates, setTemplates] = useState<WatiTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState("");
  const [changingStage, setChangingStage] = useState(false);
  const [creatingOdooDraft, setCreatingOdooDraft] = useState(false);
  const [odooNotice, setOdooNotice] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [changingBotState, setChangingBotState] = useState(false);
  const [showConversationMenu, setShowConversationMenu] = useState(false);
  const [hasNewMessagesBelow, setHasNewMessagesBelow] = useState(false);
  const messageViewportRef = useRef<HTMLDivElement>(null);
  const conversationMenuRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const renderedChatRef = useRef<{
    conversationId: string | null;
    lastMessageId: string | null;
  }>({ conversationId: null, lastMessageId: null });
  const selectedIdRef = useRef<string | null>(selectedId);
  selectedIdRef.current = selectedId;
  const conversationsRequestIdRef = useRef(0);
  const messagesRequestIdRef = useRef(0);
  const refreshInFlightRef = useRef(false);
  const refreshQueuedRef = useRef(false);

  const loadConversations = useCallback(async () => {
    const requestId = ++conversationsRequestIdRef.current;
    try {
      const response = await fetch("/api/panel/whatsapp/conversations", { cache: "no-store" });
      if (!response.ok || requestId !== conversationsRequestIdRef.current) return;
      const data = (await response.json()) as ConversationSummary[];
      if (requestId === conversationsRequestIdRef.current) setConversations(data);
    } finally {
      if (requestId === conversationsRequestIdRef.current) setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (id: string) => {
    if (id !== selectedIdRef.current) return;
    const requestId = ++messagesRequestIdRef.current;
    const response = await fetch(`/api/panel/whatsapp/conversations/${id}/messages`, {
      cache: "no-store",
    });
    if (
      !response.ok ||
      requestId !== messagesRequestIdRef.current ||
      id !== selectedIdRef.current
    ) return;
    const data = (await response.json()) as {
      phone: string;
      status: "ACTIVE" | "CLOSED";
      salesStage: SalesStage;
      notes: string | null;
      botPaused: boolean;
      orderId: string | null;
      messages: Message[];
    };
    if (
      requestId !== messagesRequestIdRef.current ||
      id !== selectedIdRef.current
    ) return;
    setMessages((current) => {
      const unchanged =
        current.length === data.messages.length &&
        current.every((message, index) => {
          const next = data.messages[index];
          return (
            message.id === next.id &&
            message.role === next.role &&
            message.content === next.content &&
            message.createdAt === next.createdAt
          );
        });
      return unchanged ? current : data.messages;
    });
    setConversationStatus(data.status);
    setConversationSalesStage(data.orderId ? "SOLD" : normalizeSalesStage(data.salesStage));
    setConversationNotes(data.notes ?? "");
    setConversationBotPaused(Boolean(data.botPaused));
    setConversationPhone(data.phone);
  }, []);

  const openNewChat = async () => {
    setShowNewChat(true);
    if (templates.length || templatesLoading) return;

    setTemplatesLoading(true);
    setTemplatesError("");
    try {
      const response = await fetch("/api/panel/whatsapp/templates", { cache: "no-store" });
      const data = (await response.json()) as WatiTemplate[] | { error?: string };
      if (!response.ok) {
        setTemplatesError(readableError(data, "No fue posible cargar las plantillas."));
        return;
      }
      setTemplates(data as WatiTemplate[]);
    } catch {
      setTemplatesError("No fue posible conectar con WATI.");
    } finally {
      setTemplatesLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    isNearBottomRef.current = true;
    renderedChatRef.current = {
      conversationId: selectedId,
      lastMessageId: null,
    };
    setHasNewMessagesBelow(false);
    setShowConversationMenu(false);
    setMessages([]);

    if (selectedId) {
      loadMessages(selectedId);
    } else {
      messagesRequestIdRef.current += 1;
      setConversationStatus(null);
      setConversationSalesStage("NEW");
      setConversationPhone("");
    }
  }, [loadMessages, selectedId]);

  const refreshPanel = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    if (refreshInFlightRef.current) {
      refreshQueuedRef.current = true;
      return;
    }

    refreshInFlightRef.current = true;
    try {
      do {
        refreshQueuedRef.current = false;
        await Promise.all([
          loadConversations(),
          selectedId ? loadMessages(selectedId) : Promise.resolve(),
        ]);
      } while (refreshQueuedRef.current);
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [loadConversations, loadMessages, selectedId]);

  useRealtimeRefresh(["wati"], () => {
    void refreshPanel();
  });

  // Realtime broadcasts are primary; this short poll recovers quickly if a
  // browser sleeps or temporarily loses its Supabase subscription.
  useEffect(() => {
    const refresh = () => {
      void refreshPanel();
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const interval = window.setInterval(refresh, 2_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refreshPanel]);

  const handleChatScroll = useCallback(() => {
    const viewport = messageViewportRef.current;
    if (!viewport || activeTab !== "CHAT") return;

    const distanceFromBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    const isNearBottom = distanceFromBottom <= 96;
    isNearBottomRef.current = isNearBottom;
    if (isNearBottom) setHasNewMessagesBelow(false);
  }, [activeTab]);

  const scrollToLatest = useCallback((behavior: ScrollBehavior = "smooth") => {
    const viewport = messageViewportRef.current;
    if (!viewport) return;
    isNearBottomRef.current = true;
    setHasNewMessagesBelow(false);
    viewport.scrollTo({ top: viewport.scrollHeight, behavior });
  }, []);

  const latestMessageId = messages[messages.length - 1]?.id ?? null;
  useLayoutEffect(() => {
    if (activeTab !== "CHAT" || !selectedId || !latestMessageId) return;

    const previous = renderedChatRef.current;
    const conversationChanged = previous.conversationId !== selectedId;
    const firstLoadedMessage = previous.lastMessageId === null;
    const messageAppended = previous.lastMessageId !== latestMessageId;

    renderedChatRef.current = {
      conversationId: selectedId,
      lastMessageId: latestMessageId,
    };

    if (conversationChanged || firstLoadedMessage || isNearBottomRef.current) {
      scrollToLatest(conversationChanged || firstLoadedMessage ? "auto" : "smooth");
    } else if (messageAppended) {
      setHasNewMessagesBelow(true);
    }
  }, [activeTab, latestMessageId, scrollToLatest, selectedId]);

  useEffect(() => {
    if (!showConversationMenu) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (
        conversationMenuRef.current &&
        !conversationMenuRef.current.contains(event.target as Node)
      ) {
        setShowConversationMenu(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowConversationMenu(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [showConversationMenu]);

  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? null;
  const effectiveSalesStage: SalesStage = selected?.orderId
    ? "SOLD"
    : conversationSalesStage;
  const selectedOdooStatusText = !selected
    ? ""
    : selected.odooSyncStatus === "SYNCED"
      ? `Borrador ${selected.odooOrderName ?? ""} creado en Odoo, sin confirmar.`
      : selected.odooSyncStatus === "FAILED"
        ? `Odoo pendiente: ${selected.odooSyncError ?? "no fue posible crear el borrador"}.`
        : selected.orderId
          ? "El borrador de Odoo se creará automáticamente, sin confirmarse."
          : selected.followUpSentAt
            ? "Ya se envió un mensaje de seguimiento."
            : "El seguimiento se enviará si el cliente deja de responder.";
  const activeCount = conversations.filter((conversation) => conversation.status === "ACTIVE").length;
  const normalizedSearch = search.trim().toLowerCase();
  const searchedConversations = normalizedSearch
    ? conversations.filter(
        (conversation) =>
          conversation.phone.includes(normalizedSearch) ||
          conversation.lastMessage?.content.toLowerCase().includes(normalizedSearch),
      )
    : conversations;
  const filteredConversations = searchedConversations.filter((conversation) => {
    switch (conversationFilter) {
      case "NEW":
        return conversation.status === "ACTIVE" && conversation.salesStage === "NEW";
      case "ACTIVE":
        return (
          conversation.status === "ACTIVE" &&
          (conversation.salesStage === "IN_PROGRESS" ||
            conversation.salesStage === "FOLLOW_UP")
        );
      case "SOLD":
        return conversation.salesStage === "SOLD";
      case "CLOSED":
        return conversation.status === "CLOSED" && conversation.salesStage !== "SOLD";
      default:
        return true;
    }
  });
  const visibleConversationIdsKey = filteredConversations
    .map((conversation) => conversation.id)
    .join(",");

  useEffect(() => {
    if (!selectedId) return;
    const selectedIsVisible = visibleConversationIdsKey
      .split(",")
      .includes(selectedId);
    if (!selectedIsVisible) {
      selectedIdRef.current = null;
      setSelectedId(null);
    }
  }, [selectedId, visibleConversationIdsKey]);

  const handleCreated = async (conversation: NewConversationResult) => {
    setShowNewChat(false);
    await loadConversations();
    selectedIdRef.current = conversation.id;
    setSelectedId(conversation.id);
    setMessages(conversation.messages);
    setConversationPhone(conversation.phone);
    setConversationStatus(conversation.status);
    setConversationSalesStage(normalizeSalesStage(conversation.salesStage));
    setConversationNotes(conversation.notes ?? "");
    setConversationBotPaused(Boolean(conversation.botPaused));
    setActiveTab("CHAT");
  };

  const handleStageChange = async (salesStage: SalesStage) => {
    if (
      !selectedId ||
      selected?.orderId ||
      salesStage === effectiveSalesStage ||
      changingStage
    ) return;
    setChangingStage(true);
    setOdooNotice("");
    try {
      const response = await fetch(`/api/panel/whatsapp/conversations/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salesStage }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setOdooNotice(readableError(data, "No fue posible cambiar la etapa."));
        return;
      }
      setConversationSalesStage(salesStage);
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === selectedId ? { ...conversation, salesStage } : conversation,
        ),
      );
    } catch {
      setOdooNotice("No fue posible cambiar la etapa.");
    } finally {
      setChangingStage(false);
    }
  };

  const createOdooDraft = async () => {
    if (!selectedId || creatingOdooDraft || !selected?.orderId) return;
    setCreatingOdooDraft(true);
    setOdooNotice("");
    try {
      const response = await fetch(`/api/panel/whatsapp/conversations/${selectedId}/odoo-draft`, {
        method: "POST",
      });
      const data = (await response.json()) as { error?: string; odooOrderName?: string; message?: string };
      if (!response.ok) {
        setOdooNotice(readableError(data, "Odoo no pudo crear el borrador."));
        return;
      }
      await loadConversations();
      setOdooNotice(`${data.odooOrderName ?? "Borrador"} creado en Odoo. Sin confirmar.`);
    } catch {
      setOdooNotice("No fue posible conectar con Odoo.");
    } finally {
      setCreatingOdooDraft(false);
    }
  };

  const saveNotes = async () => {
    if (!selectedId || savingNotes) return;
    setSavingNotes(true);
    try {
      const response = await fetch(`/api/panel/whatsapp/conversations/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: conversationNotes }),
      });
      const data = (await response.json()) as { error?: string };
      setOdooNotice(response.ok ? "Notas guardadas." : readableError(data, "No fue posible guardar las notas."));
    } catch {
      setOdooNotice("No fue posible guardar las notas.");
    } finally {
      setSavingNotes(false);
    }
  };

  const toggleBotPaused = async () => {
    if (!selectedId || changingBotState) return;
    const botPaused = !conversationBotPaused;
    const startsNewSale =
      !botPaused && (effectiveSalesStage === "SOLD" || Boolean(selected?.orderId));
    setChangingBotState(true);
    setOdooNotice("");
    try {
      const response = await fetch(`/api/panel/whatsapp/conversations/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botPaused }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setOdooNotice(readableError(data, "No fue posible cambiar el estado de la IA."));
        return;
      }
      setConversationBotPaused(botPaused);
      if (startsNewSale) {
        await Promise.all([loadMessages(selectedId), loadConversations()]);
      } else {
        setConversations((current) => current.map((conversation) =>
          conversation.id === selectedId ? { ...conversation, botPaused } : conversation,
        ));
      }
      setOdooNotice(
        botPaused
          ? "IA pausada para este contacto."
          : startsNewSale
            ? "Nueva venta iniciada. La IA responderá con un contexto limpio."
            : "IA reactivada para este contacto.",
      );
    } catch {
      setOdooNotice("No fue posible cambiar el estado de la IA.");
    } finally {
      setChangingBotState(false);
    }
  };

  const handleSend = async () => {
    if (!selectedId || !draft.trim() || sending) return;
    setSending(true);
    setSendError("");
    const text = draft.trim();

    try {
      const response = await fetch(`/api/panel/whatsapp/conversations/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await response.json()) as Message | { error?: string };
      if (!response.ok) {
        setSendError(
          readableError(
            data,
            "WATI rechazó el mensaje. Si pasaron 24 horas, inicia otro chat con una plantilla.",
          ),
        );
        return;
      }
      setDraft("");
      isNearBottomRef.current = true;
      setHasNewMessagesBelow(false);
      await Promise.all([loadMessages(selectedId), loadConversations()]);
    } catch {
      setSendError("No fue posible conectar con el servidor.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <main className="min-h-[calc(100dvh-3.5rem)] bg-[#F4F7F8] md:min-h-dvh md:p-4">
      <div className="mx-auto flex h-[calc(100dvh-3.5rem)] min-h-0 max-w-[1600px] overflow-hidden border border-[#DCE5EA] bg-white shadow-sm md:h-[calc(100dvh-2rem)] md:rounded-2xl md:shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
        <aside
          className={`w-full max-w-[360px] shrink-0 flex-col border-r border-[#DCE5EA] bg-white ${
            selected ? "hidden md:flex" : "flex"
          }`}
        >
          <div className={`bg-gradient-to-br ${FILTER_HEADER_CLASSES[conversationFilter]} px-4 pb-4 pt-5 text-white transition-colors duration-300`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                  <MdWhatsapp size={24} />
                </span>
                <div>
                  <h1 className="text-base font-bold">WhatsApp</h1>
                  <p className="text-[11px] text-white/75">
                    {conversations.length} chats · {activeCount} abiertos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={openNewChat}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#0E7C82] shadow-lg shadow-black/10 transition hover:scale-105"
                aria-label="Nuevo chat"
                title="Nuevo chat"
              >
                <MdAdd size={22} />
              </button>
            </div>

            <div className="mt-4 flex items-center rounded-xl bg-white/15 px-3 ring-1 ring-white/15 focus-within:bg-white/20">
              <MdSearch size={18} className="text-white/70" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar conversación"
                name="conversation-search"
                aria-label="Buscar conversación"
                autoComplete="off"
                className="w-full bg-transparent px-2 py-2.5 text-xs text-white outline-none placeholder:text-white/55 focus-visible:ring-0"
              />
            </div>

            <div className="relative mt-3">
              <span className="absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white/75">
                <MdFilterList size={16} />
              </span>
              <div className="ml-9 grid grid-cols-3 gap-1.5">
              {CONVERSATION_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setConversationFilter(filter.value)}
                  aria-pressed={conversationFilter === filter.value}
                  className={`rounded-lg px-1.5 py-1.5 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90 ${
                    conversationFilter === filter.value
                      ? `${FILTER_ACTIVE_BUTTON_CLASSES[filter.value]} shadow-md ring-1`
                      : "bg-white/10 text-white/75 hover:bg-white/20"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col gap-3 p-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-16 animate-pulse rounded-xl bg-[#F1F5F9]" />
                ))}
              </div>
            ) : null}

            {!loading && conversations.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E7FFDB] text-[#15803D]">
                  <MdWhatsapp size={32} />
                </span>
                <div>
                  <p className="text-sm font-bold text-[#0F172A]">Tu bandeja está lista</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
                    Recibe mensajes en tiempo real o inicia una conversación ahora.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openNewChat}
                  className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#0E7C82] px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#0E7C82]/15"
                >
                  <MdAdd size={17} />
                  Nuevo mensaje
                </button>
                <div className="mt-3 flex w-full items-start gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-left">
                  <MdHeadsetMic className="mt-0.5 shrink-0 text-[#0E7C82]" size={17} />
                  <span className="text-[11px] leading-relaxed text-[#475569]">
                    Las respuestas de clientes aparecerán automáticamente mediante el webhook.
                  </span>
                </div>
              </div>
            ) : null}

            {!loading && conversations.length > 0 && filteredConversations.length === 0 ? (
              <div className="px-6 py-12 text-center text-xs text-[#64748B]">
                No encontramos conversaciones para este filtro{search ? ` y “${search}”` : ""}.
              </div>
            ) : null}

            {filteredConversations.map((conversation) => {
              const stageMeta =
                conversation.status === "CLOSED" && conversation.salesStage !== "SOLD"
                  ? CLOSED_META
                  : getSalesStageMeta(conversation.salesStage);
              return <button
                key={conversation.id}
                type="button"
                  onClick={() => {
                    selectedIdRef.current = conversation.id;
                    setSelectedId(conversation.id);
                    setConversationStatus(conversation.status);
                    setConversationSalesStage(
                      conversation.orderId
                        ? "SOLD"
                        : normalizeSalesStage(conversation.salesStage),
                    );
                    setConversationBotPaused(conversation.botPaused);
                    setConversationPhone(conversation.phone);
                    setActiveTab("CHAT");
                    setSendError("");
                    setOdooNotice("");
                  }}
                className={`flex w-full items-start gap-3 border-b border-l-4 border-[#F1F5F9] px-3 py-3.5 text-left transition ${stageMeta.stripeClassName} ${stageMeta.rowClassName} ${
                  selectedId === conversation.id ? "ring-2 ring-inset ring-[#0E7C82]/45" : ""
                }`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(conversation.phone)}`}
                >
                  {conversation.phone.slice(-2)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-[#0F172A]">
                      +{conversation.phone}
                    </span>
                    {conversation.lastMessage ? (
                      <span className="shrink-0 text-[10px] text-[#94A3B8]">
                        {formatRelative(conversation.lastMessage.createdAt)}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-[#64748B]">
                    {conversation.lastMessage?.content ?? "Sin mensajes"}
                  </p>
                  <span className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${stageMeta.className}`}>
                    {stageMeta.label}
                  </span>
                  {conversation.followUpSentAt ? (
                    <span className="ml-1 inline-flex rounded-full bg-[#E0F2FE] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#0369A1]">
                      Seguimiento enviado
                    </span>
                  ) : null}
                  {conversation.botPaused ? (
                    <span className="ml-1 inline-flex rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#B91C1C]">
                      IA pausada
                    </span>
                  ) : null}
                </div>
              </button>;
            })}
          </div>
        </aside>

        <section className={`min-h-0 min-w-0 flex-1 flex-col ${selected ? "flex" : "hidden md:flex"}`}>
          {!selected ? (
            <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 text-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#E8FBF7_0,_transparent_52%)] opacity-80" />
              <div className="relative flex max-w-sm flex-col items-center">
                <span className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-br from-[#E7FFDB] to-[#D5FAF4] text-[#0E7C82] shadow-xl shadow-[#0E7C82]/10">
                  <MdWhatsapp size={48} />
                </span>
                <p className="mt-6 text-lg font-bold text-[#0F172A]">WhatsApp conectado</p>
                <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
                  Responde conversaciones existentes o escribe primero con una plantilla aprobada.
                </p>
                <button
                  type="button"
                  onClick={openNewChat}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0E7C82] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#0E7C82]/20 transition hover:-translate-y-0.5"
                >
                  <MdAdd size={19} />
                  Iniciar conversación
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="border-b border-[#E2E8F0] bg-white">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      selectedIdRef.current = null;
                      setSelectedId(null);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[#64748B] hover:bg-[#F1F5F9] md:hidden"
                    aria-label="Volver"
                  >
                    <MdArrowBack size={20} />
                  </button>
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(conversationPhone)}`}
                  >
                    {conversationPhone.slice(-2)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#0F172A]">+{conversationPhone}</p>
                    <p className="flex items-center gap-1 text-[11px] text-[#64748B]">
                      <span className={`h-1.5 w-1.5 rounded-full ${conversationStatus === "CLOSED" ? "bg-[#94A3B8]" : "bg-[#22C55E]"}`} />
                      {getSalesStageMeta(effectiveSalesStage).label}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={openNewChat}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#9BDCDD] bg-white px-3 py-2 text-xs font-semibold text-[#0E7C82] transition hover:bg-[#EFFDFD]"
                    aria-label="Iniciar un nuevo chat"
                  >
                    <MdAdd size={16} />
                    <span className="hidden sm:inline">Nuevo chat</span>
                  </button>
                  <div ref={conversationMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setShowConversationMenu((current) => !current)}
                    aria-label="Más opciones"
                    aria-haspopup="menu"
                    aria-expanded={showConversationMenu}
                    aria-controls="conversation-actions-menu"
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-[#64748B] transition-colors hover:bg-[#F1F5F9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#11AEB4]/50"
                  >
                    <MdMoreVert size={20} />
                  </button>
                  {showConversationMenu ? (
                    <div
                      id="conversation-actions-menu"
                      role="menu"
                      className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-2xl border border-[#DCE5EA] bg-white p-1.5 shadow-xl shadow-[#0F172A]/15"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setActiveTab("INFORMATION");
                          setShowConversationMenu(false);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-[#475569] transition-colors hover:bg-[#F1F5F9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#11AEB4]/40"
                      >
                        <MdPerson size={16} className="text-[#0E7C82]" />
                        Ver información
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setActiveTab("NOTES");
                          setShowConversationMenu(false);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-[#475569] transition-colors hover:bg-[#F1F5F9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#11AEB4]/40"
                      >
                        <MdOutlineDescription size={16} className="text-[#0E7C82]" />
                        Notas internas
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setActiveTab("FILES");
                          setShowConversationMenu(false);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-[#475569] transition-colors hover:bg-[#F1F5F9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#11AEB4]/40"
                      >
                        <MdOutlineAssignment size={16} className="text-[#0E7C82]" />
                        Archivos compartidos
                      </button>
                      <div className="my-1 border-t border-[#F1F5F9]" />
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setShowConversationMenu(false);
                          void openNewChat();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-[#475569] transition-colors hover:bg-[#F1F5F9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#11AEB4]/40"
                      >
                        <MdAdd size={16} className="text-[#0E7C82]" />
                        Enviar plantilla
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setShowConversationMenu(false);
                          void toggleBotPaused();
                        }}
                        disabled={changingBotState}
                        className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#11AEB4]/40 disabled:opacity-50 ${
                          conversationBotPaused
                            ? "text-[#15803D] hover:bg-[#F0FDF4]"
                            : "text-[#B91C1C] hover:bg-[#FEF2F2]"
                        }`}
                      >
                        <MdSmartToy size={16} />
                        {conversationBotPaused ? "Reactivar IA" : "Pausar IA"}
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setShowConversationMenu(false);
                          void createOdooDraft();
                        }}
                        disabled={!selected.orderId || creatingOdooDraft}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-[#475569] transition-colors hover:bg-[#F1F5F9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#11AEB4]/40 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <MdOutlineAssignment size={16} className="text-[#0E7C82]" />
                        {selected.odooOrderId ? "Actualizar estado Odoo" : "Crear borrador en Odoo"}
                      </button>
                    </div>
                  ) : null}
                  </div>
                </div>
              </div>
              <div
                role="tablist"
                aria-label="Secciones de la conversación"
                className="flex gap-5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {CONVERSATION_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setActiveTab(tab.value)}
                    role="tab"
                    id={`conversation-tab-${tab.value.toLowerCase()}`}
                    aria-controls={`conversation-panel-${tab.value.toLowerCase()}`}
                    aria-selected={activeTab === tab.value}
                    className={`shrink-0 border-b-2 py-2.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#11AEB4]/50 ${
                      activeTab === tab.value
                        ? 'border-[#11AEB4] text-[#0E7C82]'
                        : 'border-transparent text-[#94A3B8] hover:text-[#475569]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              </div>

              <div className="relative min-h-0 flex-1">
              <div
                ref={messageViewportRef}
                onScroll={handleChatScroll}
                role="tabpanel"
                id={`conversation-panel-${activeTab.toLowerCase()}`}
                aria-labelledby={`conversation-tab-${activeTab.toLowerCase()}`}
                className="h-full overflow-y-auto overscroll-contain bg-[#F4F7F6] px-4 py-5 sm:px-6"
              >
                {activeTab === "CHAT" ? <div className="mx-auto flex max-w-3xl flex-col gap-3">
                  <div className="mx-auto mb-2 rounded-full bg-[#FEF3C7] px-3 py-1.5 text-[10px] font-medium text-[#92400E] shadow-sm">
                    Los mensajes están protegidos por WhatsApp
                  </div>
                  {messages.map((message) => {
                    const isCustomer = message.role === "USER";
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isCustomer ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm shadow-sm sm:max-w-[70%] ${
                            isCustomer
                              ? "rounded-tl-md bg-white text-[#0F172A]"
                              : message.role === "AGENT"
                                ? "rounded-tr-md bg-[#D9FDD3] text-[#14532D]"
                                : "rounded-tr-md bg-[#CFF5F1] text-[#075E54]"
                          }`}
                        >
                          <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold opacity-65">
                            {message.role === "USER" ? <MdPerson size={12} /> : null}
                            {message.role === "ASSISTANT" ? <MdSmartToy size={12} /> : null}
                            {message.role === "AGENT" ? <MdSupportAgent size={12} /> : null}
                            <span>
                              {message.role === "USER"
                                ? "Cliente"
                                : message.role === "ASSISTANT"
                                  ? "Asistente IA"
                                  : "Kliniu"}{" "}
                              · {formatTime(message.createdAt)}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        </div>
                      </div>
                    );
                  })}
                </div> : null}

                {activeTab === "INFORMATION" ? <div className="mx-auto max-w-xl rounded-2xl bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#64748B]">Información de la conversación</p>
                  <dl className="mt-4 divide-y divide-[#F1F5F9] text-sm">
                    <div className="flex items-center justify-between py-3"><dt className="text-[#64748B]">Contacto</dt><dd className="font-semibold text-[#0F172A]">+{conversationPhone}</dd></div>
                    <div className="flex items-center justify-between py-3"><dt className="text-[#64748B]">Etapa</dt><dd className={`rounded-full px-2.5 py-1 text-xs font-bold ${getSalesStageMeta(effectiveSalesStage).className}`}>{getSalesStageMeta(effectiveSalesStage).label}</dd></div>
                    <div className="flex items-center justify-between py-3"><dt className="text-[#64748B]">Estado del chat</dt><dd className="font-semibold text-[#475569]">{conversationStatus === "ACTIVE" ? "Abierto" : "Cerrado"}</dd></div>
                    <div className="flex items-center justify-between py-3"><dt className="text-[#64748B]">Pedido</dt><dd className="font-semibold text-[#475569]">{selected.orderId ? "Generado" : "Sin pedido"}</dd></div>
                  </dl>
                </div> : null}

                {activeTab === "HISTORY" ? <div className="mx-auto max-w-3xl space-y-3">
                  {messages.map((message) => <div key={message.id} className="rounded-xl bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-3 text-[11px]"><span className="font-bold text-[#0E7C82]">{message.role === "USER" ? "Cliente" : message.role === "ASSISTANT" ? "Asistente IA" : "Kliniu"}</span><time className="text-[#94A3B8]">{new Date(message.createdAt).toLocaleString("es-CO")}</time></div><p className="mt-2 whitespace-pre-wrap text-sm text-[#475569]">{message.content}</p></div>)}
                </div> : null}

                {activeTab === "NOTES" ? <div className="mx-auto max-w-xl rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm font-bold text-[#0F172A]">Notas internas</p><p className="mt-1 text-xs text-[#64748B]">Solo visibles para el equipo de Kliniu.</p><textarea aria-label="Notas internas de la conversación" name="conversation-notes" autoComplete="off" value={conversationNotes} onChange={(event) => setConversationNotes(event.target.value)} maxLength={2000} rows={8} placeholder="Ej. Cliente interesado en 2 combos para su restaurante…" className="mt-4 w-full resize-none rounded-xl border border-[#DCE5EA] bg-[#F8FAFC] p-3 text-sm outline-none focus:border-[#11AEB4] focus-visible:ring-2 focus-visible:ring-[#11AEB4]/30" /><button type="button" onClick={saveNotes} disabled={savingNotes} className="mt-3 rounded-xl bg-[#0E7C82] px-4 py-2.5 text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#11AEB4]/50 disabled:opacity-50">{savingNotes ? "Guardando…" : "Guardar notas"}</button></div> : null}

                {activeTab === "FILES" ? <div className="mx-auto max-w-xl rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm font-bold text-[#0F172A]">Archivos compartidos</p><div className="mt-4 space-y-3">{messages.some((message) => message.content.includes("Imagen del Combo Premium enviada")) ? <a href="/whatsapp/combo-premium-kliniu.jpg" target="_blank" className="flex items-center gap-3 rounded-xl bg-[#F0FDFA] p-3 text-sm font-semibold text-[#0E7C82]"><MdOutlineDescription size={20} /> Imagen del Combo Premium</a> : null}{messages.some((message) => message.content.includes("Video del Combo Premium enviado")) ? <a href="/whatsapp/combo-premium-kliniu.mp4" target="_blank" className="flex items-center gap-3 rounded-xl bg-[#F0FDFA] p-3 text-sm font-semibold text-[#0E7C82]"><MdOutlineDescription size={20} /> Video del Combo Premium</a> : null}{!messages.some((message) => message.content.includes("Combo Premium enviada") || message.content.includes("Combo Premium enviado")) ? <p className="rounded-xl bg-[#F8FAFC] p-4 text-sm text-[#64748B]">Todavía no se han compartido archivos en esta conversación.</p> : null}</div></div> : null}
              </div>
              {activeTab === "CHAT" && hasNewMessagesBelow ? (
                <button
                  type="button"
                  onClick={() => scrollToLatest("smooth")}
                  className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-[#0E7C82] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-[#0E7C82]/25 transition-colors hover:bg-[#086970] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#11AEB4] focus-visible:ring-offset-2"
                >
                  Ver mensajes nuevos ↓
                </button>
              ) : null}
              </div>

              {activeTab === "CHAT" ? <div className="border-t border-[#DCE5EA] bg-white p-3 sm:px-5">
                {sendError ? (
                  <div className="mx-auto mb-2 flex max-w-3xl items-start gap-2 rounded-xl bg-[#FEF2F2] px-3 py-2 text-xs text-[#B91C1C]">
                    <MdErrorOutline className="mt-0.5 shrink-0" size={16} />
                    <span>{sendError}</span>
                  </div>
                ) : null}
                <div className="mx-auto flex max-w-3xl items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        handleSend();
                      }
                    }}
                    rows={1}
                    maxLength={4096}
                    name="whatsapp-message"
                    aria-label="Mensaje de WhatsApp"
                    autoComplete="off"
                    placeholder="Escribe un mensaje…"
                    className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] px-4 py-3 text-sm outline-none transition focus:border-[#27B1B8] focus:bg-white focus:ring-4 focus:ring-[#27B1B8]/10"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending || !draft.trim()}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0E7C82] text-white shadow-lg shadow-[#0E7C82]/20 transition hover:bg-[#086970] disabled:cursor-not-allowed disabled:opacity-45"
                    aria-label="Enviar mensaje"
                  >
                    <MdSend size={18} />
                  </button>
                </div>
                <p className="mx-auto mt-1.5 max-w-3xl px-1 text-[10px] text-[#94A3B8]">
                  Mensaje libre disponible durante la ventana de atención de 24 horas.
                </p>
              </div> : null}
            </>
          )}
        </section>

        <aside className={`hidden w-[280px] shrink-0 overflow-y-auto border-l border-[#E2E8F0] bg-[#F8FAFC] p-3 xl:block ${selected ? '' : 'opacity-50'}`}>
          {selected ? (
            <div className="space-y-3">
              <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#64748B]">Contacto</p>
                <div className="mt-3 flex items-center gap-2.5">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(conversationPhone)}`}>
                    {conversationPhone.slice(-2)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#0F172A]">+{conversationPhone}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-[#16A34A]"><MdWhatsapp size={12} /> WhatsApp</p>
                  </div>
                </div>
                <dl className="mt-4 space-y-2 border-t border-[#F1F5F9] pt-3 text-[11px]">
                  <div className="space-y-1.5"><dt className="text-[#94A3B8]">Etapa comercial</dt><dd><select aria-label="Etapa comercial" value={effectiveSalesStage} onChange={(event) => handleStageChange(event.target.value as SalesStage)} disabled={changingStage || Boolean(selected.orderId)} className="w-full rounded-lg border border-[#DCE5EA] bg-[#F8FAFC] px-2 py-1.5 text-[11px] font-semibold text-[#334155] outline-none focus:border-[#11AEB4] focus-visible:ring-2 focus-visible:ring-[#11AEB4]/30 disabled:cursor-not-allowed disabled:opacity-60"><option value="NEW">Nuevo</option><option value="IN_PROGRESS">En conversación</option><option value="SOLD">Vendido</option></select>{selected.orderId ? <p className="mt-1 text-[9px] text-[#16A34A]">Etapa bloqueada por pedido generado.</p> : null}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-[#94A3B8]">Chat</dt><dd className="font-semibold text-[#475569]">{conversationStatus === 'ACTIVE' ? 'Abierto' : 'Cerrado'}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-[#94A3B8]">Origen</dt><dd className="font-medium text-[#475569]">WhatsApp</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-[#94A3B8]">Última actividad</dt><dd className="font-medium text-[#475569]">{selected.lastMessage ? formatRelative(selected.lastMessage.createdAt) : 'Sin actividad'}</dd></div>
                </dl>
              </section>

              <section className="rounded-2xl border border-[#E2E8F0] bg-white p-3 shadow-sm">
                <p className="px-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#64748B]">Herramientas</p>
                <div className="mt-2 divide-y divide-[#F1F5F9]">
                  <button type="button" onClick={openNewChat} className="flex w-full items-center gap-2.5 px-1 py-3 text-left text-xs font-medium text-[#475569] transition hover:text-[#0E7C82]"><MdOutlineDescription size={16} className="text-[#0E7C82]" /> Enviar plantilla</button>
                  <button type="button" onClick={toggleBotPaused} disabled={changingBotState} className={`flex w-full items-center gap-2.5 px-1 py-3 text-left text-xs font-semibold transition disabled:opacity-50 ${conversationBotPaused ? "text-[#15803D] hover:text-[#166534]" : "text-[#B91C1C] hover:text-[#991B1B]"}`}><MdSmartToy size={16} /> {changingBotState ? "Actualizando…" : conversationBotPaused ? "Reactivar IA" : "Pausar IA"}</button>
                  <button type="button" onClick={createOdooDraft} disabled={!selected.orderId || creatingOdooDraft} className="flex w-full items-center gap-2.5 px-1 py-3 text-left text-xs font-medium text-[#475569] transition hover:text-[#0E7C82] disabled:cursor-not-allowed disabled:opacity-45"><MdOutlineAssignment size={16} className="text-[#0E7C82]" /> {creatingOdooDraft ? 'Creando borrador…' : 'Crear borrador en Odoo'}</button>
                </div>
              </section>

              <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#64748B]">Conversación</p>
                <div className="mt-3 rounded-xl bg-[#F8FAFC] p-3">
                  <p className="text-[11px] font-semibold text-[#334155]">{selected.orderId ? 'Pedido vinculado' : 'Sin pedido vinculado'}</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-[#64748B]">{selectedOdooStatusText}</p>
                  {odooNotice ? <p className="mt-2 rounded-lg bg-[#EFFDFD] px-2 py-1.5 text-[10px] font-medium text-[#0E7C82]">{odooNotice}</p> : null}
                </div>
              </section>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-5 text-center">
              <MdPerson size={28} className="text-[#CBD5E1]" />
              <p className="mt-3 text-xs font-semibold text-[#64748B]">Selecciona un contacto</p>
            </div>
          )}
        </aside>
      </div>
      </main>

      {odooNotice ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 right-4 z-[60] max-w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-[#BFE8E6] bg-white px-4 py-3 text-xs font-semibold text-[#0E7C82] shadow-xl shadow-[#0F172A]/15 md:bottom-6"
        >
          {odooNotice}
        </div>
      ) : null}

      {showNewChat ? (
        <NewConversationModal
          templates={templates}
          templatesLoading={templatesLoading}
          templatesError={templatesError}
          onClose={() => setShowNewChat(false)}
          onCreated={handleCreated}
        />
      ) : null}
    </>
  );
}
