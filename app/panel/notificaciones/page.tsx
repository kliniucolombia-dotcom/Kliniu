"use client";

import { useEffect, useMemo, useState } from "react";
import { MdNotificationsNone, MdDoneAll, MdCheck } from "react-icons/md";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";
import { SimpleSelect } from "@/app/panel/_components/simple-select";
import { useNotificationDetail } from "@/app/panel/_components/notification-detail-modal";
import { TYPE_LABEL, notificationIcon, notificationModuleLabel, severityTheme, relativeTime } from "@/lib/notifications/ui";

type Item = {
  id: string;
  type: string;
  category: string;
  title: string;
  detail: string;
  href: string | null;
  severity: string;
  metadata: unknown;
  createdAt: string;
  read: boolean;
};

type Feed = {
  items: Item[];
  unread: number;
  total: number;
  page: number;
  limit: number;
  windowDays: number;
};

export default function NotificacionesPage() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [page, setPage] = useState(1);
  const openDetail = useNotificationDetail();

  const load = async (p = page) => {
    const params = new URLSearchParams({ limit: "30", page: String(p) });
    if (typeFilter) params.set("type", typeFilter);
    if (onlyUnread) params.set("unread", "true");

    const res = await fetch(`/api/panel/notifications?${params}`);
    if (res.ok) setFeed(await res.json());
    else setError("No fue posible cargar las notificaciones");
    setLoading(false);
  };

  useEffect(() => {
    setPage(1);
    setLoading(true);
    load(1);
  }, [typeFilter, onlyUnread]);

  useEffect(() => {
    if (page > 1) load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useRealtimeRefresh(["notifications"], () => load(1));

  const markRead = async (ids: string[]) => {
    if (ids.length === 0) return;
    setSaving(true);
    // Optimistic update
    setFeed((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((i) => (ids.includes(i.id) ? { ...i, read: true } : i)),
            unread: prev.items.filter((i) => !i.read && !ids.includes(i.id)).length,
          }
        : prev
    );
    const res = await fetch("/api/panel/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) {
      setError("No fue posible marcar como leídas");
      await load();
    }
    setSaving(false);
  };

  const markAllRead = async () => {
    setSaving(true);
    setFeed((prev) =>
      prev
        ? { ...prev, items: prev.items.map((i) => ({ ...i, read: true })), unread: 0 }
        : prev
    );
    const res = await fetch("/api/panel/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    if (!res.ok) {
      setError("No fue posible marcar como leídas");
      await load();
    }
    setSaving(false);
  };

  const seedTest = async () => {
    setSeeding(true);
    const res = await fetch("/api/panel/notifications/seed", { method: "POST" });
    if (res.ok) {
      await load(1);
    } else {
      setError("No se pudieron crear notificaciones de prueba");
    }
    setSeeding(false);
  };

  const filtered = useMemo(() => feed?.items ?? [], [feed]);

  if (loading) return <div className="p-6 text-sm text-[#64748B]">Cargando…</div>;

  const unread = feed?.unread ?? 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-[#1A1A1A]">Notificaciones</h1>
          <p className="text-xs text-[#64748B]">
            Actividad del panel de los últimos {feed?.windowDays ?? 60} días.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={seedTest}
            disabled={seeding}
            className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40"
          >
            {seeding ? "Creando…" : "Generar notificaciones de prueba"}
          </button>
          <button
            onClick={markAllRead}
            disabled={saving || unread === 0}
            className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40"
          >
            <MdDoneAll size={16} /> Marcar todo como leído
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-2 rounded-full bg-[#E6FAFB] px-4 py-2 text-sm">
          <MdNotificationsNone size={16} className="text-[#27B1B8]" />
          <span className="font-bold text-[#0C8A90]">{unread}</span>
          <span className="text-[#0C8A90]">sin leer</span>
        </span>
        <SimpleSelect
          value={typeFilter}
          onChange={(v) => { setTypeFilter(v); setPage(1); }}
          options={[
            { value: "", label: "Tipo: Todos" },
            ...Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label })),
          ]}
        />
        <button
          onClick={() => setOnlyUnread((v) => !v)}
          className={`rounded-lg border px-3 py-2 text-sm font-bold ${
            onlyUnread
              ? "border-[#27B1B8] bg-[#F0FDFF] text-[#27B1B8]"
              : "border-[#E2E8F0] bg-white text-[#64748B]"
          }`}
        >
          Solo sin leer
        </button>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {filtered.map((item) => {
          const Icon = notificationIcon(item.type);
          const theme = severityTheme(item.severity);
          return (
            <div
              key={item.id}
              className={`flex flex-wrap items-start gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:flex-nowrap sm:items-center ${item.read ? "" : "bg-[#FAFEFF]"}`}
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${theme.icon}`}>
                <Icon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`shrink-0 h-2 w-2 rounded-full ${theme.dot}`} />
                  <p className="min-w-0 text-sm font-bold text-[#1A1A1A]">{item.title}</p>
                </div>
                <p className="mt-0.5 text-xs text-[#64748B]">{item.detail}</p>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${theme.pill}`}>
                {notificationModuleLabel(item.type)}
              </span>
              <span className="shrink-0 text-[11px] text-[#94A3B8]">{relativeTime(item.createdAt)}</span>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => {
                    if (!item.read) markRead([item.id]);
                    openDetail(item);
                  }}
                  className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-bold text-[#1A1A1A] hover:bg-[#F8FAFC]"
                >
                  Ver
                </button>
                {!item.read ? (
                  <button
                    onClick={() => markRead([item.id])}
                    disabled={saving}
                    className="flex items-center gap-1 rounded-lg bg-[#27B1B8] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1F9CA3] disabled:opacity-40"
                  >
                    <MdCheck size={14} /> Marcar leída
                  </button>
                ) : (
                  <span className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#94A3B8]">
                    <MdCheck size={14} /> Leída
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="rounded-xl border border-[#E2E8F0] bg-white p-6 text-sm text-[#94A3B8]">
            {feed && feed.total === 0
              ? `Sin notificaciones en los últimos ${feed.windowDays} días.`
              : "No hay notificaciones con estos filtros."}
          </p>
        )}
      </div>

      {/* Paginación */}
      {feed && feed.total > feed.limit && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-xs text-[#94A3B8]">
            Página {page} de {Math.ceil(feed.total / feed.limit)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(feed.total / feed.limit)}
            className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
