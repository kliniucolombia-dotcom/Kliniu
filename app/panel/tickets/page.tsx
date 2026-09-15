"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MdSearch, MdAdd, MdAttachFile, MdSend, MdCheckCircle, MdUploadFile, MdClose, MdInsertDriveFile,
  MdShoppingBag, MdDescription, MdCheckroom, MdConstruction, MdChair, MdMoreHoriz, MdDesignServices, MdStorefront, MdComputer, MdDirectionsCar, MdCategory,
  MdDownload, MdCalendarToday, MdFilterList, MdUnfoldMore, MdTrendingUp, MdMoreVert, MdFormatListBulleted, MdAccessTime, MdSettings, MdChevronLeft, MdChevronRight,
  MdDeleteOutline, MdClear, MdTrendingDown, MdFileDownload, MdPriorityHigh,
  MdNotificationsActive, MdPersonOutline, MdFlag, MdEdit,
} from "react-icons/md";
import type { IconType } from "react-icons";
import { SimpleSelect } from "../_components/simple-select";
import { Empty, Badge, Modal, Footer, btnPrimary, labelCls, inputCls, post, patchReq } from "../_components/ops-ui";
import { useConfirm } from "@/app/components/confirm-dialog";
import { TICKET_SLA_LABELS, responsiblesForCategory, isTicketOverdue, bogotaMonthRange, growthPct, TICKET_LOCATIONS } from "@/lib/tickets";
import type { TicketFieldDef } from "@/lib/tickets";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";

type Ticket = {
  id: string;
  code: string;
  subject: string;
  description?: string;
  location?: string | null;
  priority: string;
  status: string;
  createdAt: string;
  dueDate: string | null;
  category: { name: string; icon?: string | null };
  employee: { user: { id: string; fullName: string } };
  responsible: { id: string; fullName: string } | null;
};
type Category = { id: string; name: string; allowedDepartmentIds: string[]; icon?: string | null; fieldsSchema?: TicketFieldDef[] };
type Comment = { id: string; message: string; createdAt: string; user: { fullName: string } };
type TicketEvent = { id: string; type: string; field: string | null; fromValue: string | null; toValue: string | null; createdAt: string; actor: { fullName: string } | null };
type TicketDetail = Ticket & {
  description: string;
  location: string | null;
  extraFields: Record<string, string> | null;
  resolvedAt: string | null;
  attachments?: { id: string; url: string; name: string; size: number | null }[];
  comments?: Comment[];
  events?: TicketEvent[];
  responsible: { id: string; fullName: string } | null;
};
type StaffUser = { id: string; fullName: string };

const PRIORITY_LABELS: Record<string, string> = { BAJA: "Baja", MEDIA: "Media", ALTA: "Alta", URGENTE: "Urgente" };
const PRIORITY_BADGE: Record<string, string> = {
  BAJA: "bg-[#F1F5F9] text-[#64748B]",
  MEDIA: "bg-[#DBEAFE] text-[#2563EB]",
  ALTA: "bg-[#FEF3C7] text-[#B45309]",
  URGENTE: "bg-[#FEE2E2] text-[#DC2626]",
};
const PRIORITY_DOT: Record<string, string> = {
  BAJA: "bg-[#94A3B8]",
  MEDIA: "bg-[#2563EB]",
  ALTA: "bg-[#F59E0B]",
  URGENTE: "bg-[#DC2626]",
};
const STATUS_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente",
  EN_PROCESO: "En proceso",
  ESPERANDO_RESPUESTA: "Esperando respuesta",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};
const STATUS_BADGE: Record<string, string> = {
  PENDIENTE: "bg-[#FEF3C7] text-[#B45309]",
  EN_PROCESO: "bg-[#DBEAFE] text-[#2563EB]",
  ESPERANDO_RESPUESTA: "bg-[#EDE9FE] text-[#7C3AED]",
  FINALIZADO: "bg-[#DCFCE7] text-[#16A34A]",
  CANCELADO: "bg-[#F1F5F9] text-[#64748B]",
};
const STATUS_DOT: Record<string, string> = {
  PENDIENTE: "bg-[#F59E0B]",
  EN_PROCESO: "bg-[#2563EB]",
  ESPERANDO_RESPUESTA: "bg-[#7C3AED]",
  FINALIZADO: "bg-[#16A34A]",
  CANCELADO: "bg-[#94A3B8]",
};
const STATUS_ORDER = ["PENDIENTE", "EN_PROCESO", "ESPERANDO_RESPUESTA", "FINALIZADO", "CANCELADO"];
const PRIORITY_ORDER = ["BAJA", "MEDIA", "ALTA", "URGENTE"];
const PAGE_SIZE = 8;

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_BADGE[status] ?? "bg-[#F1F5F9] text-[#64748B]"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status] ?? "bg-[#94A3B8]"}`} />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function ticketEventText(e: TicketEvent): string {
  switch (e.type) {
    case "CREATED": return "Solicitud creada";
    case "COMMENT": return `Comentario: ${e.toValue ?? ""}`;
    case "ATTACHMENT": return `Adjunto agregado: ${e.toValue ?? ""}`;
    case "ATTACHMENT_DELETED": return `Adjunto eliminado: ${e.toValue ?? ""}`;
    case "STATUS": return `Estado: ${STATUS_LABELS[e.fromValue ?? ""] ?? e.fromValue ?? "—"} → ${STATUS_LABELS[e.toValue ?? ""] ?? e.toValue ?? "—"}`;
    case "PRIORITY": return `Prioridad: ${PRIORITY_LABELS[e.fromValue ?? ""] ?? e.fromValue ?? "—"} → ${PRIORITY_LABELS[e.toValue ?? ""] ?? e.toValue ?? "—"}`;
    case "RESPONSIBLE": return `Responsable: ${e.fromValue ?? "—"} → ${e.toValue ?? "—"}`;
    case "EDITED": return `Editó ${e.field === "subject" ? "el asunto" : "la descripción"}`;
    default: return e.type;
  }
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function bogotaDay(d: string | Date) {
  return new Date(d).toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
}

const OPEN_STATUSES = new Set(["PENDIENTE", "EN_PROCESO", "ESPERANDO_RESPUESTA"]);

const CATEGORY_ICON: Record<string, { Icon: IconType; bg: string; fg: string }> = {
  "Compras": { Icon: MdShoppingBag, bg: "bg-[#FFF1E6]", fg: "text-[#B45309]" },
  "Documentación": { Icon: MdDescription, bg: "bg-[#DBEAFE]", fg: "text-[#2563EB]" },
  "Dotación": { Icon: MdCheckroom, bg: "bg-[#EDE9FE]", fg: "text-[#7C3AED]" },
  "Infraestructura": { Icon: MdConstruction, bg: "bg-[#FEF3C7]", fg: "text-[#B45309]" },
  "Mobiliario": { Icon: MdChair, bg: "bg-[#FCE7F3]", fg: "text-[#BE185D]" },
  "PQRS Diseño y Venta": { Icon: MdDesignServices, bg: "bg-[#E6FAFB]", fg: "text-[#0C535B]" },
  "PQRS Diseño": { Icon: MdDesignServices, bg: "bg-[#E6FAFB]", fg: "text-[#0C535B]" },
  "PQRS Venta": { Icon: MdStorefront, bg: "bg-[#DCFCE7]", fg: "text-[#16A34A]" },
  "Soporte TI": { Icon: MdComputer, bg: "bg-[#DBEAFE]", fg: "text-[#2563EB]" },
  "Vehículos": { Icon: MdDirectionsCar, bg: "bg-[#DCFCE7]", fg: "text-[#16A34A]" },
  "Otro": { Icon: MdMoreHoriz, bg: "bg-[#F1F5F9]", fg: "text-[#64748B]" },
};
const DEFAULT_CATEGORY_ICON = { Icon: MdCategory, bg: "bg-[#F1F5F9]", fg: "text-[#64748B]" };

function CategoryIcon({ name, icon, size = 26 }: { name: string; icon?: string | null; size?: number }) {
  // `icon` solo se usa como override cuando es un emoji; los nombres de
  // componente/slug (p. ej. "MdShoppingBag", "shopping-cart") se resuelven por
  // el nombre de categoría para mantener el color.
  const override = icon && /\p{Extended_Pictographic}/u.test(icon) ? icon : null;
  if (override) {
    return (
      <span className="flex shrink-0 items-center justify-center leading-none" style={{ width: size, height: size, fontSize: Math.round(size * 0.62) }}>
        {override}
      </span>
    );
  }
  const { Icon, bg, fg } = CATEGORY_ICON[name] ?? DEFAULT_CATEGORY_ICON;
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-[7px] ${bg} ${fg}`} style={{ width: size, height: size }}>
      <Icon size={Math.round(size * 0.52)} />
    </span>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function fileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E6FAFB] text-[11px] font-bold text-[#0C535B]">
      {initials(name)}
    </span>
  );
}

