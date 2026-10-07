"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { MdCheckCircle, MdErrorOutline, MdMarkEmailUnread } from "react-icons/md";

// Aviso suave: recuerda confirmar el correo, pero no bloquea ninguna función.
export default function EmailVerifyBanner({ email, verified }: { email: string; verified: boolean }) {
  const result = useSearchParams().get("verificado");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState("");

  if (verified) {
    if (result !== "1") return null;
    return (
      <div role="status" className="mb-6 flex items-center gap-3 rounded-2xl border border-[#27B1B8]/25 bg-[#EAF8F6] px-4 py-3 text-sm font-medium text-[#0C535B]">
        <MdCheckCircle size={20} className="shrink-0 text-[#27B1B8]" />
        Tu correo quedó confirmado. Gracias.
      </div>
    );
  }

  const resend = async () => {
    setSending(true);
    setFeedback("");
    try {
      const response = await fetch("/api/auth/verify-email", { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
      setFeedback(payload.message || payload.error || "No fue posible reenviar el enlace.");
    } catch {
      setFeedback("No fue posible reenviar el enlace.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div role="status" className="mb-6 flex flex-col gap-3 rounded-2xl border border-[#f0d9a8] bg-[#fff8e8] px-4 py-3 text-sm text-[#5b4a1e] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {result === "0" ? (
          <MdErrorOutline size={20} className="mt-0.5 shrink-0" />
        ) : (
          <MdMarkEmailUnread size={20} className="mt-0.5 shrink-0" />
        )}
        <div className="min-w-0">
          <p className="font-semibold">
            {result === "0" ? "El enlace expiró o no es válido" : "Confirma tu correo"}
          </p>
          <p className="break-words">
            {feedback || `Te enviamos un enlace a ${email}. Puedes seguir comprando mientras tanto.`}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={resend}
        disabled={sending}
        className="shrink-0 rounded-xl bg-[#0C535B] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
      >
        {sending ? "Enviando..." : "Reenviar enlace"}
      </button>
    </div>
  );
}
