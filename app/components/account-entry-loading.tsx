"use client";

import Image from "next/image";

type AccountEntryLoadingProps = {
  message?: string;
  detail?: string;
};

export default function AccountEntryLoading({
  message = "Entrando a tu cuenta",
  detail = "Estamos preparando tu espacio.",
}: AccountEntryLoadingProps) {
  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-white px-6">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <div className="relative flex h-[220px] w-[220px] items-center justify-center">
          <div className="absolute h-[220px] w-[220px] rounded-full border-[5px] border-[#0C535B]/10 border-t-[#27B1B8] animate-[spin_1.2s_linear_infinite]" />
          <div className="absolute h-[176px] w-[176px] rounded-full bg-[radial-gradient(circle,_rgba(237,132,53,0.18)_0%,_rgba(237,132,53,0)_70%)] animate-[ping_2.4s_ease-out_infinite]" />
          <div className="relative overflow-hidden rounded-full bg-white shadow-[0_18px_45px_rgba(15,23,42,0.12)] animate-[pulse_1.8s_ease-in-out_infinite]" style={{ width: 176, height: 176 }}>
            <Image
              src="/foca-saliendo-pared.png"
              alt="Foca Kliniu"
              fill
              priority
              className="object-cover object-top"
            />
          </div>
        </div>

        <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.34em] text-[#27B1B8]">
          Kliniu
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#0C535B]">
          {message}
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-500">{detail}</p>
      </div>
    </div>
  );
}
