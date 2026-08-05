"use client";
import { useEffect, useMemo, useState } from "react";
import {
  MdSchedule, MdAutorenew, MdCheckCircle, MdPriorityHigh,
  MdClose, MdSend, MdSearch, MdFileDownload, MdChair, MdComputer, MdCheckroom,
  MdApartment, MdBuild, MdShoppingCart, MdDirectionsCar, MdDescription, MdInventory2, MdMoreHoriz,
  MdAttachFile, MdHistory, MdArticle, MdCheck,
} from "react-icons/md";
import { DonutChart } from "@/app/panel/_components/mini-charts";
import { SimpleSelect } from "@/app/panel/_components/simple-select";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";

async function openTicketAttachment(url: string) {
  if (/^https?:\/\//i.test(url)) {
    window.open(url, "_blank", "noreferrer");
    return;
  }
  const res = await fetch(`/api/rrhh-local/tickets/download?path=${encodeURIComponent(url)}`);
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.url) window.open(data.url, "_blank", "noreferrer");
}

type StaffUser = { id: string; fullName: string; role: string };
type Comment = { id: string; message: string; createdAt: string; user: { fullName: string } };
type Category = { id: string; name: string; icon: string | null };

type Ticket = {
  id: string;
  code: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  location: string | null;
  extraFields: Record<string, string>;
  createdAt: string;
  category: { name: string };
  employee: { user: { fullName: string } };
  responsible: { id: string; fullName: string } | null;
  attachments: { url: string; name: string }[];
  comments?: Comment[];
};

const PRIORITY_LABELS: Record<string, string> = { BAJA: "Baja", MEDIA: "Media", ALTA: "Alta", URGENTE: "Urgente" };
const PRIORITY_STYLE: Record<string, string> = {
  BAJA: "bg-[#F1F5F9] text-[#64748B]",
  MEDIA: "bg-[#DBEAFE] text-[#2563EB]",
  ALTA: "bg-[#FEF3C7] text-[#B45309]",
  URGENTE: "bg-[#FEE2E2] text-[#DC2626]",
};
const STATUS_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente",
  EN_PROCESO: "En proceso",
  ESPERANDO_RESPUESTA: "Esperando respuesta",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};
