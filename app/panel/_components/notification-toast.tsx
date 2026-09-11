"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { MdNotificationsNone, MdClose } from "react-icons/md";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";

type ToastItem = {
  id: string;
  title: string;
  detail: string;
  href: string | null;
  severity: string;
  read: boolean;
  createdAt: string;
};

const SEVERITY_BORDER: Record<string, string> = {
  info: "border-l-[#27B1B8]",
  warning: "border-l-[#F59E0B]",
  urgent: "border-l-[#EF4444]",
};

export function NotificationToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const checkNew = useCallback(async () => {
    try {
      const res = await fetch("/api/panel/notifications?limit=3&unread=true");
      if (!res.ok) return;
      const data = await res.json();
      const items: ToastItem[] = data.items ?? [];

      // Solo mostrar toast si hay no-leídas y no hay toasts activos
      if (items.length > 0 && toasts.length === 0) {
        const latest = items[0];
        if (!latest.read) {
          setToasts([latest]);
          // Auto-dismiss después de 5s (excepto urgent)
          if (latest.severity !== "urgent") {
            setTimeout(() => {
              setToasts((prev) => prev.filter((t) => t.id !== latest.id));
            }, 5000);
          }
        }
      }
    } catch {}
  }, [toasts.length]);

  // Real-time: mostrar toast cuando llega notificación nueva
  useRealtimeRefresh(["notifications"], checkNew);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[90] flex flex-col gap-2 md:bottom-6 md:right-6">
      {toasts.map((toast) => (
        <Link
          key={toast.id}
          href={toast.href ?? "/panel/notificaciones"}
          onClick={() => dismiss(toast.id)}
          className={`flex w-80 items-start gap-3 rounded-xl border border-[#E2E8F0] border-l-4 bg-white p-3 shadow-lg transition-all hover:shadow-xl ${SEVERITY_BORDER[toast.severity] ?? SEVERITY_BORDER.info}`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E6FAFB] text-[#27B1B8]">
            <MdNotificationsNone size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[#1A1A1A] leading-tight">{toast.title}</p>
            <p className="mt-0.5 truncate text-[11px] text-[#94A3B8]">{toast.detail}</p>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dismiss(toast.id);
            }}
            className="shrink-0 text-[#94A3B8] hover:text-[#64748B]"
          >
            <MdClose size={14} />
          </button>
        </Link>
      ))}
    </div>
  );
}
