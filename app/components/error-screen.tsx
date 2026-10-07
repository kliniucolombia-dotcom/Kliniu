"use client";

import Image from "next/image";
import { MdHome, MdRefresh } from "react-icons/md";

type ErrorScreenProps = {
  reset: () => void;
  digest?: string;
  homeHref?: string;
  homeLabel?: string;
  compact?: boolean;
};

// Pantalla compartida por los error boundaries (app/error, app/global-error y app/panel/error).
// Usa <a> y no <Link>: tras un error conviene recargar el documento completo.
export default function ErrorScreen({
  reset,
  digest,
  homeHref = "/",
  homeLabel = "Volver al inicio",
  compact = false,
}: ErrorScreenProps) {
  return (
    <div
      role="alert"
      className={`relative flex flex-col items-center justify-center overflow-hidden bg-[#f7fbfb] px-6 py-10 text-center ${
        compact ? "min-h-[70vh] rounded-2xl" : "min-h-screen"
      }`}
    >
      <div className="relative flex max-w-[560px] flex-col items-center gap-2">
        <Image
          src="/foca-pensativa.png"
          alt="Foca pensativa de Kliniu"
          width={compact ? 150 : 200}
          height={compact ? 150 : 200}
          className="h-auto drop-shadow-[0_18px_30px_rgba(12,83,91,0.2)]"
          style={{ width: compact ? 150 : 200 }}
        />

        <h1 className="mt-3 text-[26px] font-bold text-[#0C535B]">Algo salió mal</h1>

        <p className="mx-auto mb-6 mt-2 max-w-[420px] text-base leading-relaxed text-[#2f3d49]">
          Tuvimos un problema al cargar esta página. Ya quedó registrado; intenta de nuevo en unos segundos.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0C535B] px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_24px_rgba(12,83,91,0.25)]"
          >
            <MdRefresh size={18} />
            Reintentar
          </button>
          <a
            href={homeHref}
            className="inline-flex items-center gap-2 rounded-xl border border-[#e2e8e8] bg-white px-6 py-3.5 text-[15px] font-semibold text-[#0C535B]"
          >
            <MdHome size={18} />
            {homeLabel}
          </a>
        </div>

        {digest && <p className="mt-5 text-xs text-[#8a959c]">Código de referencia: {digest}</p>}
      </div>
    </div>
  );
}
