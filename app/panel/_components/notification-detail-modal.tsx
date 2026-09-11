"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { MdClose } from "react-icons/md";
import { notificationIcon, notificationModuleLabel, severityTheme } from "@/lib/notifications/ui";

export type NotificationDetailItem = {
  id: string;
  type: string;
  title: string;
  detail: string;
  href: string | null;
  severity: string;
  createdAt: string;
  read: boolean;
};

type OpenFn = (item: NotificationDetailItem) => void;

const NotificationDetailContext = createContext<OpenFn | null>(null);

export function useNotificationDetail(): OpenFn {
  const ctx = useContext(NotificationDetailContext);
  if (!ctx) throw new Error("useNotificationDetail requiere <NotificationDetailProvider>");
  return ctx;
}

export function NotificationDetailProvider({ children }: { children: React.ReactNode }) {
  const [item, setItem] = useState<NotificationDetailItem | null>(null);
  const router = useRouter();

  const open = useCallback<OpenFn>((n) => {
    setItem(n);
  }, []);

  const close = () => setItem(null);

  const goTo = () => {
    if (!item?.href) return;
    const href = item.href;
    close();
    router.push(href);
  };

  const modal =
    item && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            onClick={close}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${severityTheme(item.severity).icon}`}>
                    {(() => {
                      const Icon = notificationIcon(item.type);
                      return <Icon size={20} />;
                    })()}
                  </span>
                  <div className="min-w-0">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${severityTheme(item.severity).pill}`}>
                      {notificationModuleLabel(item.type)}
                    </span>
                    <h3 className="mt-1.5 text-base font-black text-[#1A1A1A]">{item.title}</h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="shrink-0 rounded-lg p-1 text-[#94A3B8] hover:bg-[#F8FAFC] hover:text-[#1A1A1A]"
                  aria-label="Cerrar"
                >
                  <MdClose size={18} />
                </button>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-[#334155]">{item.detail}</p>

              <p className="mt-4 text-xs text-[#94A3B8]">
                {new Date(item.createdAt).toLocaleString("es-CO", {
                  day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </p>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={close}
                  className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]"
                >
                  Cerrar
                </button>
                {item.href && (
                  <button
                    type="button"
                    onClick={goTo}
                    className="flex-1 rounded-xl bg-[#27B1B8] py-2.5 text-sm font-bold text-white hover:bg-[#1F9CA3]"
                  >
                    Ir a la sección
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <NotificationDetailContext.Provider value={open}>
      {children}
      {modal}
    </NotificationDetailContext.Provider>
  );
}