type SortKey = "code" | "createdAt" | "priority" | "dueDate" | "status" | "responsible";

function StatCard({ icon, circle, label, value, delta }: { icon: React.ReactNode; circle: string; label: string; value: number; delta: number | null }) {
  const positive = delta !== null && delta >= 0;
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-5">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${circle}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[13px] text-[#64748B]">{label}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-[#1A1A1A]">{value}</span>
          {delta === null ? (
            <span className="text-xs font-bold text-[#94A3B8]">—</span>
          ) : (
            <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${positive ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
              {positive ? <MdTrendingUp size={13} /> : <MdTrendingDown size={13} />}
              {positive ? "+" : ""}{delta}%
            </span>
          )}
        </div>
        <p className="text-[11px] text-[#94A3B8]">Respecto al mes anterior</p>
      </div>
    </div>
  );
}

function AttentionMetric({ icon, circle, label, value }: { icon: React.ReactNode; circle: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 border-l border-[#E2E8F0] pl-4">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${circle}`}>{icon}</span>
      <div className="leading-tight">
        <p className="whitespace-nowrap text-xs text-[#64748B]">{label}</p>
        <p className="text-base font-black text-[#1A1A1A]">{value}</p>
      </div>
    </div>
  );
}

function SortTh({ label, sortKey, activeKey, dir, onSort }: { label: string; sortKey: SortKey; activeKey: SortKey; dir: "asc" | "desc"; onSort: (k: SortKey) => void }) {
  const active = sortKey === activeKey;
  return (
    <th className="px-4 py-3 font-bold">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        title={`Ordenar por ${label.toLowerCase()} (${dir === "asc" ? "ascendente" : "descendente"})`}
        className={`inline-flex items-center gap-1 uppercase tracking-wide ${active ? "text-[#27B1B8]" : "hover:text-[#64748B]"}`}
      >
        {label}
        <MdUnfoldMore size={13} className={active ? "" : "text-[#CBD5E1]"} />
      </button>
    </th>
  );
}

export default function TicketsPanelPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [scope, setScope] = useState<"all" | "department">("department");
  const [department, setDepartment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [alert, setAlert] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [responsiblesByDept, setResponsiblesByDept] = useState<Record<string, StaffUser[]>>({});
  const [canManageAssignment, setCanManageAssignment] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [responsibleFilter, setResponsibleFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const confirm = useConfirm();

  const load = async () => {
    const [tRes, cRes, rRes, pRes] = await Promise.all([
      fetch("/api/panel/tickets"),
      fetch("/api/rrhh-local/ticket-categories"),
      fetch("/api/rrhh-local/tickets/responsibles"),
      fetch("/api/panel/permissions"),
    ]);
    if (tRes.status === 401 || tRes.status === 403) { router.push("/panel/sin-acceso"); return; }
    if (tRes.ok) {
      const data = await tRes.json();
      setTickets(data.tickets);
      setScope(data.scope);
      setDepartment(data.department);
    }
    if (cRes.ok) setCategories(await cRes.json());
    if (rRes.ok) setResponsiblesByDept(await rRes.json());
    if (pRes.ok) {
      const { id: userId, role } = await pRes.json();
      setCurrentUserId(userId ?? null);
      setCanManageAssignment(role === "RRHH" || role === "ADMIN" || role === "SUPERADMIN");
    }
    setLoading(false);
  };

  useEffect(() => {
    void (async () => { await load(); })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useRealtimeRefresh(["tickets"], load);
  useEffect(() => {
    fetch("/api/rrhh-local/tickets/staff").then((r) => (r.ok ? r.json() : [])).then(setStaff).catch(() => {});
  }, []);

  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 4000);
    return () => clearTimeout(t);
  }, [alert]);

  const filtered = useMemo(() => tickets.filter((t) => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    if (categoryFilter && t.category.name !== categoryFilter) return false;
    if (responsibleFilter === "__none__") { if (t.responsible) return false; }
    else if (responsibleFilter && t.responsible?.id !== responsibleFilter) return false;
    if (overdueOnly && !isTicketOverdue(t)) return false;
    if (unassignedOnly && t.responsible) return false;
    if (dateFrom || dateTo) {
      const day = new Date(t.createdAt).toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return t.code.toLowerCase().includes(q)
        || t.subject.toLowerCase().includes(q)
        || (t.description?.toLowerCase().includes(q) ?? false)
        || (t.location?.toLowerCase().includes(q) ?? false)
        || t.employee.user.fullName.toLowerCase().includes(q);
    }
    return true;
  }), [tickets, search, statusFilter, priorityFilter, categoryFilter, responsibleFilter, dateFrom, dateTo, overdueOnly, unassignedOnly]);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const cmp = (a: Ticket, b: Ticket): number => {
      switch (sortKey) {
        case "code": return a.code.localeCompare(b.code);
        case "priority": return PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
        case "status": return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
        case "responsible": return (a.responsible?.fullName ?? "").localeCompare(b.responsible?.fullName ?? "");
        case "dueDate": {
          const av = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const bv = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return av - bv;
        }
        default: return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
    };
    return [...filtered].sort((a, b) => cmp(a, b) * dir);
  }, [filtered, sortKey, sortDir]);

  const stats = useMemo(() => {
    const now = new Date();
    const { start, end } = bogotaMonthRange(now, 0);
    const { start: prevStart, end: prevEnd } = bogotaMonthRange(now, -1);
    const inRange = (t: Ticket, s: Date, e: Date) => {
      const time = new Date(t.createdAt).getTime();
      return time >= s.getTime() && time < e.getTime();
    };
    const current = tickets.filter((t) => inRange(t, start, end));
    const previous = tickets.filter((t) => inRange(t, prevStart, prevEnd));
    const countBy = (list: Ticket[], status: string) => list.filter((t) => t.status === status).length;
    const highPriority = (t: Ticket) => t.priority === "ALTA" || t.priority === "URGENTE";
    return {
      total: { value: current.length, delta: growthPct(current.length, previous.length) },
      pending: { value: countBy(current, "PENDIENTE"), delta: growthPct(countBy(current, "PENDIENTE"), countBy(previous, "PENDIENTE")) },
      inProgress: { value: countBy(current, "EN_PROCESO"), delta: growthPct(countBy(current, "EN_PROCESO"), countBy(previous, "EN_PROCESO")) },
      urgent: { value: current.filter(highPriority).length, delta: growthPct(current.filter(highPriority).length, previous.filter(highPriority).length) },
    };
  }, [tickets]);

  const attention = useMemo(() => {
    const today = bogotaDay(new Date());
    const highPriority = (t: Ticket) => t.priority === "ALTA" || t.priority === "URGENTE";
    return {
      dueToday: tickets.filter((t) => OPEN_STATUSES.has(t.status) && t.dueDate && bogotaDay(t.dueDate) === today).length,
      overdue: tickets.filter((t) => isTicketOverdue(t)).length,
      unassigned: tickets.filter((t) => !t.responsible).length,
      highPriority: tickets.filter(highPriority).length,
    };
  }, [tickets]);

  const categoryOptions = useMemo(
    () => [...new Set(tickets.map((t) => t.category.name))].sort((a, b) => a.localeCompare(b)),
    [tickets],
  );
  const responsibleOptions = useMemo(() => {
    const map = new Map<string, string>();
    tickets.forEach((t) => { if (t.responsible) map.set(t.responsible.id, t.responsible.fullName); });
    return [...map.entries()].map(([id, fullName]) => ({ id, fullName })).sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [tickets]);

  const hasFilters = Boolean(search || statusFilter || priorityFilter || categoryFilter || responsibleFilter || dateFrom || dateTo || overdueOnly || unassignedOnly);
  const clearFilters = () => {
    setSearch(""); setStatusFilter(""); setPriorityFilter(""); setCategoryFilter("");
    setResponsibleFilter(""); setDateFrom(""); setDateTo(""); setOverdueOnly(false); setUnassignedOnly(false);
    setPage(1); setSelectedIds(new Set());
  };

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const applyFilter = (fn: () => void) => { fn(); setPage(1); setSelectedIds(new Set()); };

  const toggleSelect = (id: string) => setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allPageSelected = pageItems.length > 0 && pageItems.every((t) => selectedIds.has(t.id));
  const toggleSelectAllPage = () => setSelectedIds((prev) => {
    const next = new Set(prev);
    if (allPageSelected) pageItems.forEach((t) => next.delete(t.id));
    else pageItems.forEach((t) => next.add(t.id));
    return next;
  });

  const deleteTicket = async (t: Ticket) => {
    const ok = await confirm({
      title: "Eliminar solicitud",
      message: `¿Eliminar ${t.code}? Se borrarán sus comentarios y adjuntos. Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/rrhh-local/tickets/${t.id}`, { method: "DELETE" });
    if (res.ok) { setAlert({ type: "ok", msg: `Solicitud ${t.code} eliminada` }); setMenuId(null); setSelectedIds((prev) => { const n = new Set(prev); n.delete(t.id); return n; }); load(); }
    else setAlert({ type: "err", msg: (await res.json().catch(() => ({}))).error || "No fue posible eliminar la solicitud" });
  };

  const bulkAction = async (op: "status" | "priority" | "responsible" | "delete", value: string | null) => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (op === "delete") {
      const ok = await confirm({
        title: "Eliminar solicitudes",
        message: `¿Eliminar ${ids.length} solicitud(es)? Se borrarán sus comentarios y adjuntos. Esta acción no se puede deshacer.`,
        confirmLabel: "Eliminar",
        danger: true,
      });
      if (!ok) return;
    }
    setBulkBusy(true);
    const res = await fetch("/api/rrhh-local/tickets/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, op, value }),
    });
    setBulkBusy(false);
    if (res.ok) {
      const { affected } = await res.json().catch(() => ({ affected: ids.length }));
      setSelectedIds(new Set());
      setAlert({ type: "ok", msg: `${affected ?? ids.length} solicitud(es) actualizada(s)` });
      load();
    } else {
      setAlert({ type: "err", msg: (await res.json().catch(() => ({}))).error || "No fue posible completar la acción" });
    }
  };

  const todayLabel = new Date().toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "long", year: "numeric" });

  const exportCsv = () => {
    const rows = [
      ["Ticket", "Tipo", "Solicitante", "Fecha", "Prioridad", "Vence", "Estado", "Responsable"],
      ...sorted.map((t) => [
        t.code,
        t.category.name,
        t.employee.user.fullName,
        fmt(t.createdAt),
        PRIORITY_LABELS[t.priority] ?? t.priority,
        t.dueDate ? fmt(t.dueDate) : "",
        STATUS_LABELS[t.status] ?? t.status,
        t.responsible?.fullName ?? "Sin asignar",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "solicitudes.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Solicitudes</p>
          <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">
            {scope === "all" ? "Todas las solicitudes" : department ? `Solicitudes de ${department}` : "Solicitudes de mi departamento"}
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            {scope === "all" ? "Vista completa (RRHH). Gestiona y da seguimiento a todas las PQRS." : "Categorías de PQRS habilitadas para tu departamento."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden items-center gap-2.5 rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 sm:flex">
            <MdCalendarToday size={18} className="text-[#27B1B8]" />
            <div className="leading-tight">
              <p className="text-xs font-bold text-[#1A1A1A]">Hoy es {todayLabel}</p>
              <p className="text-[11px] text-[#94A3B8]">Buen día</p>
            </div>
          </div>
          {categories.length > 0 && (
            <button className={btnPrimary} onClick={() => setShowNew(true)}><MdAdd size={16} />Nueva solicitud</button>
          )}
        </div>
      </div>

      {alert && (
        <div className={`mb-4 rounded-xl px-3 py-2 text-xs font-semibold ${alert.type === "ok" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEE2E2] text-[#DC2626]"}`}>{alert.msg}</div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-[#94A3B8]">Cargando…</div>
      ) : !department && scope === "department" ? (
        <Empty text="No tienes un departamento asignado. Pide a RRHH que lo configure en tu perfil de empleado." />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={<MdFormatListBulleted size={22} />} circle="bg-[#E6FAFB] text-[#0C535B]" label="Total solicitudes" value={stats.total.value} delta={stats.total.delta} />
            <StatCard icon={<MdAccessTime size={22} />} circle="bg-[#FFF1E6] text-[#B45309]" label="Pendientes" value={stats.pending.value} delta={stats.pending.delta} />
            <StatCard icon={<MdSettings size={22} />} circle="bg-[#E8EDFB] text-[#2563EB]" label="En proceso" value={stats.inProgress.value} delta={stats.inProgress.delta} />
            <StatCard icon={<MdPriorityHigh size={22} />} circle="bg-[#FEE2E2] text-[#DC2626]" label="Alta prioridad" value={stats.urgent.value} delta={stats.urgent.delta} />
          </div>

          <div className="mb-5 grid grid-cols-1 items-center gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-5 lg:grid-cols-[auto_1fr_auto]">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E6FAFB] text-[#27B1B8]">
                <MdNotificationsActive size={22} />
              </span>
              <div>
                <p className="text-sm font-black text-[#1A1A1A]">Atención requerida</p>
                <p className="text-xs text-[#64748B]">Solicitudes que necesitan seguimiento</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
              <AttentionMetric icon={<MdCalendarToday size={16} />} circle="bg-[#FFF1E6] text-[#B45309]" label="Vencen hoy" value={attention.dueToday} />
              <AttentionMetric icon={<MdPriorityHigh size={16} />} circle="bg-[#FEE2E2] text-[#DC2626]" label="Vencidas" value={attention.overdue} />
              <AttentionMetric icon={<MdPersonOutline size={16} />} circle="bg-[#EDE9FE] text-[#7C3AED]" label="Sin asignar" value={attention.unassigned} />
              <AttentionMetric icon={<MdFlag size={16} />} circle="bg-[#FEF3C7] text-[#B45309]" label="Alta prioridad" value={attention.highPriority} />
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-self-end">
              <button
                type="button"
                onClick={() => applyFilter(() => setOverdueOnly(true))}
                className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[#27B1B8] px-3 py-1.5 text-xs font-bold text-[#27B1B8] hover:bg-[#E6FAFB]"
              >
                Ver vencidas <MdChevronRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => applyFilter(() => setUnassignedOnly(true))}
                className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[#27B1B8] px-3 py-1.5 text-xs font-bold text-[#27B1B8] hover:bg-[#E6FAFB]"
              >
                Ver sin asignar <MdChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E2E8F0] bg-white">
            <div className="flex flex-wrap items-center gap-3 border-b border-[#F1F5F9] p-4">
              <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5">
                <MdSearch size={17} className="shrink-0 text-[#94A3B8]" />
                <input value={search} onChange={(e) => applyFilter(() => setSearch(e.target.value))} placeholder="Buscar ticket, asunto, solicitante o palabra clave..."
                  className="w-full bg-transparent text-sm text-[#1A1A1A] outline-none placeholder:text-[#94A3B8]" />
              </div>
              <button type="button" onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] px-3 py-2.5 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">
                <MdFileDownload size={16} /> Exportar
              </button>
              <div className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] px-3 py-1.5">
                <MdFilterList size={16} className="text-[#94A3B8]" />
                <SimpleSelect
                  value={statusFilter}
                  onChange={(v) => applyFilter(() => setStatusFilter(v))}
                  triggerClassName="flex items-center gap-1 bg-transparent text-sm font-semibold text-[#64748B] outline-none"
                  options={[{ value: "", label: "Estado: Todos" }, ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))]}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-[#F1F5F9] px-4 py-3">
              <SimpleSelect
                value={priorityFilter}
                onChange={(v) => applyFilter(() => setPriorityFilter(v))}
                className="w-40"
                options={[{ value: "", label: "Prioridad: Todas" }, ...Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))]}
              />
              <SimpleSelect
                value={categoryFilter}
                onChange={(v) => applyFilter(() => setCategoryFilter(v))}
                className="w-44"
                options={[{ value: "", label: "Categoría: Todas" }, ...categoryOptions.map((name) => ({ value: name, label: name }))]}
              />
              <SimpleSelect
                value={responsibleFilter}
                onChange={(v) => applyFilter(() => setResponsibleFilter(v))}
                className="w-48"
                options={[{ value: "", label: "Responsable: Todos" }, { value: "__none__", label: "Sin asignar" }, ...responsibleOptions.map((r) => ({ value: r.id, label: r.fullName }))]}
              />
              <div className="flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] px-3 py-2">
                <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => applyFilter(() => setDateFrom(e.target.value))} className="bg-transparent text-xs text-[#64748B] outline-none" aria-label="Desde" />
                <span className="text-[#CBD5E1]">–</span>
                <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => applyFilter(() => setDateTo(e.target.value))} className="bg-transparent text-xs text-[#64748B] outline-none" aria-label="Hasta" />
              </div>
              <button
                type="button"
                onClick={() => applyFilter(() => setOverdueOnly((v) => !v))}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold ${overdueOnly ? "border-[#FCA5A5] bg-[#FEE2E2] text-[#DC2626]" : "border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"}`}
              >
                Vencidas
              </button>
              <button
                type="button"
                onClick={() => applyFilter(() => setUnassignedOnly((v) => !v))}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold ${unassignedOnly ? "border-[#FDE68A] bg-[#FEF3C7] text-[#B45309]" : "border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"}`}
              >
                Sin asignar
              </button>
              {hasFilters && (
                <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-bold text-[#27B1B8] hover:bg-[#F8FAFC]">
                  <MdClear size={15} /> Limpiar
                </button>
              )}
            </div>

            {canManageAssignment && selectedIds.size > 0 && (
              <div className="flex flex-wrap items-center gap-3 border-b border-[#F1F5F9] bg-[#F8FAFC] px-4 py-3">
                <span className="text-xs font-bold text-[#1A1A1A]">{selectedIds.size} seleccionada(s)</span>
                <div className="w-40">
                  <SimpleSelect
                    value=""
                    disabled={bulkBusy}
                    onChange={(v) => v && bulkAction("status", v)}
                    placeholder="Cambiar estado"
                    options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
                  />
                </div>
                <div className="w-40">
                  <SimpleSelect
                    value=""
                    disabled={bulkBusy}
                    onChange={(v) => v && bulkAction("priority", v)}
                    placeholder="Cambiar prioridad"
                    options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))}
                  />
                </div>
                <div className="w-48">
                  <SimpleSelect
                    value=""
                    disabled={bulkBusy}
                    onChange={(v) => v && bulkAction("responsible", v === "__none__" ? null : v)}
                    placeholder="Asignar a"
                    options={[{ value: "__none__", label: "Sin asignar" }, ...staff.map((s) => ({ value: s.id, label: s.fullName }))]}
                  />
                </div>
                <button
                  type="button"
                  disabled={bulkBusy}
                  onClick={() => bulkAction("delete", null)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#FCA5A5] bg-[#FEE2E2] px-3 py-2 text-xs font-bold text-[#DC2626] hover:bg-[#FECACA] disabled:opacity-50"
                >
                  <MdDeleteOutline size={15} /> Eliminar
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs font-bold text-[#64748B] hover:text-[#1A1A1A]"
                >
                  Quitar selección
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-[13px] [&_td]:px-3 [&_th]:px-3">
                <thead>
                  <tr className="border-b border-[#F1F5F9] text-left text-[11px] font-bold uppercase tracking-wide text-[#94A3B8]">
                    {canManageAssignment && (
                      <th className="w-8 py-3">
                        <input type="checkbox" checked={allPageSelected} onChange={toggleSelectAllPage} className="h-3.5 w-3.5 accent-[#27B1B8]" aria-label="Seleccionar página" />
                      </th>
                    )}
                    <SortTh label="Ticket" sortKey="code" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <th className="px-4 py-3 font-bold">Tipo</th>
                    <th className="px-4 py-3 font-bold">Solicitante</th>
                    <SortTh label="Fecha" sortKey="createdAt" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <SortTh label="Prioridad" sortKey="priority" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <SortTh label="Vence" sortKey="dueDate" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <SortTh label="Estado" sortKey="status" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <SortTh label="Responsable" sortKey="responsible" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <th className="w-10 px-2 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((t, i) => (
                    <tr
                      key={t.id}
                      onClick={() => setDetailId(t.id)}
                      className={`cursor-pointer border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC] ${selectedIds.has(t.id) ? "bg-[#E6FAFB]" : ""}`}
                    >
                      {canManageAssignment && (
                        <td className="py-3" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggleSelect(t.id)} className="h-3.5 w-3.5 accent-[#27B1B8]" aria-label={`Seleccionar ${t.code}`} />
                        </td>
                      )}
                      <td className="whitespace-nowrap px-4 py-3"><span className="font-mono text-xs font-bold text-[#27B1B8]">{t.code}</span></td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2 whitespace-nowrap text-[#1A1A1A]"><CategoryIcon name={t.category.name} icon={t.category.icon} size={22} />{t.category.name}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[#1A1A1A]">{t.employee.user.fullName}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-[#64748B]">{fmt(t.createdAt)}</td>
                      <td className="px-4 py-3"><Badge label={PRIORITY_LABELS[t.priority]} cls={PRIORITY_BADGE[t.priority]} /></td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {t.dueDate ? (
                          <span className={isTicketOverdue(t) ? "font-semibold text-[#DC2626]" : "text-[#64748B]"}>
                            {fmt(t.dueDate)}
                          </span>
                        ) : <span className="text-[#94A3B8]">—</span>}
                      </td>
                      <td className="px-4 py-3"><StatusPill status={t.status} /></td>
                      <td className="whitespace-nowrap px-4 py-3 text-[#1A1A1A]">{t.responsible?.fullName ?? <span className="text-[#94A3B8]">Sin asignar</span>}</td>
                      <td className="px-2 py-3 text-right">
                        <div className="relative inline-block">
                          <button
                            onClick={(e) => { e.stopPropagation(); setMenuId(menuId === t.id ? null : t.id); }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#1A1A1A]"
                            aria-label="Acciones"
                          >
                            <MdMoreVert size={18} />
                          </button>
                          {menuId === t.id && (
                            <div className={`absolute right-0 z-20 w-40 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white py-1 text-left shadow-lg ${i >= pageItems.length - 2 ? "bottom-9" : "top-9"}`}>
                              <button onClick={(e) => { e.stopPropagation(); setMenuId(null); setDetailId(t.id); }} className="block w-full px-3 py-2 text-sm text-[#1A1A1A] hover:bg-[#F8FAFC]">Ver detalle</button>
                              <button onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(t.code); setMenuId(null); }} className="block w-full px-3 py-2 text-sm text-[#1A1A1A] hover:bg-[#F8FAFC]">Copiar código</button>
                              {canManageAssignment && (
                                <button onClick={(e) => { e.stopPropagation(); deleteTicket(t); }} className="block w-full px-3 py-2 text-sm font-semibold text-[#DC2626] hover:bg-[#FEE2E2]">Eliminar</button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {pageItems.length === 0 && (
                    <tr><td colSpan={canManageAssignment ? 10 : 9} className="px-4 py-10 text-center text-sm text-[#94A3B8]">Sin solicitudes con estos filtros.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#F1F5F9] px-4 py-3">
              <p className="text-xs text-[#64748B]">
                Mostrando {sorted.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1} a {Math.min(safePage * PAGE_SIZE, sorted.length)} de {sorted.length} solicitudes
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40"
                  aria-label="Anterior"
                >
                  <MdChevronLeft size={18} />
                </button>
                <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-[#27B1B8] px-2 text-xs font-bold text-white">{safePage}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40"
                  aria-label="Siguiente"
                >
                  <MdChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {menuId && <div className="fixed inset-0 z-10" onClick={() => setMenuId(null)} />}

      {showNew && (
        <NewTicketModal
          categories={categories}
          responsiblesByDept={responsiblesByDept}
          onClose={() => setShowNew(false)}
          onDone={(msg) => { setShowNew(false); setAlert({ type: "ok", msg }); load(); }}
          onError={(msg) => setAlert({ type: "err", msg })}
        />
      )}

      {detailId && (
        <TicketDetailModal
          id={detailId}
          staff={staff}
          canManageAssignment={canManageAssignment}
          currentUserId={currentUserId}
          onClose={() => setDetailId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

function TicketDetailModal({ id, staff, canManageAssignment, currentUserId, onClose, onChanged }: {
  id: string;
  staff: StaffUser[];
  canManageAssignment: boolean;
  currentUserId: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editSubject, setEditSubject] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const confirm = useConfirm();

  const refresh = async () => {
    const res = await fetch(`/api/rrhh-local/tickets/${id}`);
    if (res.ok) setDetail(await res.json());
  };
  useEffect(() => {
    void (async () => { await refresh(); })();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useRealtimeRefresh(["tickets"], refresh);

  const updateStatus = async (status: string) => {
    setSaving(true);
    setError(null);
    const res = await patchReq(`/api/rrhh-local/tickets/${id}`, { status });
    if (res.ok) {
      await refresh();
      onChanged();
      setToast(`Estado actualizado a "${STATUS_LABELS[status] ?? status}".`);
      window.setTimeout(() => setToast(null), 3000);
    } else setError(res.error!);
    setSaving(false);
  };

  const assign = async (responsibleId: string) => {
    setSaving(true);
    setError(null);
    const res = await patchReq(`/api/rrhh-local/tickets/${id}`, { responsibleId: responsibleId || null });
    if (res.ok) {
      await refresh();
      onChanged();
      const name = responsibleId ? (staff.find((s) => s.id === responsibleId)?.fullName ?? "") : "Sin asignar";
      setToast(`Responsable actualizado: ${name}.`);
      window.setTimeout(() => setToast(null), 3000);
    } else setError(res.error!);
    setSaving(false);
  };

  const updatePriority = async (priority: string) => {
    setSaving(true);
    setError(null);
    const res = await patchReq(`/api/rrhh-local/tickets/${id}`, { priority });
    if (res.ok) {
      await refresh();
      onChanged();
      setToast(`Prioridad actualizada a "${PRIORITY_LABELS[priority] ?? priority}".`);
      window.setTimeout(() => setToast(null), 3000);
    } else setError(res.error!);
    setSaving(false);
  };

  const resolve = () => updateStatus("FINALIZADO");

  const openAttachment = async (a: { url: string; name: string }) => {
    const res = await fetch(`/api/rrhh-local/tickets/download?path=${encodeURIComponent(a.url)}`);
    if (!res.ok) { setError("No fue posible abrir el archivo"); return; }
    const { url } = await res.json();
    setPreview({ url, name: a.name });
  };

  const uploadAttachment = async (file: File) => {
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/rrhh-local/tickets/${id}/attachments`, { method: "POST", body: formData });
    if (res.ok) await refresh();
    else setError((await res.json().catch(() => ({}))).error || "No fue posible subir el archivo");
    setUploading(false);
  };

  const deleteAttachment = async (attachmentId: string, name: string) => {
    const ok = await confirm({ title: "Eliminar adjunto", message: `¿Eliminar "${name}"? Esta acción no se puede deshacer.`, confirmLabel: "Eliminar", danger: true });
    if (!ok) return;
    const res = await fetch(`/api/rrhh-local/tickets/${id}/attachments/${attachmentId}`, { method: "DELETE" });
    if (res.ok) await refresh();
    else setError((await res.json().catch(() => ({}))).error || "No fue posible eliminar el adjunto");
  };

  const sendComment = async () => {
    if (!comment.trim()) return;
    setSaving(true);
    setError(null);
    const res = await post(`/api/rrhh-local/tickets/${id}/comments`, { message: comment });
    if (res.ok) { setComment(""); await refresh(); } else setError(res.error!);
    setSaving(false);
  };

  const startEdit = () => {
    if (!detail) return;
    setEditSubject(detail.subject);
    setEditDescription(detail.description);
    setEditing(true);
  };

  const saveContent = async () => {
    if (!editSubject.trim() || !editDescription.trim()) return;
    setSaving(true);
    setError(null);
    const res = await patchReq(`/api/rrhh-local/tickets/${id}`, { subject: editSubject, description: editDescription });
    if (res.ok) {
      setEditing(false);
      await refresh();
      onChanged();
      setToast("Solicitud actualizada");
      window.setTimeout(() => setToast(null), 3000);
    } else setError(res.error!);
    setSaving(false);
  };

  if (!detail) {
    return (
      <Modal title="Cargando…" onClose={onClose}>
        <div className="flex h-24 items-center justify-center text-sm text-[#94A3B8]">Cargando…</div>
      </Modal>
    );
  }

  const canEditContent = canManageAssignment || (currentUserId !== null && detail.employee.user.id === currentUserId);
  const editableNow = canEditContent && (canManageAssignment || detail.status === "PENDIENTE");

  return (
    <Modal
      title={detail.code}
      onClose={onClose}
      wide
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={resolve}
            disabled={saving || detail.status === "FINALIZADO"}
            className="flex items-center gap-1.5 rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            <MdCheckCircle size={16} /> Resolver solicitud
          </button>
        </div>
      }
    >
      {editing ? (
        <div className="space-y-2">
          <div>
            <label className={labelCls}>Asunto</label>
            <input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} className={inputCls} aria-label="Asunto" />
          </div>
          <div className="flex gap-2">
            <button onClick={saveContent} disabled={saving || !editSubject.trim() || !editDescription.trim()} className={btnPrimary}>Guardar</button>
            <button onClick={() => setEditing(false)} disabled={saving} className="rounded-xl border border-[#E2E8F0] px-3.5 py-2 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">Cancelar</button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold text-[#1A1A1A]">{detail.subject}</p>
            {editableNow && (
              <button onClick={startEdit} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-[#27B1B8] hover:bg-[#F8FAFC]">
                <MdEdit size={13} /> Editar
              </button>
            )}
          </div>
          <p className="mt-0.5 text-xs text-[#94A3B8]">
            {detail.category.name} · Creado por {detail.employee.user.fullName} · {fmt(detail.createdAt)}
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={labelCls}>Estado</label>
          <SimpleSelect
            value={detail.status}
            disabled={saving}
            onChange={updateStatus}
            options={[
              { value: "PENDIENTE", label: "Pendiente" },
              { value: "EN_PROCESO", label: "En proceso" },
              { value: "ESPERANDO_RESPUESTA", label: "Esperando respuesta" },
              { value: "FINALIZADO", label: "Finalizado" },
              { value: "CANCELADO", label: "Cancelado" },
            ]}
          />
        </div>
        <div>
          <label className={labelCls}>Responsable</label>
          {canManageAssignment ? (
            <SimpleSelect
              value={detail.responsible?.id ?? ""}
              disabled={saving}
              onChange={assign}
              options={[{ value: "", label: "Sin asignar" }, ...staff.map((s) => ({ value: s.id, label: s.fullName }))]}
            />
          ) : (
            <div className="flex h-[38px] items-center rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-sm text-[#64748B]">
              {detail.responsible?.fullName ?? "Sin asignar"}
            </div>
          )}
        </div>
        <div>
          <label className={labelCls}>Prioridad</label>
          {canManageAssignment ? (
            <SimpleSelect
              value={detail.priority}
              disabled={saving}
              onChange={updatePriority}
              options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))}
            />
          ) : (
            <div className="flex h-[38px] items-center rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-sm text-[#64748B]">
              {PRIORITY_LABELS[detail.priority] ?? detail.priority}
            </div>
          )}
        </div>
        <div>
          <label className={labelCls}>Vence</label>
          <div className="flex h-[38px] items-center rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-sm text-[#64748B]">
            {detail.dueDate ? fmt(detail.dueDate) : "—"}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] px-2.5 py-1 font-semibold text-[#64748B]">
          SLA: {TICKET_SLA_LABELS[detail.priority] ?? "—"}
        </span>
        {isTicketOverdue(detail) && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FEE2E2] px-2.5 py-1 font-bold text-[#DC2626]">Vencida</span>
        )}
        {detail.resolvedAt && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#DCFCE7] px-2.5 py-1 font-semibold text-[#16A34A]">
            Resuelta el {fmt(detail.resolvedAt)}
          </span>
        )}
        {detail.location && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] px-2.5 py-1 font-semibold text-[#64748B]">Ubicación: {detail.location}</span>
        )}
      </div>

      <div>
        <label className={labelCls}>Descripción de la solicitud</label>
        {editing ? (
          <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={4} className={inputCls} aria-label="Descripción" />
        ) : (
          <div className="rounded-xl bg-[#F8FAFC] p-3 text-sm text-[#1A1A1A] whitespace-pre-wrap">{detail.description}</div>
        )}
      </div>

      {detail.extraFields && Object.keys(detail.extraFields).length > 0 && (
        <div>
          <label className={labelCls}>Información adicional</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {Object.entries(detail.extraFields).map(([key, value]) => (
              <div key={key} className="rounded-xl bg-[#F8FAFC] px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">{key}</p>
                <p className="text-sm text-[#1A1A1A]">{String(value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className={labelCls}>Adjuntos {detail.attachments?.length ? `(${detail.attachments.length})` : ""}</label>
        <div className="flex flex-wrap items-center gap-2">
          {detail.attachments?.map((a) => (
            <span key={a.id} className="inline-flex items-center overflow-hidden rounded-lg border border-[#E2E8F0]">
              <button
                onClick={() => openAttachment(a)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#64748B] hover:bg-[#F8FAFC]"
              >
                <MdAttachFile size={14} /> {a.name}{a.size ? ` · ${fileSize(a.size)}` : ""}
              </button>
              <button
                onClick={() => deleteAttachment(a.id, a.name)}
                className="flex h-full items-center border-l border-[#E2E8F0] px-1.5 py-1.5 text-[#94A3B8] hover:bg-[#FEE2E2] hover:text-[#DC2626]"
                aria-label={`Eliminar ${a.name}`}
              >
                <MdClose size={14} />
              </button>
            </span>
          ))}
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-[#E2E8F0] px-2.5 py-1.5 text-xs font-bold text-[#27B1B8] hover:bg-[#F8FAFC]">
            <MdUploadFile size={14} /> {uploading ? "Subiendo…" : "Adjuntar archivo"}
            <input
              type="file"
              className="hidden"
              disabled={uploading}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAttachment(f); e.target.value = ""; }}
            />
          </label>
        </div>
      </div>

      <div>
        <label className={labelCls}>Comentarios {detail.comments?.length ? `(${detail.comments.length})` : ""}</label>
        {detail.comments?.length ? (
          <div className="max-h-48 space-y-3 overflow-y-auto rounded-xl border border-[#E2E8F0] p-3">
            {detail.comments.map((c) => (
              <div key={c.id} className="flex items-start gap-2 text-sm">
                <Avatar name={c.user.fullName} />
                <div>
                  <span className="font-bold text-[#1A1A1A]">{c.user.fullName}</span>{" "}
                  <span className="text-xs text-[#94A3B8]">{fmt(c.createdAt)}</span>
                  <p className="text-[#64748B]">{c.message}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#94A3B8]">Sin comentarios.</p>
        )}
        <div className="mt-2 flex gap-2">
          <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Escribe un comentario…" className={inputCls} />
          <button onClick={sendComment} disabled={saving || !comment.trim()} className={btnPrimary}><MdSend size={16} /></button>
        </div>
      </div>

      <div>
        <label className={labelCls}>Historial {detail.events?.length ? `(${detail.events.length})` : ""}</label>
        {detail.events?.length ? (
          <div className="max-h-52 space-y-3 overflow-y-auto rounded-xl border border-[#E2E8F0] p-3">
            {detail.events.map((e) => (
              <div key={e.id} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#27B1B8]" />
                <div>
                  <p className="text-[#1A1A1A]">{ticketEventText(e)}</p>
                  <p className="text-xs text-[#94A3B8]">{e.actor?.fullName ?? "Sistema"} · {fmt(e.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#94A3B8]">Sin movimientos registrados.</p>
        )}
      </div>

      {preview && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" onClick={() => setPreview(null)}>
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] px-4 py-3">
              <p className="truncate text-sm font-bold text-[#1A1A1A]">{preview.name}</p>
              <div className="flex shrink-0 items-center gap-2">
                <a href={preview.url} download={preview.name} className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] px-2.5 py-1.5 text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC]">
                  <MdDownload size={14} /> Descargar
                </a>
                <button onClick={() => setPreview(null)} className="text-[#94A3B8] hover:text-[#1A1A1A]" aria-label="Cerrar"><MdClose size={18} /></button>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[#F8FAFC] p-3">
              {/\.(jpe?g|png|gif|webp|svg|avif|bmp)$/i.test(preview.name) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.url} alt={preview.name} className="max-h-[75vh] max-w-full rounded-lg object-contain" />
              ) : /\.pdf$/i.test(preview.name) ? (
                <iframe src={preview.url} title={preview.name} className="h-[75vh] w-full rounded-lg border border-[#E2E8F0] bg-white" />
              ) : (
                <p className="py-10 text-center text-sm text-[#94A3B8]">Vista previa no disponible. Usa «Descargar».</p>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] rounded-xl bg-[#16A34A] px-4 py-3 text-sm font-bold text-white shadow-2xl">
          {toast}
        </div>
      )}
    </Modal>
  );
}

type PendingFile = { path: string; name: string; size: number; uploading?: boolean };

const FILE_ICON_STYLE: { test: (name: string) => boolean; bg: string; fg: string }[] = [
  { test: (n) => /\.pdf$/i.test(n), bg: "bg-[#FEE2E2]", fg: "text-[#DC2626]" },
  { test: (n) => /\.(jpe?g|png|webp)$/i.test(n), bg: "bg-[#DBEAFE]", fg: "text-[#2563EB]" },
  { test: (n) => /\.(xlsx?|csv)$/i.test(n), bg: "bg-[#DCFCE7]", fg: "text-[#16A34A]" },
];

function FileIcon({ name }: { name: string }) {
  const style = FILE_ICON_STYLE.find((s) => s.test(name)) ?? { bg: "bg-[#F1F5F9]", fg: "text-[#64748B]" };
  return (
    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.bg} ${style.fg}`}>
      <MdInsertDriveFile size={15} />
    </div>
  );
}

function NewTicketModal({ categories, responsiblesByDept, onClose, onDone, onError }: {
  categories: Category[];
  responsiblesByDept: Record<string, StaffUser[]>;
  onClose: () => void;
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [responsibleId, setResponsibleId] = useState("");
  const [priority, setPriority] = useState("MEDIA");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [location, setLocation] = useState("");
  const [extraFields, setExtraFields] = useState<Record<string, string>>({});

  const category = categories.find((c) => c.id === categoryId);
  const responsibles = category ? responsiblesForCategory(responsiblesByDept, category.allowedDepartmentIds) : [];
  const fieldsSchema = category?.fieldsSchema ?? [];
  const missingRequired = fieldsSchema.some((f) => f.required && !String(extraFields[f.key] ?? "").trim());

  const changeCategory = (id: string) => {
    setCategoryId(id);
    setResponsibleId("");
    setExtraFields({});
  };

  const uploadFiles = async (fileList: FileList | File[]) => {
    setFileError(null);
    for (const file of Array.from(fileList)) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/rrhh-local/tickets/upload", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setFiles((prev) => [...prev, { path: data.path, name: data.name, size: data.size }]);
      } else {
        setFileError(data.error || "No fue posible subir el archivo");
      }
    }
  };

  const removeFile = (path: string) => setFiles((prev) => prev.filter((f) => f.path !== path));

  const submit = async () => {
    setSubmitting(true);
    const res = await post("/api/rrhh-local/tickets", { categoryId, priority, subject, description, location: location || null, extraFields, responsibleId: responsibleId || null, attachments: files.map(({ path, name, size }) => ({ path, name, size })) });
    setSubmitting(false);
    if (res.ok) onDone("Solicitud enviada"); else onError(res.error!);
  };

  return (
    <Modal title="Nueva solicitud" onClose={onClose} footer={<Footer onClose={onClose} onSubmit={submit} submitting={submitting} disabled={!categoryId || !subject.trim() || !description.trim() || missingRequired || (responsibles.length > 0 && !responsibleId)} />}>
      <div>
        <label className={labelCls}>Tipo de solicitud</label>
        <SimpleSelect
          value={categoryId}
          onChange={changeCategory}
          options={categories.map((c) => ({
            value: c.id,
            label: (
              <span className="flex items-center gap-2.5">
                <CategoryIcon name={c.name} icon={c.icon} />
                {c.name}
              </span>
            ),
          }))}
        />
      </div>

      {responsibles.length > 0 && (
        <div>
          <label className={labelCls}>Asignar a</label>
          <SimpleSelect
            value={responsibleId}
            onChange={setResponsibleId}
            options={[{ value: "", label: "Selecciona un responsable" }, ...responsibles.map((s) => ({ value: s.id, label: s.fullName }))]}
          />
          <p className="mt-1.5 text-xs text-[#94A3B8]">Personas del departamento asociado a esta categoría.</p>
        </div>
      )}

      <div>
        <label className={labelCls}>Prioridad</label>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(PRIORITY_LABELS).map(([value, label]) => {
            const active = priority === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setPriority(value)}
                className={`flex flex-col items-center gap-1 rounded-xl border px-1.5 py-2.5 ${active ? "border-[#27B1B8] bg-[#E6FAFB]" : "border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]"}`}
              >
                <span className={`h-2 w-2 rounded-full ${PRIORITY_DOT[value]}`} />
                <span className={`text-xs ${active ? "font-extrabold text-[#0C535B]" : "font-bold text-[#64748B]"}`}>{label}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-xs text-[#94A3B8]">Plazo estimado de respuesta: <strong className="text-[#64748B]">{TICKET_SLA_LABELS[priority]}</strong></p>
      </div>

      <div>
        <label className={labelCls}>Asunto</label>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} placeholder="Ej. Solicitud de resma de papel" />
      </div>

      <div>
        <label className={labelCls}>Descripción</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={inputCls} placeholder="Describe con detalle tu solicitud…" />
      </div>

      {fieldsSchema.map((f) => (
        <div key={f.key}>
          <label className={labelCls}>{f.label}{f.required ? " *" : ""}</label>
          {f.type === "select" ? (
            <SimpleSelect
              value={extraFields[f.key] ?? ""}
              onChange={(v) => setExtraFields((p) => ({ ...p, [f.key]: v }))}
              placeholder="Selecciona"
              options={(f.options ?? []).map((o) => ({ value: o, label: o }))}
            />
          ) : f.type === "boolean" ? (
            <SimpleSelect
              value={extraFields[f.key] ?? ""}
              onChange={(v) => setExtraFields((p) => ({ ...p, [f.key]: v }))}
              placeholder="Selecciona"
              options={[{ value: "Sí", label: "Sí" }, { value: "No", label: "No" }]}
            />
          ) : (
            <input value={extraFields[f.key] ?? ""} onChange={(e) => setExtraFields((p) => ({ ...p, [f.key]: e.target.value }))} className={inputCls} />
          )}
        </div>
      ))}

      <div>
        <label className={labelCls}>Ubicación</label>
        <SimpleSelect
          value={location}
          onChange={setLocation}
          placeholder="Selecciona ubicación"
          options={TICKET_LOCATIONS.map((l) => ({ value: l, label: l }))}
        />
      </div>

      <div>
        <label className={labelCls}>Adjuntos <span className="font-medium normal-case text-[#94A3B8]">(opcional)</span></label>
        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files); }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed px-4 py-5 text-center ${dragOver ? "border-[#27B1B8] bg-[#E6FAFB]" : "border-[#CBD5E1] bg-[#F8FAFC] hover:bg-[#F1F5F9]"}`}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#E6FAFB]">
            <MdUploadFile size={19} className="text-[#27B1B8]" />
          </div>
          <div>
            <p className="text-[13.5px] font-bold text-[#1A1A1A]">Arrastra tus archivos aquí</p>
            <p className="mt-0.5 text-xs text-[#94A3B8]">o <span className="font-bold text-[#27B1B8] underline">explora tus archivos</span> · PDF, Word, Excel, JPG, PNG · máx. 10 MB</p>
          </div>
          <input type="file" multiple className="hidden" onChange={(e) => { if (e.target.files?.length) uploadFiles(e.target.files); e.target.value = ""; }} />
        </label>

        {fileError && <p className="mt-1.5 text-xs font-semibold text-red-500">{fileError}</p>}

        {files.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5">
            {files.map((f) => (
              <div key={f.path} className="flex items-center gap-2.5 rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-2">
                <FileIcon name={f.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-[#1A1A1A]">{f.name}</p>
                  <p className="text-[11.5px] text-[#94A3B8]">{fileSize(f.size)}</p>
                </div>
                <button type="button" onClick={() => removeFile(f.path)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#94A3B8] hover:text-[#1A1A1A]">
                  <MdClose size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
