"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { MdNotificationsNone, MdClose } from "react-icons/md";
import { useNotificationCount } from "@/lib/hooks/use-notification-count";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";
import { useNotificationDetail, type NotificationDetailItem } from "@/app/panel/_components/notification-detail-modal";
import { severityTheme } from "@/lib/notifications/ui";

type DropdownItem = NotificationDetailItem;

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

export function NotificationBell() {
  const { count, refresh } = useNotificationCount();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<DropdownItem[]>([]);
  const [loading, setLoading] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; maxHeight: number; top?: number; bottom?: number }>({ left: 0, maxHeight: 420 });
  const openDetail = useNotificationDetail();

  const loadRecent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/panel/notifications?limit=8");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
      }
    } catch {}
    setLoading(false);
  }, []);

  const calcPos = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const ddWidth = 320;
    let left = r.right - ddWidth;
    if (left < 8) left = r.left;
    if (left + ddWidth > window.innerWidth - 8) left = window.innerWidth - ddWidth - 8;
    if (left < 8) left = 8;

    const spaceBelow = window.innerHeight - r.bottom - 16;
    const spaceAbove = r.top - 16;
    const preferBelow = spaceBelow >= 200 || spaceBelow >= spaceAbove;
    const maxHeight = Math.min(420, Math.max(120, preferBelow ? spaceBelow : spaceAbove));
    if (preferBelow) {
      setPos({ top: r.bottom + 8, left, maxHeight });
    } else {
      setPos({ bottom: window.innerHeight - r.top + 8, left, maxHeight });
    }
  }, []);

  const toggleOpen = () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    calcPos();
    loadRecent();
  };

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (dropRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const { markLocalWrite } = useRealtimeRefresh(["notifications"], () => {
    refresh();
    if (open) loadRecent();
  });

  const markRead = async (ids: string[]) => {
    if (ids.length === 0) return;
    markLocalWrite();
    await fetch("/api/panel/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    refresh();
    if (open) loadRecent();
  };

  const dismiss = async (id: string) => {
    markLocalWrite();
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch("/api/panel/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    refresh();
    if (open) loadRecent();
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggleOpen}
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#64748B] transition-colors hover:bg-[#F8FAFC] hover:text-[#1A1A1A]"
        title="Notificaciones"
      >
        <MdNotificationsNone size={18} />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#EF4444] px-1 text-[9px] font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>
      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[199]" onMouseDown={() => setOpen(false)} />
            <div
              ref={dropRef}
              className="fixed z-[200] flex w-80 flex-col overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-2xl"
              style={{ top: pos.top, bottom: pos.bottom, left: pos.left, maxHeight: pos.maxHeight + 44 }}
            >
              <div className="flex items-center justify-between border-b border-[#F1F5F9] px-4 py-3">
                <p className="text-xs font-bold text-[#1A1A1A]">Notificaciones</p>
                {count > 0 && (
                  <button
                    onClick={() => markRead(items.filter((i) => !i.read).map((i) => i.id))}
                    className="text-[11px] font-semibold text-[#27B1B8] hover:underline"
                  >
                    Marcar todo leído
                  </button>
                )}
              </div>

              <div className="overflow-y-auto" style={{ maxHeight: pos.maxHeight }}>
                {loading && items.length === 0 && (
                  <p className="p-4 text-center text-xs text-[#94A3B8]">Cargando…</p>
                )}
                {!loading && items.length === 0 && (
                  <p className="p-4 text-center text-xs text-[#94A3B8]">Sin notificaciones recientes</p>
                )}
                {items.map((item) => (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setOpen(false);
                      if (!item.read) markRead([item.id]);
                      openDetail(item);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setOpen(false);
                        if (!item.read) markRead([item.id]);
                        openDetail(item);
                      }
                    }}
                    className={`group flex w-full cursor-pointer items-start gap-3 border-b border-[#F1F5F9] px-4 py-3 text-left transition-colors hover:bg-[#F8FAFC] ${item.read ? "" : "bg-[#F0FDFF]"}`}
                  >
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${severityTheme(item.severity).dot}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold leading-tight ${item.read ? "text-[#64748B]" : "text-[#1A1A1A]"}`}>
                        {item.title}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-[#94A3B8]">{item.detail}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-[10px] text-[#94A3B8]">{relativeTime(item.createdAt)}</span>
                      <button
                        type="button"
                        title="Eliminar notificación"
                        onClick={(e) => {
                          e.stopPropagation();
                          dismiss(item.id);
                        }}
                        className="rounded p-0.5 text-[#CBD5E1] transition-colors hover:bg-[#FEF2F2] hover:text-[#DC2626]"
                      >
                        <MdClose size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href="/panel/notificaciones"
                onClick={() => setOpen(false)}
                className="block border-t border-[#F1F5F9] px-4 py-2.5 text-center text-[11px] font-bold text-[#27B1B8] hover:bg-[#F8FAFC]"
              >
                Ver todas
              </Link>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
