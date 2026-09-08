"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MdWarningAmber } from "react-icons/md";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type ConfirmFn = (o: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Reemplaza window.confirm() por un popup propio. Requiere <ConfirmProvider> en el layout. */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm requiere <ConfirmProvider>");
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback(
    (o: ConfirmOptions | string) =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setOpts(typeof o === "string" ? { message: o } : o);
      }),
    [],
  );

  const close = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOpts(null);
  };

  const dialog =
    opts && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => close(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    opts.danger === false ? "bg-[#E6F7F8] text-[#27B1B8]" : "bg-[#FEE2E2] text-[#DC2626]"
                  }`}
                >
                  <MdWarningAmber size={22} />
                </span>
                <div className="min-w-0">
                  <h3 className="font-black text-[#1A1A1A]">{opts.title ?? "Confirmar acción"}</h3>
                  <p className="mt-1 text-sm text-[#64748B]">{opts.message}</p>
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => close(false)}
                  className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]"
                >
                  {opts.cancelLabel ?? "Cancelar"}
                </button>
                <button
                  type="button"
                  autoFocus
                  onClick={() => close(true)}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white hover:opacity-80 ${
                    opts.danger === false ? "bg-[#27B1B8]" : "bg-[#DC2626]"
                  }`}
                >
                  {opts.confirmLabel ?? "Eliminar"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog}
    </ConfirmContext.Provider>
  );
}
