"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  MdNotificationsNone, MdBeachAccess, MdAccessTime, MdCardGiftcard,
  MdDescription, MdSupportAgent, MdCampaign, MdDoneAll, MdCircle,
} from "react-icons/md";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";
import { SimpleSelect } from "@/app/panel/_components/simple-select";

type Item = {
  key: string;
  type: "timeoff" | "overtime" | "benefit" | "certificate" | "ticket" | "announcement";
  title: string;
  detail: string;
  createdAt: string;
  href: string;
  read: boolean;
};

type Feed = { items: Item[]; unread: number; windowDays: number };

const TYPE_ICON: Record<Item["type"], React.ElementType> = {
  timeoff: MdBeachAccess,
  overtime: MdAccessTime,
  benefit: MdCardGiftcard,
  certificate: MdDescription,
  ticket: MdSupportAgent,
  announcement: MdCampaign,
};

const TYPE_LABEL: Record<Item["type"], string> = {
  timeoff: "Ausencias",
  overtime: "Horas extra",
  benefit: "Beneficios",
  certificate: "Certificados",
  ticket: "Tickets",
  announcement: "Comunicados",
};

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Hace un momento";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Ayer";
  if (days < 30) return `Hace ${days} días`;
  return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function NotificacionesPanelPage() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch("/api/rrhh-local/notificaciones");
    if (res.ok) setFeed(await res.json());
    else setError("No fue posible cargar las notificaciones");
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useRealtimeRefresh(["timeoff", "tickets", "notifications"], load);

  const markRead = async (keys: string[]) => {
    if (keys.length === 0) return;
    setSaving(true);
    setFeed((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((i) => (keys.includes(i.key) ? { ...i, read: true } : i)),
            unread: prev.items.filter((i) => !i.read && !keys.includes(i.key)).length,
          }
        : prev,
    );
    const res = await fetch("/api/rrhh-local/notificaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keys }),
    });
    if (!res.ok) {
      setError("No fue posible marcar como leídas");
      await load();
    }
    setSaving(false);
  };

  const filtered = useMemo(() => {
    if (!feed) return [];
    return feed.items.filter((i) => {
      if (typeFilter && i.type !== typeFilter) return false;
      if (onlyUnread && i.read) return false;
      return true;
    });
  }, [feed, typeFilter, onlyUnread]);

  if (loading) return <div className="p-6 text-sm text-[#64748B]">Cargando…</div>;

  const unread = feed?.unread ?? 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-[#1A1A1A]">Notificaciones</h1>
          <p className="text-xs text-[#64748B]">
            Actividad de RRHH de los últimos {feed?.windowDays ?? 60} días: solicitudes, tickets y comunicados.
          </p>
        </div>
        <button
          onClick={() => markRead(filtered.filter((i) => !i.read).map((i) => i.key))}
          disabled={saving || filtered.every((i) => i.read)}
          className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40"
        >
          <MdDoneAll size={16} /> Marcar todo como leído
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm">
          <MdNotificationsNone size={16} className="text-[#27B1B8]" />
          <span className="font-bold text-[#1A1A1A]">{unread}</span>
          <span className="text-[#64748B]">sin leer</span>
        </span>
        <SimpleSelect
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: "", label: "Tipo: Todos" },
            ...Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label })),
          ]}
        />
        <button
          onClick={() => setOnlyUnread((v) => !v)}
          className={`rounded-lg border px-3 py-2 text-sm font-bold ${
            onlyUnread ? "border-[#27B1B8] bg-[#F0FDFF] text-[#27B1B8]" : "border-[#E2E8F0] bg-white text-[#64748B]"
          }`}
        >
          Solo sin leer
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
        {filtered.map((item) => {
          const Icon = TYPE_ICON[item.type];
          return (
            <div
              key={item.key}
              className={`flex items-start gap-3 border-b border-[#F1F5F9] p-4 last:border-0 ${item.read ? "" : "bg-[#F0FDFF]"}`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E6FAFB] text-[#27B1B8]">
                <Icon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {!item.read && <MdCircle size={8} className="shrink-0 text-[#27B1B8]" />}
                  <p className="min-w-0 truncate text-sm font-bold text-[#1A1A1A]">{item.title}</p>
                </div>
                <p className="truncate text-xs text-[#64748B]">{item.detail}</p>
                <p className="mt-0.5 text-[11px] text-[#94A3B8]">
                  {TYPE_LABEL[item.type]} · {relativeTime(item.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link href={item.href} className="text-xs font-bold text-[#27B1B8] hover:underline">
                  Ver
                </Link>
                {!item.read && (
                  <button
                    onClick={() => markRead([item.key])}
                    disabled={saving}
                    className="text-xs font-bold text-[#64748B] hover:underline disabled:opacity-40"
                  >
                    Marcar leída
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="p-6 text-sm text-[#94A3B8]">
            {feed && feed.items.length === 0
              ? `Sin actividad de RRHH en los últimos ${feed.windowDays} días.`
              : "No hay notificaciones con estos filtros."}
          </p>
        )}
      </div>
    </div>
  );
}
