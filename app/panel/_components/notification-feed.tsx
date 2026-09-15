"use client";

import { createElement, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MdDoneAll, MdSearch, MdClose, MdInbox,
  MdMarkEmailUnread, MdPriorityHigh, MdMoreVert, MdArrowForward,
  MdAccessTime, MdCheck, MdOpenInNew,
} from "react-icons/md";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";
import { SimpleSelect } from "@/app/panel/_components/simple-select";
import { useNotificationDetail } from "@/app/panel/_components/notification-detail-modal";
import {
  PRIORITY_THEME, PRIORITY_ORDER, notificationPriority, isImportant,
  dateGroupKey, DATE_GROUPS,
  type CategoryTheme, type NotificationCounts, type PriorityKey,
} from "@/lib/notifications/categories";
import type { RealtimeResource } from "@/lib/realtime";

export type FeedItem = {
  id: string;
  type: string;
  category: string;
  title: string;
  detail: string;
  href: string | null;
  severity: string;
  metadata?: unknown;
  createdAt: string;
  read: boolean;
};

export type Feed = {
  items: FeedItem[];
  unread: number;
  total: number;
  counts?: NotificationCounts;
  page: number;
  limit: number;
  windowDays: number;
};

export type FeedTaxonomy = {
  /** Tema visual por clave de categoría (ícono, acento, etiqueta). */
  theme: Record<string, CategoryTheme>;
  /** Orden de las categorías en el selector. */
  order: string[];
  /** Deriva la clave de categoría de un elemento del feed. */
  categoryKeyOf: (item: FeedItem) => string;
};

const FALLBACK_THEME: CategoryTheme = {
  label: "General",
  accent: "#64748B",
  icon: "bg-[#F1F5F9] text-[#475569]",
  pill: "bg-[#F1F5F9] text-[#475569]",
};

type View = "todas" | "sin_leer" | "importantes";
type DateFilter = "" | "hoy" | "7d" | "30d";

