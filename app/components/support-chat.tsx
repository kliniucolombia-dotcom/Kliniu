"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type ReactNode, Fragment } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { MdChatBubbleOutline, MdChevronRight, MdClose } from "react-icons/md";
import { fbContact } from "@/lib/fbpixel";
import { pickAdvisor } from "@/lib/advisors";

function renderMarkdown(text: string): ReactNode {
  return text.split("\n").map((line, li) => {
    const parts: ReactNode[] = [];
    const regex = /\*\*(.*?)\*\*|\[(.*?)\]\((.*?)\)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(line)) !== null) {
      if (m.index > last) parts.push(line.slice(last, m.index));
      if (m[1] !== undefined) {
        parts.push(<strong key={m.index}>{m[1]}</strong>);
      } else if (m[2] !== undefined) {
        const href = m[3] ?? "#";
        const isInternal = href.startsWith("/") || href.includes("kliniu.com");
        const path = isInternal ? href.replace(/^https?:\/\/[^/]+/, "") : href;
        parts.push(isInternal
          ? <Link key={m.index} href={path} className="text-[#27B1B8] underline">{m[2]}</Link>
          : <a key={m.index} href={href} target="_blank" rel="noopener noreferrer" className="text-[#27B1B8] underline">{m[2]}</a>
        );
      }
      last = regex.lastIndex;
    }
    if (last < line.length) parts.push(line.slice(last));
    return <Fragment key={li}>{li > 0 && <br />}{parts}</Fragment>;
  });
}

type ChatSuggestion = {
  label: string;
  href?: string;
  action?: string;
};

type ChatProductCard = {
  slug: string;
  nombre: string;
  precio: string;
  imagen: string;
  href: string;
};

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  suggestions?: ChatSuggestion[];
  products?: ChatProductCard[];
};


const initialMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "¡Hola! Soy tu asesor personal de Kliniu 👋\n\nCuéntame un poco sobre tu espacio: ¿qué tipo de lugar es? (hotel, restaurante, oficina, clínica…) y cuántas personas lo usan al día.\n\nCon eso te recomiendo exactamente qué dispensadores y productos necesitas.",
};

const CHAT_STORAGE_KEY = "kliniu:chat-history";
const WHATSAPP_TEXT = encodeURIComponent("Hola, tengo una consulta sobre un producto de Kliniu");

function loadStoredMessages(): ChatMessage[] {
  if (typeof window === "undefined") return [initialMessage];
  try {
    const raw = window.sessionStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [initialMessage];
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [initialMessage];
  } catch {
    return [initialMessage];
  }
}

