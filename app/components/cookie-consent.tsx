"use client";

import { useEffect, useState } from "react";
import { MdCookie } from "react-icons/md";
import GoogleTags from "./google-tags";
import MetaPixel from "./meta-pixel";

const STORAGE_KEY = "kliniu_cookie_consent";

type Consent = "accepted" | "rejected" | null;

export default function CookieConsent({ nonce }: { nonce?: string }) {
  const [consent, setConsent] = useState<Consent>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "accepted" || stored === "rejected") setConsent(stored);
    setReady(true);
  }, []);

  const choose = (value: "accepted" | "rejected") => {
    window.localStorage.setItem(STORAGE_KEY, value);
    setConsent(value);
  };

  return (
    <>
      {consent === "accepted" && <GoogleTags nonce={nonce} />}
      {consent === "accepted" && <MetaPixel nonce={nonce} />}
      {ready && consent === null && (
        <div className="fixed inset-x-0 bottom-0 z-[70] flex justify-center px-4 pb-4">
          <div className="flex w-full max-w-xl flex-col gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] sm:flex-row sm:items-center">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E8FAFB] text-[#27B1B8]">
              <MdCookie size={20} />
            </span>
            <p className="flex-1 text-sm text-[#475569]">
              Usamos cookies para analítica y publicidad. Puedes aceptarlas o rechazarlas.{" "}
              <a
                href="/politicas/cookies"
                className="font-bold text-[#0C535B] underline underline-offset-2"
              >
                Ver política de cookies
              </a>
              .
            </p>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => choose("rejected")}
                className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-[#F1F5F9]"
              >
                Rechazar
              </button>
              <button
                onClick={() => choose("accepted")}
                className="rounded-lg bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white hover:bg-[#1F979D]"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