export function NotificationFeed({
  endpoint,
  realtimeEvents,
  title,
  subtitle,
  emptyLabel,
  headerIcon: HeaderIcon,
  iconOf,
  taxonomy,
}: {
  endpoint: string;
  realtimeEvents: RealtimeResource[];
  title: string;
  subtitle: (windowDays: number) => string;
  emptyLabel: (windowDays: number) => string;
  headerIcon: React.ElementType;
  iconOf: (type: string) => React.ElementType;
  taxonomy: FeedTaxonomy;
}) {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [view, setView] = useState<View>("todas");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"" | PriorityKey>("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const openDetail = useNotificationDetail();

  const themeFor = (item: FeedItem) => taxonomy.theme[taxonomy.categoryKeyOf(item)] ?? FALLBACK_THEME;

  const load = async (p = 1, append = false) => {
    const params = new URLSearchParams({ limit: "100", page: String(p) });
    const res = await fetch(`${endpoint}?${params}`);
    if (res.ok) {
      const data: Feed = await res.json();
      setFeed((prev) => (append && prev ? { ...data, items: [...prev.items, ...data.items] } : data));
    } else {
      setError("No fue posible cargar las notificaciones");
    }
    setLoading(false);
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useRealtimeRefresh(realtimeEvents, () => load(1));

  const applyReadLocally = (ids: string[]) => {
    setFeed((prev) => {
      if (!prev) return prev;
      const idSet = new Set(ids);
      const newlyRead = prev.items.filter((i) => idSet.has(i.id) && !i.read).length;
      const items = prev.items.map((i) => (idSet.has(i.id) ? { ...i, read: true } : i));
      const counts = prev.counts
        ? { ...prev.counts, unread: Math.max(0, prev.counts.unread - newlyRead) }
        : prev.counts;
      return { ...prev, items, counts, unread: Math.max(0, prev.unread - newlyRead) };
    });
  };

  const markRead = async (ids: string[]) => {
    if (ids.length === 0) return;
    setSaving(true);
    applyReadLocally(ids);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) {
      setError("No fue posible marcar como leídas");
      await load(1);
    }
    setSaving(false);
  };

  const markAllRead = async () => {
    if (!feed) return;
    setSaving(true);
    const unreadIds = feed.items.filter((i) => !i.read).map((i) => i.id);
    applyReadLocally(feed.items.map((i) => i.id));
    setFeed((prev) => (prev ? { ...prev, unread: 0, counts: prev.counts ? { ...prev.counts, unread: 0 } : prev.counts } : prev));
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true, ids: unreadIds }),
    });
    if (!res.ok) {
      setError("No fue posible marcar como leídas");
      await load(1);
    }
    setSaving(false);
  };

  const counts = feed?.counts;
  const total = counts?.total ?? feed?.total ?? 0;
  const unread = counts?.unread ?? feed?.unread ?? 0;
  const important = counts?.important ?? 0;

  const filtered = useMemo(() => {
    const list = feed?.items ?? [];
    const now = Date.now();
    const q = search.trim().toLowerCase();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const fromDate =
      dateFilter === "hoy" ? startOfToday.getTime()
      : dateFilter === "7d" ? now - 7 * 86_400_000
      : dateFilter === "30d" ? now - 30 * 86_400_000
      : 0;

    return list.filter((it) => {
      if (view === "sin_leer" && it.read) return false;
      if (view === "importantes" && !isImportant(it.severity)) return false;
      if (categoryFilter && taxonomy.categoryKeyOf(it) !== categoryFilter) return false;
      if (priorityFilter && notificationPriority(it.severity) !== priorityFilter) return false;
      if (estadoFilter === "leidas" && !it.read) return false;
      if (estadoFilter === "no_leidas" && it.read) return false;
      if (fromDate && new Date(it.createdAt).getTime() < fromDate) return false;
      if (q && !`${it.title} ${it.detail}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [feed, view, categoryFilter, priorityFilter, estadoFilter, dateFilter, search, taxonomy]);

  const groups = useMemo(() => {
    const byKey: Record<string, FeedItem[]> = {};
    for (const it of filtered) {
      const key = dateGroupKey(it.createdAt);
      (byKey[key] ??= []).push(it);
    }
    return DATE_GROUPS.map((g) => ({ ...g, items: byKey[g.key] ?? [] }))
      .filter((g) => g.items.length > 0)
      .map((g) => ({
        ...g,
        date:
          (g.key === "hoy" || g.key === "ayer") && g.items[0]
            ? new Date(g.items[0].createdAt).toLocaleDateString("es-CO", { day: "numeric", month: "short" })
            : null,
      }));
  }, [filtered]);

  const hasMore = !!feed && feed.items.length < feed.total;

  const categoryOptions = [
    { value: "", label: "Categoría" },
    ...taxonomy.order.map((k) => {
      const n = counts?.byCategory[k] ?? 0;
      const label = taxonomy.theme[k]?.label ?? k;
      return { value: k, label: n > 0 ? `${label} (${n})` : label };
    }),
  ];

  const statCards = [
    { key: "todas" as View, label: "Todas", value: total, Icon: MdInbox, iconCls: "bg-[#E6FAFB] text-[#16B8C4]", activeCls: "border-[#16B8C4] ring-1 ring-[#16B8C4]" },
    { key: "sin_leer" as View, label: "Sin leer", value: unread, Icon: MdMarkEmailUnread, iconCls: "bg-[#DBEAFE] text-[#1D4ED8]", activeCls: "border-[#3B82F6] ring-1 ring-[#3B82F6]" },
    { key: "importantes" as View, label: "Importantes", value: important, Icon: MdPriorityHigh, iconCls: "bg-[#FEE2E2] text-[#DC2626]", activeCls: "border-[#EF4444] ring-1 ring-[#EF4444]" },
  ];

  if (loading) return <div className="p-6 text-sm text-[#64748B]">Cargando…</div>;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* Cabecera */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E6FAFB] text-[#16B8C4]">
            <HeaderIcon size={22} />
          </span>
          <div>
            <h1 className="text-xl font-black text-[#1A1A1A]">{title}</h1>
            <p className="text-xs text-[#64748B]">
              {subtitle(feed?.windowDays ?? 60)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={markAllRead}
            disabled={saving || unread === 0}
            className="flex items-center gap-1.5 rounded-lg bg-[#27B1B8] px-3.5 py-2 text-sm font-bold text-white hover:bg-[#1F9CA3] disabled:opacity-40"
          >
            <MdDoneAll size={16} /> Marcar todo como leído
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Resumen */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {statCards.map(({ key, label, value, Icon, iconCls, activeCls }) => {
          const active = view === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className={`flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-left transition-colors ${
                active ? activeCls : "border-[#E2E8F0] hover:bg-[#F8FAFC]"
              }`}
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconCls}`}>
                <Icon size={18} />
              </span>
              <span>
                <span className="block text-xs font-semibold text-[#64748B]">{label}</span>
                <span className="block text-xl font-black text-[#1A1A1A]">{value}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <MdSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar notificación…"
            className="w-full rounded-xl border border-[#E2E8F0] bg-white py-2 pl-9 pr-8 text-sm text-[#1A1A1A] outline-none focus:border-[#27B1B8]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Limpiar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#94A3B8] hover:text-[#1A1A1A]"
            >
              <MdClose size={14} />
            </button>
          )}
        </div>
        <SimpleSelect
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={categoryOptions}
          triggerClassName="flex items-center justify-between gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1A1A1A]"
          portal
        />
        <SimpleSelect
          value={estadoFilter}
          onChange={setEstadoFilter}
          options={[
            { value: "", label: "Estado" },
            { value: "no_leidas", label: "No leídas" },
            { value: "leidas", label: "Leídas" },
          ]}
          triggerClassName="flex items-center justify-between gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1A1A1A]"
          portal
        />
        <SimpleSelect
          value={priorityFilter}
          onChange={(v) => setPriorityFilter(v as "" | PriorityKey)}
          options={[
            { value: "", label: "Prioridad" },
            ...PRIORITY_ORDER.map((p) => ({ value: p, label: PRIORITY_THEME[p].label })),
          ]}
          triggerClassName="flex items-center justify-between gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1A1A1A]"
          portal
        />
        <SimpleSelect
          value={dateFilter}
          onChange={(v) => setDateFilter(v as DateFilter)}
          options={[
            { value: "", label: "Fecha" },
            { value: "hoy", label: "Hoy" },
            { value: "7d", label: "Últimos 7 días" },
            { value: "30d", label: "Últimos 30 días" },
          ]}
          triggerClassName="flex items-center justify-between gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1A1A1A]"
          portal
        />
      </div>

      {/* Pestañas */}
      <div className="flex flex-wrap items-center gap-2">
        {statCards.map(({ key, label, value }) => {
          const active = view === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                active
                  ? "bg-[#27B1B8] text-white"
                  : "border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC]"
              }`}
            >
              {label} ({value})
            </button>
          );
        })}
      </div>

      {/* Lista agrupada por fecha */}
      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.key} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-black text-[#1A1A1A]">
                {group.label}
                {group.date && <span className="ml-2 text-[11px] font-semibold text-[#94A3B8]">{group.date}</span>}
              </h2>
              <span className="text-[11px] text-[#94A3B8]">
                {group.items.length} {group.items.length === 1 ? "notificación" : "notificaciones"}
              </span>
            </div>
            <div className="space-y-2">
              {group.items.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  theme={themeFor(item)}
                  typeIcon={iconOf(item.type)}
                  saving={saving}
                  onOpen={() => {
                    if (!item.read) markRead([item.id]);
                    openDetail({
                      id: item.id,
                      type: item.type,
                      title: item.title,
                      detail: item.detail,
                      href: item.href,
                      severity: item.severity,
                      createdAt: item.createdAt,
                      read: item.read,
                      theme: themeFor(item),
                      icon: iconOf(item.type),
                    });
                  }}
                  onMarkRead={() => markRead([item.id])}
                />
              ))}
            </div>
          </section>
        ))}

        {groups.length === 0 && (
          <p className="rounded-xl border border-[#E2E8F0] bg-white p-6 text-sm text-[#94A3B8]">
            {feed && feed.total === 0
              ? emptyLabel(feed.windowDays)
              : "No hay notificaciones con estos filtros."}
          </p>
        )}

        {hasMore && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => {
                const next = page + 1;
                setPage(next);
                load(next, true);
              }}
              className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC]"
            >
              Cargar más
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationRow({
  item,
  theme,
  typeIcon,
  saving,
  onOpen,
  onMarkRead,
}: {
  item: FeedItem;
  theme: CategoryTheme;
  typeIcon: React.ElementType;
  saving: boolean;
  onOpen: () => void;
  onMarkRead: () => void;
}) {
  const priority = notificationPriority(item.severity);
  const pr = PRIORITY_THEME[priority];
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const showMenu = !item.read || !!item.href;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`group flex cursor-pointer items-center gap-3 rounded-xl border border-l-4 border-[#E2E8F0] px-3.5 py-2.5 transition-colors ${
        item.read ? "bg-white hover:bg-[#F8FAFC]" : "bg-[#F5FAFF] hover:bg-[#EEF6FF]"
      }`}
      style={{ borderLeftColor: theme.accent }}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${theme.icon}`}>
        {createElement(typeIcon, { size: 17 })}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {!item.read && (
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: theme.accent }} aria-label="No leída" />
          )}
          <p className={`min-w-0 truncate text-sm text-[#1A1A1A] ${item.read ? "font-medium" : "font-semibold"}`}>
            {item.title}
          </p>
        </div>
        <p className="mt-0.5 truncate text-xs text-[#64748B]">{item.detail}</p>
      </div>

      <span className={`hidden shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold sm:inline-block ${theme.pill}`}>
        {theme.label}
      </span>

      {priority !== "baja" && (
        <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold md:inline-block ${pr.badge}`}>
          {pr.label}
        </span>
      )}

      <span className="hidden shrink-0 items-center gap-1 text-[11px] text-[#94A3B8] sm:flex">
        <MdAccessTime size={13} /> {relativeTime(item.createdAt)}
      </span>

      <span className="hidden shrink-0 items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1 text-xs font-bold text-[#1A1A1A] group-hover:border-[#27B1B8] group-hover:text-[#0C8A90] sm:flex">
        Ver detalle <MdArrowForward size={13} />
      </span>

      {showMenu && (
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            aria-label="Más acciones"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#1A1A1A]"
          >
            <MdMoreVert size={17} />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white py-1 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              {!item.read && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setMenuOpen(false);
                    onMarkRead();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#1A1A1A] hover:bg-[#F1F5F9] disabled:opacity-40"
                >
                  <MdCheck size={15} /> Marcar como leída
                </button>
              )}
              {item.href && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    if (!item.read) onMarkRead();
                    router.push(item.href as string);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#1A1A1A] hover:bg-[#F1F5F9]"
                >
                  <MdOpenInNew size={15} /> Abrir en su sección
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