export default function SupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [sellerContact, setSellerContact] = useState<{ phone: string; name: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const firstOptionRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setMessages(loadStoredMessages());
  }, []);

  // La burbuja de bienvenida se oculta sola a los 5 segundos.
  useEffect(() => {
    const timer = window.setTimeout(() => setShowHint(false), 5000);
    return () => window.clearTimeout(timer);
  }, []);

  // Cierra al hacer clic fuera del widget.
  useEffect(() => {
    if (!isMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsMenuOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isMenuOpen]);

  // Escape cierra el menú (o el chat si está abierto).
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (isMenuOpen) {
        setIsMenuOpen(false);
      } else if (isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen, isOpen]);

  // Al abrir el menú, lleva el foco a la primera opción; al cerrar, de vuelta al botón.
  useEffect(() => {
    if (isMenuOpen) {
      firstOptionRef.current?.focus();
    } else if (rootRef.current?.contains(document.activeElement)) {
      triggerRef.current?.focus();
    }
  }, [isMenuOpen]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  useEffect(() => {
    fetch("/api/seller/contact")
      .then((r) => r.json())
      .then((d: { phone: string; name: string }) => setSellerContact(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const sendMessage = async (content: string) => {
    const text = content.trim();

    if (!text || isSending) return;

    const nextUserMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };

    const nextMessages = [...messages, nextUserMessage];
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);
    setRequestError("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          shownProductSlugs: messages
            .flatMap((message) => message.products ?? [])
            .map((product) => product.slug),
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        message?: string;
        mode?: "openai" | "local";
        suggestions?: ChatSuggestion[];
        products?: ChatProductCard[];
      };

      if (!response.ok || !payload.message) {
        setRequestError(payload.error || "No fue posible responder.");
        return;
      }

      const assistantReply = payload.message;

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: assistantReply,
          suggestions: payload.suggestions,
          products: payload.products,
        },
      ]);
    } catch {
      setRequestError("No fue posible responder.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendMessage(input);
  };

  const handleWhatsApp = () => {
    setIsMenuOpen(false);
    fbContact();
    const { phone } = pickAdvisor();
    window.open(`https://wa.me/${phone}?text=${WHATSAPP_TEXT}`, "_blank", "noopener,noreferrer");
  };

  const handleOpenChat = () => {
    setIsMenuOpen(false);
    setIsOpen(true);
  };

  const handleTrigger = () => {
    if (isOpen) {
      setIsOpen(false);
      setIsMenuOpen(false);
      return;
    }
    setShowHint(false);
    setIsMenuOpen((current) => !current);
  };

  useEffect(() => {
    const handleOpenAdvisor = () => {
      setMessages([initialMessage]);
      setInput("");
      setRequestError("");
      setIsMenuOpen(false);
      setShowHint(false);
      setIsOpen(true);
    };

    window.addEventListener("kliniu:open-advisor", handleOpenAdvisor);
    return () => window.removeEventListener("kliniu:open-advisor", handleOpenAdvisor);
  }, []);

  useEffect(() => {
    const handleVisualSearchToggle = (event: Event) => {
      const customEvent = event as CustomEvent<{ isOpen: boolean }>;
      const nextState = Boolean(customEvent.detail?.isOpen);
      setIsVisualSearchOpen(nextState);

      if (nextState) {
        setIsMenuOpen(false);
        setIsOpen(false);
      }
    };

    window.addEventListener("kliniu:visual-search-toggle", handleVisualSearchToggle);

    return () => {
      window.removeEventListener("kliniu:visual-search-toggle", handleVisualSearchToggle);
    };
  }, []);

  if (isVisualSearchOpen) {
    return null;
  }

  return (
    <div
      ref={rootRef}
      className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] sm:right-6 sm:bottom-6 z-[100] flex flex-col items-end gap-3"
    >
      {isOpen && (
        <div className="w-[min(92vw,380px)] overflow-hidden rounded-[1.6rem] border border-black/10 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
          <div className="bg-white px-4 py-4 text-[#0C535B]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="relative h-16 w-14 shrink-0">
                  <Image
                    src="/foca-saludando.webp"
                    alt="Kliniu"
                    fill
                    sizes="56px"
                    className="object-contain object-bottom"
                  />
                </div>
                <div className="min-w-0 pt-0.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7f8790]">
                    Asistente Kliniu
                  </p>
                  <h3 className="mt-1 text-[1.55rem] font-semibold leading-[0.95] tracking-[-0.05em] text-[#0C535B]">
                    Habla con Kliniu
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-black/10 bg-[#f8f8f7] px-3 py-1.5 text-xs font-semibold text-[#0C535B] transition-colors duration-200 hover:bg-[#0C535B] hover:text-white"
              >
                Cerrar
              </button>
            </div>
          </div>

          <div className="bg-[#fbfbfa] px-4 py-4">
            <div className="max-h-[42vh] sm:max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" ? (
                    <div className="flex max-w-[92%] items-start gap-3">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[#0C535B]/10 bg-white shadow-[0_8px_18px_rgba(15,23,42,0.08)]">
                        <Image
                          src="/foca-saludando.webp"
                          alt="Kliniu"
                          fill
                          sizes="40px"
                          className="object-cover p-1"
                        />
                      </div>
                      <div className="rounded-[1.25rem] border border-black/8 bg-white px-4 py-3 text-sm leading-6 text-[#243342] shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#27B1B8]">
                          Kliniu
                        </p>
                        <div className="whitespace-pre-line">{renderMarkdown(message.content)}</div>
                        {message.suggestions && message.suggestions.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {message.suggestions.map((s) =>
                              s.action ? (
                                <button
                                  key={s.action}
                                  type="button"
                                  onClick={() => sendMessage(s.action!)}
                                  className="rounded-full border border-[#27B1B8] bg-white px-3 py-1.5 text-xs font-semibold text-[#0C535B] transition-colors duration-150 hover:bg-[#EAF8F6]"
                                >
                                  {s.label}
                                </button>
                              ) : s.href ? (
                                <Link
                                  key={s.href}
                                  href={s.href}
                                  className="rounded-full border border-[#27B1B8] bg-white px-3 py-1.5 text-xs font-semibold text-[#0C535B] transition-colors duration-150 hover:bg-[#EAF8F6]"
                                >
                                  {s.label}
                                </Link>
                              ) : null
                            )}
                          </div>
                        )}
                        {message.products && message.products.length > 0 && (
                          <div className="mt-3 flex flex-col gap-2">
                            {message.products.map((product) => (
                              <Link
                                key={`${message.id}-${product.slug}`}
                                href={product.href}
                                className="flex items-center gap-3 rounded-xl border border-black/8 bg-[#f6f8fb] p-2 transition-colors duration-200 hover:border-[#27B1B8]/40 hover:bg-[#EAF8F6]"
                              >
                                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white">
                                  <Image
                                    src={product.imagen}
                                    alt={product.nombre}
                                    fill
                                    sizes="56px"
                                    className="object-contain p-1"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold leading-snug text-[#0C535B]">{product.nombre}</p>
                                  <p className="mt-0.5 text-xs font-bold text-[#27B1B8]">{product.precio}</p>
                                </div>
                                <svg className="h-4 w-4 shrink-0 text-[#27B1B8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-[88%] rounded-[1.25rem] bg-[#0C535B] px-4 py-3 text-sm leading-6 text-white shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                      <p className="whitespace-pre-line">{message.content}</p>
                    </div>
                  )}
                </div>
              ))}

              {isSending && (
                <div className="flex justify-start">
                  <div className="rounded-[1.25rem] border border-black/8 bg-white px-4 py-3 text-sm text-[#5d6167] shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                    Escribiendo respuesta...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>


            {requestError && (
              <p className="mt-4 rounded-2xl border border-[#27B1B8]/18 bg-[#EAF8F6] px-4 py-3 text-sm text-[#0C535B]">
                {requestError}
              </p>
            )}

            <form onSubmit={handleSubmit} className="mt-4 flex items-end gap-2">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    if (!isSending && input.trim().length > 0) {
                      void sendMessage(input);
                    }
                  }
                }}
                rows={2}
                placeholder="Cuéntame sobre tu espacio o necesidad..."
                className="min-h-[54px] flex-1 resize-none rounded-[1.2rem] border border-black/10 bg-white px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
              />
              <button
                type="submit"
                disabled={isSending || input.trim().length === 0}
                className="rounded-[1.1rem] bg-[#27B1B8] px-4 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#1E969B] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Enviar
              </button>
            </form>
          </div>
        </div>
      )}

      {isMenuOpen && (
        <div
          id="kliniu-support-menu"
          role="menu"
          aria-label="Opciones de atención al cliente"
          className="flex w-[min(78vw,15rem)] flex-col gap-3 animate-[kliniuMenuIn_220ms_ease-out] motion-reduce:animate-none"
        >
          <button
            ref={firstOptionRef}
            type="button"
            role="menuitem"
            onClick={handleOpenChat}
            className="flex min-h-12 w-full items-center gap-3 rounded-full border border-black/5 bg-white py-2 pl-2 pr-4 text-left shadow-[0_14px_34px_rgba(15,23,42,0.16)] transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#27B1B8] focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0C535B] text-white">
              <MdChatBubbleOutline size={18} />
            </span>
            <span className="text-sm font-semibold text-[#0C535B]">Chat KLINIU</span>
            <MdChevronRight className="ml-auto h-4 w-4 shrink-0 text-[#0C535B]/40" />
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={handleWhatsApp}
            className="flex min-h-12 w-full items-center gap-3 rounded-full border border-black/5 bg-white py-2 pl-2 pr-4 text-left shadow-[0_14px_34px_rgba(15,23,42,0.16)] transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white">
              <FaWhatsapp size={18} />
            </span>
            <span className="text-sm font-semibold text-[#0C535B]">WhatsApp</span>
            <MdChevronRight className="ml-auto h-4 w-4 shrink-0 text-[#0C535B]/40" />
          </button>
        </div>
      )}

      {showHint && !isMenuOpen && !isOpen && (
        <div className="animate-[kliniuMenuIn_220ms_ease-out] motion-reduce:animate-none rounded-2xl rounded-br-md border border-black/5 bg-white px-4 py-2.5 text-sm font-semibold text-[#0C535B] shadow-[0_14px_34px_rgba(15,23,42,0.16)]">
          ¿Necesitas ayuda?
        </div>
      )}

      <button
        ref={triggerRef}
        type="button"
        onClick={handleTrigger}
        aria-label={isMenuOpen || isOpen ? "Cerrar atención al cliente" : "Abrir atención al cliente"}
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        aria-controls="kliniu-support-menu"
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#0C535B] text-white shadow-[0_18px_40px_rgba(12,83,91,0.38)] ring-1 ring-black/5 transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#073D43] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#27B1B8] focus-visible:ring-offset-2 motion-reduce:transition-none"
      >
        {!(isMenuOpen || isOpen) && (
          <span className="absolute right-0.5 top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#43c172]" />
        )}
        {isMenuOpen || isOpen ? (
          <MdClose size={24} />
        ) : (
          <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white">
            <Image
              src="/foca-saludando.webp"
              alt=""
              fill
              sizes="44px"
              className="object-cover p-1"
            />
          </span>
        )}
      </button>
    </div>
  );
}
