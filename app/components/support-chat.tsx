"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

type ChatSuggestion = {
  label: string;
  href: string;
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

export default function SupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [sellerContact, setSellerContact] = useState<{ phone: string; name: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    const handleOpenAdvisor = () => {
      setMessages([initialMessage]);
      setInput("");
      setRequestError("");
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
      className="z-[100] flex flex-col items-end gap-3"
      style={{ position: "fixed", right: "1.5rem", bottom: "1.5rem" }}
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
            {sellerContact && (
              <a
                href={`https://wa.me/${sellerContact.phone}?text=Hola%20${encodeURIComponent(sellerContact.name)}%2C%20tengo%20una%20consulta%20sobre%20un%20producto%20de%20Kliniu`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Hablar con {sellerContact.name}
              </a>
            )}
            <div className="mt-3 h-[4px] w-full rounded-full bg-[#D8F1EE]">
              <div className="h-full w-20 rounded-full bg-[#27B1B8]" />
            </div>
          </div>

          <div className="bg-[#fbfbfa] px-4 py-4">
            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
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
                        <p className="whitespace-pre-line">{message.content}</p>
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

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="group relative flex items-center gap-3 rounded-full border border-white/12 bg-[#0C535B] px-4 py-3 text-white shadow-[0_22px_50px_rgba(22,56,79,0.38)] ring-1 ring-black/5 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#073D43]"
      >
        <span className="absolute -left-1 -top-1 h-3 w-3 rounded-full bg-[#43c172] shadow-[0_0_0_6px_rgba(67,193,114,0.18)]" />
        <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white">
          <Image
            src="/foca-saludando.webp"
            alt="Kliniu"
            fill
            sizes="44px"
            className="object-cover p-1"
          />
        </span>
        <span className="text-left">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
            Asistente
          </span>
          <span className="block text-sm font-semibold">Habla con Kliniu</span>
        </span>
        <span className="absolute -inset-1 -z-10 rounded-full bg-[radial-gradient(circle,rgba(237,132,53,0.16),transparent_70%)] opacity-90 blur-md" />
      </button>
    </div>
  );
}
