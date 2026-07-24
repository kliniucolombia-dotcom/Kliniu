"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { MdClose, MdPhone, MdWhatsapp, MdPlace } from "react-icons/md";

export type Pais = {
  bandera: string;
  nombre: string;
  direccion: string;
  contacto: string;
  telefono: string;
  wa: string;
  nota?: string;
};

export default function CountryCards({ paises }: { paises: Pais[] }) {
  const [activo, setActivo] = useState<Pais | null>(null);
  const [montado, setMontado] = useState(false);

  useEffect(() => setMontado(true), []);

  useEffect(() => {
    if (!activo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActivo(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [activo]);

  return (
    <>
      <div className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-4">
        {paises.map((p) => (
          <button
            key={p.nombre}
            type="button"
            onClick={() => setActivo(p)}
            aria-label={`Ver teléfono de ${p.nombre.replace(/\n/g, " ")}`}
            className="interactive-lift flex min-h-[188px] w-[232px] min-w-[232px] items-center gap-4 rounded-xl border border-black/10 bg-white px-5 py-5 text-left shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#27B1B8] sm:w-auto sm:min-w-0"
          >
            <div className="shrink-0">
              <Image
                src={p.bandera}
                alt={`Bandera ${p.nombre.replace(/\n/g, " ")}`}
                width={72}
                height={72}
                className="h-[72px] w-[72px] rounded-full object-cover shadow-sm"
              />
            </div>
            <div className="flex min-w-0 flex-col">
              <p className="whitespace-pre-line text-[15px] font-black leading-tight text-black">
                {p.nombre}
              </p>
              <p className="mt-1.5 whitespace-pre-line text-[11px] leading-[1.4] text-gray-600">
                {p.direccion}
              </p>
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#0C535B]">
                <MdPhone className="h-3.5 w-3.5" />
                Ver teléfono
              </span>
            </div>
          </button>
        ))}
      </div>

      {montado && activo
        ? createPortal(
            <div
              className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4"
              onClick={() => setActivo(null)}
              role="dialog"
              aria-modal="true"
            >
              <div
                className="relative w-full max-w-[380px] rounded-2xl bg-white p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setActivo(null)}
                  aria-label="Cerrar"
                  className="absolute right-3 top-3 rounded-full p-1.5 text-gray-500 transition-colors hover:bg-black/5 hover:text-black"
                >
                  <MdClose className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-4">
                  <Image
                    src={activo.bandera}
                    alt=""
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-full object-cover shadow-sm"
                  />
                  <div>
                    <p className="whitespace-pre-line text-[18px] font-black leading-tight text-black">
                      {activo.nombre}
                    </p>
                    <p className="mt-0.5 text-[13px] font-semibold text-[#0C535B]">
                      {activo.contacto}
                    </p>
                  </div>
                </div>

                <p className="mt-4 flex items-start gap-2 whitespace-pre-line text-[12px] leading-[1.45] text-gray-600">
                  <MdPlace className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  {activo.direccion}
                </p>

                {activo.nota ? (
                  <p className="mt-3 rounded-lg bg-[#F2FAFA] px-3 py-2 text-[12px] leading-[1.45] text-[#0C535B]">
                    {activo.nota}
                  </p>
                ) : null}

                <p className="mt-4 text-[20px] font-black tracking-tight text-black">
                  {activo.telefono}
                </p>

                <div className="mt-4 flex gap-2">
                  <a
                    href={`tel:${activo.telefono.replace(/[^\d+]/g, "")}`}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-black/10 px-4 py-2.5 text-[13px] font-bold text-black transition-colors hover:bg-black/5"
                  >
                    <MdPhone className="h-4 w-4" />
                    Llamar
                  </a>
                  <a
                    href={activo.wa}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#27B1B8] px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#0C535B]"
                  >
                    <MdWhatsapp className="h-4 w-4" />
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