const STATUS_STYLE: Record<string, string> = {
  PENDIENTE: "bg-[#FEF3C7] text-[#B45309]",
  EN_PROCESO: "bg-[#DBEAFE] text-[#2563EB]",
  ESPERANDO_RESPUESTA: "bg-[#EDE9FE] text-[#7C3AED]",
  FINALIZADO: "bg-[#DCFCE7] text-[#16A34A]",
  CANCELADO: "bg-[#F1F5F9] text-[#64748B]",
};
const CATEGORY_ICON: Record<string, React.ElementType> = {
  Mobiliario: MdChair,
  "Soporte TI": MdComputer,
  Dotación: MdCheckroom,
  Infraestructura: MdApartment,
  Mantenimiento: MdBuild,
  Compras: MdShoppingCart,
  Vehículos: MdDirectionsCar,
  Documentación: MdDescription,
  Inventario: MdInventory2,
  Otro: MdMoreHoriz,
};
const CATEGORY_COLORS = ["#27B1B8", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#64748B", "#EF4444"];

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

export default function SolicitudesPanelPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Ticket | null>(null);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<"detalles" | "historial" | "adjuntos">("detalles");
  const [pendingStatus, setPendingStatus] = useState("");
  const PAGE_SIZE = 8;

  const load = async () => {
    const [tRes, sRes, cRes] = await Promise.all([
      fetch("/api/rrhh-local/tickets"),
      fetch("/api/rrhh-local/tickets/staff"),
      fetch("/api/rrhh-local/ticket-categories"),
    ]);
    if (tRes.ok) setTickets(await tRes.json());
    if (sRes.ok) setStaff(await sRes.json());
    if (cRes.ok) setCategories(await cRes.json());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useRealtimeRefresh(["tickets"], () => {
    load();
    if (selectedId) loadDetail(selectedId);
  });

  const loadDetail = async (id: string) => {
    setSelectedId(id);
    setTab("detalles");
    const fromList = tickets.find((t) => t.id === id);
    if (fromList) {
      setDetail(fromList);
      setPendingStatus(fromList.status);
    }
    const res = await fetch(`/api/rrhh-local/tickets/${id}`);
    if (res.ok) {
      const data = await res.json();
      setDetail(data);
      setPendingStatus(data.status);
    }
  };

  const kpis = useMemo(() => ({
    pendientes: tickets.filter((t) => t.status === "PENDIENTE").length,
    enProceso: tickets.filter((t) => t.status === "EN_PROCESO").length,
    finalizadas: tickets.filter((t) => t.status === "FINALIZADO").length,
    urgentes: tickets.filter((t) => t.priority === "URGENTE" && t.status !== "FINALIZADO" && t.status !== "CANCELADO").length,
  }), [tickets]);

  const filtered = useMemo(() => tickets.filter((t) => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (categoryFilter && t.category.name !== categoryFilter) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.code.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q) || t.employee.user.fullName.toLowerCase().includes(q);
    }
    return true;
  }), [tickets, search, statusFilter, categoryFilter, priorityFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const distribution = useMemo(() => {
    const counts = new Map<string, number>();
    tickets.forEach((t) => counts.set(t.category.name, (counts.get(t.category.name) ?? 0) + 1));
    return Array.from(counts.entries())
      .map(([label, value], i) => ({ label, value, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }))
      .sort((a, b) => b.value - a.value);
  }, [tickets]);

  const updateTicket = async (patch: Record<string, unknown>, optimistic?: Partial<Ticket>) => {
    if (!detail) return;
    if (optimistic) setDetail((d) => (d ? { ...d, ...optimistic } : d));
    setSaving(true);
    setError("");
    const res = await fetch(`/api/rrhh-local/tickets/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const updated = await res.json();
      setDetail(updated);
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No fue posible actualizar el ticket");
    }
    setSaving(false);
  };

  const sendComment = async () => {
    if (!detail || !comment.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/rrhh-local/tickets/${detail.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: comment }),
    });
    if (res.ok) {
      setComment("");
      await loadDetail(detail.id);
    } else setError("No fue posible enviar el comentario");
    setSaving(false);
  };

  const exportCsv = () => {
    const rows = [
      ["Ticket", "Tipo", "Solicitante", "Fecha", "Prioridad", "Estado", "Responsable"],
      ...filtered.map((t) => [t.code, t.category.name, t.employee.user.fullName, fmt(t.createdAt), PRIORITY_LABELS[t.priority], STATUS_LABELS[t.status], t.responsible?.fullName || "Sin asignar"]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "solicitudes.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="p-6 text-sm text-[#64748B]">Cargando…</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-[#1A1A1A]">Solicitudes</h1>
          <p className="text-xs text-[#64748B]">Gestiona todas las solicitudes internas del equipo.</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Kpi value={kpis.pendientes} label="Pendientes" hint="Solicitudes esperando atención" icon={<MdSchedule size={20} />} tone="bg-[#FEF3C7] text-[#B45309]" />
        <Kpi value={kpis.enProceso} label="En proceso" hint="Solicitudes en ejecución" icon={<MdAutorenew size={20} />} tone="bg-[#DBEAFE] text-[#2563EB]" />
        <Kpi value={kpis.finalizadas} label="Finalizadas" hint="Solicitudes completadas" icon={<MdCheckCircle size={20} />} tone="bg-[#DCFCE7] text-[#16A34A]" />
        <Kpi value={kpis.urgentes} label="Urgentes" hint="Solicitudes de alta prioridad" icon={<MdPriorityHigh size={20} />} tone="bg-[#FEE2E2] text-[#DC2626]" />
      </div>

      <div className="space-y-6">
        <div className="min-w-0 space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2">
              <MdSearch size={16} className="text-[#94A3B8]" />
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar ticket, asunto o solicitante…"
                className="w-full text-sm text-[#1A1A1A] outline-none" />
            </div>
            <SimpleSelect
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); setPage(1); }}
              options={[
                { value: "", label: "Estado: Todos" },
                ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
              ]}
            />
            <SimpleSelect
              value={categoryFilter}
              onChange={(v) => { setCategoryFilter(v); setPage(1); }}
              options={[
                { value: "", label: "Tipo: Todos" },
                ...categories.map((c) => ({ value: c.name, label: c.name })),
              ]}
            />
            <SimpleSelect
              value={priorityFilter}
              onChange={(v) => { setPriorityFilter(v); setPage(1); }}
              options={[
                { value: "", label: "Prioridad: Todas" },
                ...Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label })),
              ]}
            />
            <button onClick={exportCsv}
              className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">
              <MdFileDownload size={16} /> Exportar
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-left text-xs font-bold text-[#64748B]">
                  <th className="p-3">Ticket</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Solicitante</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Prioridad</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Responsable</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((t) => (
                  <tr key={t.id} onClick={() => loadDetail(t.id)}
                    className={`cursor-pointer border-b border-[#F1F5F9] hover:bg-[#F8FAFC] ${selectedId === t.id ? "bg-[#F0FDFF]" : ""}`}>
                    <td className="p-3 font-mono text-xs font-bold text-[#27B1B8]">{t.code}</td>
                    <td className="p-3 text-[#1A1A1A]">{t.category.name}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E6FAFB] text-[10px] font-bold text-[#27B1B8]">
                          {initials(t.employee.user.fullName)}
                        </span>
                        <span className="text-[#1A1A1A]">{t.employee.user.fullName}</span>
                      </div>
                    </td>
                    <td className="p-3 text-[#64748B]">{fmt(t.createdAt)}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_STYLE[t.priority]}`}>{PRIORITY_LABELS[t.priority]}</span>
                    </td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[t.status]}`}>{STATUS_LABELS[t.status]}</span>
                    </td>
                    <td className="p-3 text-[#64748B]">{t.responsible?.fullName || "Sin asignar"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="p-6 text-sm text-[#94A3B8]">No hay solicitudes con estos filtros.</p>}
            {filtered.length > 0 && (
              <div className="flex items-center justify-between border-t border-[#E2E8F0] p-3 text-xs text-[#64748B]">
                <span>Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} resultados</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="rounded-lg border border-[#E2E8F0] px-2 py-1 disabled:opacity-40">‹</button>
                  <span className="px-2 font-bold text-[#1A1A1A]">{page} / {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="rounded-lg border border-[#E2E8F0] px-2 py-1 disabled:opacity-40">›</button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
              <h3 className="mb-1 text-sm font-black text-[#1A1A1A]">Filtrar por categoría</h3>
              <p className="mb-4 text-xs text-[#64748B]">Selecciona un tipo para filtrar la tabla</p>
              <div className="grid grid-cols-4 gap-3">
                {categories.map((c) => {
                  const Icon = CATEGORY_ICON[c.name] || MdMoreHoriz;
                  const active = categoryFilter === c.name;
                  return (
                    <button key={c.id} onClick={() => { setCategoryFilter(active ? "" : c.name); setPage(1); }}
                      className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center hover:border-[#27B1B8] hover:bg-[#F0FDFF] ${active ? "border-[#27B1B8] bg-[#F0FDFF]" : "border-[#E2E8F0]"}`}>
                      <Icon size={22} className="text-[#27B1B8]" />
                      <span className="text-[10px] font-bold text-[#64748B]">{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
              <h3 className="mb-4 text-sm font-black text-[#1A1A1A]">Solicitudes por categoría</h3>
              {distribution.length > 0 ? (
                <div className="flex items-center gap-4">
                  <DonutChart slices={distribution} size={120} thickness={20} />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    {distribution.map((d) => (
                      <div key={d.label} className="flex items-center gap-2 text-xs">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="min-w-0 flex-1 truncate text-[#64748B]">{d.label}</span>
                        <span className="font-bold text-[#1A1A1A]">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="text-sm text-[#94A3B8]">Sin solicitudes todavía.</p>}
            </div>
          </div>
        </div>

      </div>

      {detail && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onClick={() => { setDetail(null); setSelectedId(null); }}>
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b border-[#E2E8F0] p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E6FAFB] text-[#27B1B8]">
                  {(() => { const Icon = CATEGORY_ICON[detail.category.name] || MdMoreHoriz; return <Icon size={22} />; })()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-[#1A1A1A]">{detail.code}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[detail.status]}`}>{STATUS_LABELS[detail.status]}</span>
                  </div>
                  <p className="text-sm text-[#64748B]">{detail.subject}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {(detail.priority === "ALTA" || detail.priority === "URGENTE") && (
                  <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${PRIORITY_STYLE[detail.priority]}`}>
                    <MdPriorityHigh size={13} /> {PRIORITY_LABELS[detail.priority]} prioridad
                  </span>
                )}
                <button onClick={() => { setDetail(null); setSelectedId(null); }} className="shrink-0 text-[#64748B]"><MdClose size={20} /></button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              <div className="min-w-0 flex-1 overflow-y-auto p-5">
                <div className="flex gap-4 border-b border-[#E2E8F0] text-sm font-bold text-[#64748B]">
                  <button onClick={() => setTab("detalles")}
                    className={`flex items-center gap-1.5 border-b-2 pb-2 ${tab === "detalles" ? "border-[#27B1B8] text-[#27B1B8]" : "border-transparent"}`}>
                    <MdArticle size={16} /> Detalles
                  </button>
                  <button onClick={() => setTab("historial")}
                    className={`flex items-center gap-1.5 border-b-2 pb-2 ${tab === "historial" ? "border-[#27B1B8] text-[#27B1B8]" : "border-transparent"}`}>
                    <MdHistory size={16} /> Historial
                  </button>
                  <button onClick={() => setTab("adjuntos")}
                    className={`flex items-center gap-1.5 border-b-2 pb-2 ${tab === "adjuntos" ? "border-[#27B1B8] text-[#27B1B8]" : "border-transparent"}`}>
                    <MdAttachFile size={16} /> Adjuntos ({detail.attachments.length})
                  </button>
                </div>

                {tab === "detalles" && (
                  <div className="mt-4 space-y-5">
                    <div>
                      <h4 className="mb-3 text-sm font-black text-[#1A1A1A]">Información de la solicitud</h4>
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                        <Field label="Solicitante" value={detail.employee.user.fullName} />
                        <Field label="Tipo" value={detail.category.name} />
                        <Field label="Fecha de creación" value={fmt(detail.createdAt)} />
                        {detail.location && <Field label="Ubicación" value={detail.location} />}
                        <Field label="Prioridad" value={PRIORITY_LABELS[detail.priority]} />
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-2 text-sm font-black text-[#1A1A1A]">Descripción</h4>
                      <p className="whitespace-pre-line text-sm text-[#64748B]">{detail.description}</p>
                    </div>

                    {Object.keys(detail.extraFields || {}).length > 0 && (
                      <div className="rounded-lg border border-[#E2E8F0] p-4">
                        <div className="grid grid-cols-2 gap-3">
                          {Object.entries(detail.extraFields).map(([k, v]) => v && <Field key={k} label={k} value={String(v)} />)}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {tab === "historial" && (
                  <div className="mt-4 space-y-3">
                    {(detail.comments || []).length === 0 && <p className="text-sm text-[#94A3B8]">Sin historial todavía.</p>}
                    {(detail.comments || []).map((c) => (
                      <div key={c.id} className="rounded-lg bg-[#F8FAFC] p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#1A1A1A]">{c.user.fullName}</span>
                          <span className="text-[10px] text-[#94A3B8]">{fmt(c.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-sm text-[#64748B]">{c.message}</p>
                      </div>
                    ))}
                  </div>
                )}

                {tab === "adjuntos" && (
                  <div className="mt-4 space-y-2">
                    {detail.attachments.length === 0 && <p className="text-sm text-[#94A3B8]">Sin archivos adjuntos.</p>}
                    {detail.attachments.map((a, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-[#E2E8F0] p-3">
                        <span className="text-sm font-bold text-[#1A1A1A]">{a.name}</span>
                        <button type="button" onClick={() => openTicketAttachment(a.url)}
                          className="text-xs font-bold text-[#27B1B8] hover:underline">Descargar</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-80 shrink-0 overflow-y-auto border-l border-[#E2E8F0] bg-[#F8FAFC] p-5">
                <div>
                  <p className="text-xs font-bold text-[#64748B]">Estado actual</p>
                  <span className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[detail.status]}`}>{STATUS_LABELS[detail.status]}</span>
                </div>

                <div className="mt-5">
                  <p className="text-xs font-bold text-[#64748B]">Responsable</p>
                  <SimpleSelect
                    value={detail.responsible?.id || ""}
                    onChange={(v) => {
                      const chosen = staff.find((s) => s.id === v) || null;
                      updateTicket({ responsibleId: v || null }, { responsible: chosen });
                    }}
                    className="mt-1 w-full"
                    disabled={saving}
                    options={[
                      { value: "", label: "Sin asignar" },
                      ...staff.map((s) => ({ value: s.id, label: s.fullName })),
                    ]}
                  />
                </div>

                <div className="mt-6">
                  <p className="text-xs font-bold text-[#64748B]">Actividad</p>
                  <div className="mt-2 max-h-48 space-y-3 overflow-y-auto">
                    {(detail.comments || []).slice(-4).map((c) => (
                      <div key={c.id}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#1A1A1A]">{c.user.fullName}</span>
                          <span className="text-[10px] text-[#94A3B8]">{fmt(c.createdAt)}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-[#64748B]">{c.message}</p>
                      </div>
                    ))}
                    {(!detail.comments || detail.comments.length === 0) && (
                      <p className="text-xs text-[#94A3B8]">Sin actualizaciones todavía.</p>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Escribe un comentario…"
                      onKeyDown={(e) => e.key === "Enter" && sendComment()}
                      className="flex-1 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-[#1A1A1A]" />
                    <button onClick={sendComment} disabled={saving || !comment.trim()}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#27B1B8] text-white disabled:opacity-50">
                      <MdSend size={14} />
                    </button>
                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-xs font-bold text-[#64748B]">Cambiar estado</p>
                  <SimpleSelect
                    value={pendingStatus}
                    onChange={setPendingStatus}
                    className="mt-1 w-full"
                    options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
                  />
                  <button onClick={() => updateTicket({ status: pendingStatus })} disabled={saving || pendingStatus === detail.status}
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#27B1B8] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
                    <MdCheck size={16} /> Guardar cambio de estado
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-bold text-[#64748B]">{label}</p>
      <p className="truncate text-sm text-[#1A1A1A]">{value}</p>
    </div>
  );
}

function Kpi({ value, label, hint, icon, tone }: { value: number; label: string; hint: string; icon: React.ReactNode; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tone}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-2xl font-black text-[#1A1A1A]">{value}</p>
        <p className="text-xs font-bold text-[#64748B]">{label}</p>
        <p className="truncate text-[11px] text-[#94A3B8]">{hint}</p>
      </div>
    </div>
  );
}
