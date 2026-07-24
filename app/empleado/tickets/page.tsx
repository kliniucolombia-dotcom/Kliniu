"use client";
import { useEffect, useMemo, useState } from "react";
import {
  MdConfirmationNumber, MdAdd, MdClose, MdAttachFile, MdSchedule, MdCheckCircle,
  MdAutorenew, MdSend, MdSearch, MdChevronRight, MdComputer, MdChair, MdCheckroom,
  MdApartment, MdBuild, MdShoppingCart, MdDirectionsCar, MdDescription, MdInventory2,
  MdMoreHoriz, MdHeadsetMic, MdOpenInNew, MdInbox, MdCalendarToday, MdPerson,
  MdArrowBack, MdArticle, MdHistory, MdMoreVert, MdCancel, MdPlace, MdCategory, MdFlag,
} from "react-icons/md";
import { DonutChart } from "@/app/panel/_components/mini-charts";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";

type FieldDef = {
  key: string;
  label: string;
  type: "text" | "select" | "boolean";
  options?: string[];
  required?: boolean;
};

type Category = {
  id: string;
  name: string;
  icon: string | null;
  fieldsSchema: FieldDef[];
};

type Attachment = { url: string; name: string; size?: number };

type Comment = { id: string; message: string; createdAt: string; user: { fullName: string } };

type Ticket = {
  id: string;
  code: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  location: string | null;
  extraFields?: Record<string, string>;
  createdAt: string;
  category: { name: string };
  responsible: { fullName: string } | null;
  attachments?: { url: string; name: string }[];
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
const LOCATIONS = ["Oficina", "Bodega", "Producción", "Planta", "Comercial", "Otro"];
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
const CATEGORY_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#27B1B8", "#EC4899", "#64748B", "#EF4444"];
const QUICK_ACCESS = [
  { name: "Soporte TI", hint: "Solicitar ayuda técnica" },
  { name: "Mobiliario", hint: "Sillas, escritorios y más" },
  { name: "Dotación", hint: "Uniformes y elementos" },
  { name: "Infraestructura", hint: "Mantenimiento y reparaciones" },
];

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

export default function TicketsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [presetCategoryId, setPresetCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [sort, setSort] = useState<"recientes" | "antiguas">("recientes");
  const [detail, setDetail] = useState<Ticket | null>(null);
  const [detailTab, setDetailTab] = useState<"detalles" | "actividad" | "adjuntos">("detalles");
  const [menuOpen, setMenuOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [cRes, tRes] = await Promise.all([
      fetch("/api/rrhh-local/ticket-categories"),
      fetch("/api/rrhh-local/tickets"),
    ]);
    if (cRes.ok) setCategories(await cRes.json());
    if (tRes.ok) setTickets(await tRes.json());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useRealtimeRefresh(["tickets"], () => {
    load();
    if (detail) refreshDetail();
  });

  const kpis = useMemo(() => ({
    pendientes: tickets.filter((t) => t.status === "PENDIENTE").length,
    enProceso: tickets.filter((t) => t.status === "EN_PROCESO").length,
    finalizadas: tickets.filter((t) => t.status === "FINALIZADO").length,
  }), [tickets]);

  const filtered = useMemo(() => {
    let list = tickets.filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (categoryFilter && t.category.name !== categoryFilter) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return t.code.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q) || t.category.name.toLowerCase().includes(q);
      }
      return true;
    });
    list = [...list].sort((a, b) => sort === "recientes"
      ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return list;
  }, [tickets, search, statusFilter, categoryFilter, priorityFilter, sort]);

  const distribution = useMemo(() => {
    const counts = new Map<string, number>();
    tickets.forEach((t) => counts.set(t.category.name, (counts.get(t.category.name) ?? 0) + 1));
    return Array.from(counts.entries())
      .map(([label, value], i) => ({ label, value, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }))
      .sort((a, b) => b.value - a.value);
  }, [tickets]);

  const openNew = (categoryName?: string) => {
    const cat = categoryName ? categories.find((c) => c.name === categoryName) : null;
    setPresetCategoryId(cat?.id || "");
    setOpen(true);
  };

  const openDetail = async (id: string) => {
    const fromList = tickets.find((t) => t.id === id);
    if (fromList) setDetail(fromList);
    setDetailTab("detalles");
    setMenuOpen(false);
    const res = await fetch(`/api/rrhh-local/tickets/${id}`);
    if (res.ok) setDetail(await res.json());
  };

  const refreshDetail = async () => {
    if (!detail) return;
    const res = await fetch(`/api/rrhh-local/tickets/${detail.id}`);
    if (res.ok) setDetail(await res.json());
  };

  const cancelTicket = async () => {
    if (!detail) return;
    setSaving(true);
    const res = await fetch(`/api/rrhh-local/tickets/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELADO" }),
    });
    if (res.ok) {
      const updated = await res.json();
      setDetail(updated);
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } else setError("No fue posible cancelar la solicitud");
    setSaving(false);
    setMenuOpen(false);
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
      await refreshDetail();
    } else setError("No fue posible enviar el comentario");
    setSaving(false);
  };

  if (loading) return <div className="p-6 text-sm text-[#64748B]">Cargando…</div>;

  if (detail) {
    const Icon = CATEGORY_ICON[detail.category.name] || MdMoreHoriz;
    const STEPS: [string, string][] = [
      ["PENDIENTE", "Pendiente"], ["EN_PROCESO", "En proceso"],
      ["ESPERANDO_RESPUESTA", "Esperando respuesta"], ["FINALIZADO", "Finalizada"],
    ];
    const stepIndex = STEPS.findIndex(([k]) => k === detail.status);
    const cancelled = detail.status === "CANCELADO";

    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
          <button onClick={() => setDetail(null)} className="hover:text-[#27B1B8]">Centro de solicitudes</button>
          <MdChevronRight size={14} />
          <button onClick={() => setDetail(null)} className="hover:text-[#27B1B8]">Mis solicitudes</button>
          <MdChevronRight size={14} />
          <span className="font-bold text-[#1A1A1A]">{detail.code}</span>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 rounded-xl border border-[#E2E8F0] bg-white">
            <div className="flex items-start justify-between gap-3 border-b border-[#E2E8F0] p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#E6FAFB] text-[#27B1B8]">
                  <Icon size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-[#27B1B8]">{detail.code}</span>
                    <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-bold text-[#64748B]">{detail.category.name}</span>
                  </div>
                  <h1 className="mt-0.5 text-lg font-black text-[#1A1A1A]">{detail.subject}</h1>
                  <p className="mt-0.5 text-sm text-[#64748B]">{detail.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#94A3B8]">
                    <span className="flex items-center gap-1"><MdCalendarToday size={13} /> {fmt(detail.createdAt)}</span>
                    {detail.responsible && <span className="flex items-center gap-1"><MdPerson size={13} /> {detail.responsible.fullName}</span>}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${PRIORITY_STYLE[detail.priority]}`}>{PRIORITY_LABELS[detail.priority]}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_STYLE[detail.status]}`}>{STATUS_LABELS[detail.status]}</span>
                {detail.status === "PENDIENTE" && (
                  <div className="relative">
                    <button onClick={() => setMenuOpen((v) => !v)} className="rounded-lg border border-[#E2E8F0] p-1.5 text-[#64748B]"><MdMoreVert size={18} /></button>
                    {menuOpen && (
                      <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-[#E2E8F0] bg-white py-1 shadow-lg">
                        <button onClick={cancelTicket} disabled={saving}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#DC2626] hover:bg-[#FEF2F2]">
                          <MdCancel size={16} /> Cancelar solicitud
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 border-b border-[#E2E8F0] px-5 text-sm font-bold text-[#64748B]">
              <button onClick={() => setDetailTab("detalles")}
                className={`flex items-center gap-1.5 border-b-2 py-3 ${detailTab === "detalles" ? "border-[#27B1B8] text-[#27B1B8]" : "border-transparent"}`}>
                <MdArticle size={16} /> Detalles
              </button>
              <button onClick={() => setDetailTab("actividad")}
                className={`flex items-center gap-1.5 border-b-2 py-3 ${detailTab === "actividad" ? "border-[#27B1B8] text-[#27B1B8]" : "border-transparent"}`}>
                <MdHistory size={16} /> Actividad
              </button>
              <button onClick={() => setDetailTab("adjuntos")}
                className={`flex items-center gap-1.5 border-b-2 py-3 ${detailTab === "adjuntos" ? "border-[#27B1B8] text-[#27B1B8]" : "border-transparent"}`}>
                <MdAttachFile size={16} /> Adjuntos ({(detail.attachments || []).length})
              </button>
            </div>

            <div className="p-5">
              {detailTab === "detalles" && (
                <div className="space-y-5">
                  <div>
                    <h3 className="mb-3 text-sm font-black text-[#1A1A1A]">Información de la solicitud</h3>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      <DetailField icon={<MdCategory size={15} />} label="Tipo" value={detail.category.name} />
                      <DetailField icon={<MdFlag size={15} />} label="Prioridad" value={PRIORITY_LABELS[detail.priority]} />
                      <DetailField icon={<MdCalendarToday size={15} />} label="Fecha de creación" value={fmt(detail.createdAt)} />
                      {detail.location && <DetailField icon={<MdPlace size={15} />} label="Ubicación" value={detail.location} />}
                    </div>
                  </div>

                  {detail.extraFields && Object.keys(detail.extraFields).length > 0 && (
                    <div className="rounded-lg border border-[#E2E8F0] p-4">
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(detail.extraFields).map(([k, v]) => v && <DetailField key={k} label={k} value={String(v)} />)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {detailTab === "actividad" && (
                <div className="space-y-3">
                  {(detail.comments || []).length === 0 && <p className="text-sm text-[#94A3B8]">Sin actividad todavía.</p>}
                  {(detail.comments || []).map((c) => (
                    <div key={c.id} className="rounded-lg bg-[#F8FAFC] p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1A1A1A]">{c.user.fullName}</span>
                        <span className="text-[10px] text-[#94A3B8]">{fmt(c.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-sm text-[#64748B]">{c.message}</p>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-2">
                    <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Escribe un comentario…"
                      onKeyDown={(e) => e.key === "Enter" && sendComment()}
                      className="flex-1 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#1A1A1A]" />
                    <button onClick={sendComment} disabled={saving || !comment.trim()}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#27B1B8] text-white disabled:opacity-50">
                      <MdSend size={16} />
                    </button>
                  </div>
                </div>
              )}

              {detailTab === "adjuntos" && (
                <div className="space-y-2">
                  {(detail.attachments || []).length === 0 && <p className="text-sm text-[#94A3B8]">Sin archivos adjuntos.</p>}
                  {(detail.attachments || []).map((a, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-[#E2E8F0] p-3">
                      <span className="text-sm font-bold text-[#1A1A1A]">{a.name}</span>
                      <a href={/^https?:\/\//i.test(a.url) ? a.url : "#"} target="_blank" rel="noreferrer"
                        className="text-xs font-bold text-[#27B1B8] hover:underline">Descargar</a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-[#E2E8F0] p-5">
              <button onClick={() => setDetail(null)}
                className="flex items-center gap-1.5 text-sm font-bold text-[#64748B] hover:text-[#27B1B8]">
                <MdArrowBack size={16} /> Volver a mis solicitudes
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
              <p className="mb-3 text-xs font-bold text-[#64748B]">Estado actual</p>
              <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[detail.status]}`}>{STATUS_LABELS[detail.status]}</span>

              {!cancelled && (
                <div className="relative mt-5">
                  <div className="absolute left-[14px] right-[14px] top-[14px] h-0.5 bg-[#E2E8F0]">
                    <div className="h-full bg-[#27B1B8]" style={{ width: `${(stepIndex / (STEPS.length - 1)) * 100}%` }} />
                  </div>
                  <div className="relative flex items-start justify-between">
                    {STEPS.map(([, label], i) => (
                      <div key={label} className="flex w-14 flex-col items-center text-center">
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          i <= stepIndex ? "bg-[#27B1B8] text-white" : "bg-[#F1F5F9] text-[#94A3B8]"
                        }`}>{i + 1}</div>
                        <span className="mt-1 text-[10px] font-bold text-[#64748B]">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {detail.responsible && (
              <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
                <p className="mb-3 text-xs font-bold text-[#64748B]">Responsable actual</p>
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E6FAFB] text-xs font-bold text-[#27B1B8]">
                    {detail.responsible.fullName.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase()}
                  </span>
                  <p className="text-sm font-bold text-[#1A1A1A]">{detail.responsible.fullName}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E6FAFB] text-[#27B1B8]">
            <MdConfirmationNumber size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#1A1A1A]">Centro de solicitudes</h1>
            <p className="text-xs text-[#64748B]">Pide soporte TI, mobiliario, dotación y más.</p>
          </div>
        </div>
        <button onClick={() => openNew()}
          className="flex items-center gap-1.5 rounded-lg bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white hover:bg-[#1F9BA1]">
          <MdAdd size={18} /> Nueva solicitud
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi value={kpis.pendientes} label="Pendientes" hint="Solicitudes esperando atención" icon={<MdSchedule size={20} />} tone="bg-[#FEF3C7] text-[#B45309]" />
        <Kpi value={kpis.enProceso} label="En proceso" hint="Solicitudes en ejecución" icon={<MdAutorenew size={20} />} tone="bg-[#DBEAFE] text-[#2563EB]" />
        <Kpi value={kpis.finalizadas} label="Finalizadas" hint="Solicitudes completadas" icon={<MdCheckCircle size={20} />} tone="bg-[#DCFCE7] text-[#16A34A]" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 rounded-xl border border-[#E2E8F0] bg-white p-5">
          <h2 className="mb-4 text-sm font-black text-[#1A1A1A]">Mis solicitudes</h2>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="flex min-w-[180px] flex-1 items-center gap-2 rounded-lg border border-[#E2E8F0] px-3 py-2">
              <MdSearch size={16} className="text-[#94A3B8]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por ticket, asunto o tipo…"
                className="w-full text-sm text-[#1A1A1A] outline-none" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#1A1A1A]">
              <option value="">Estado: Todos</option>
              {Object.entries(STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#1A1A1A]">
              <option value="">Tipo: Todos</option>
              {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#1A1A1A]">
              <option value="">Prioridad: Todas</option>
              {Object.entries(PRIORITY_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value as "recientes" | "antiguas")}
              className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#1A1A1A]">
              <option value="recientes">Más recientes</option>
              <option value="antiguas">Más antiguas</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#F0FDFF]">
                <MdInbox size={40} className="text-[#27B1B8]" />
              </div>
              <p className="mt-4 text-sm font-black text-[#1A1A1A]">
                {tickets.length === 0 ? "No tienes solicitudes" : "No tienes más solicitudes"}
              </p>
              <p className="mt-1 text-xs text-[#94A3B8]">Cuando crees una nueva solicitud, aparecerá aquí.</p>
              <button onClick={() => openNew()}
                className="mt-4 flex items-center gap-1.5 rounded-lg bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white hover:bg-[#1F9BA1]">
                <MdAdd size={16} /> Nueva solicitud
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((t) => {
                const Icon = CATEGORY_ICON[t.category.name] || MdMoreHoriz;
                return (
                  <div key={t.id} onClick={() => openDetail(t.id)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#E2E8F0] p-3 hover:border-[#27B1B8] hover:bg-[#F0FDFF]">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F0FDFF] text-[#27B1B8]">
                      <Icon size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#27B1B8]">{t.code}</span>
                        <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-bold text-[#64748B]">{t.category.name}</span>
                      </div>
                      <p className="truncate text-sm font-bold text-[#1A1A1A]">{t.subject}</p>
                      <p className="truncate text-xs text-[#94A3B8]">{t.description}</p>
                      <div className="mt-1 flex items-center gap-3 text-[11px] text-[#94A3B8]">
                        <span className="flex items-center gap-1"><MdCalendarToday size={12} /> {fmt(t.createdAt)}</span>
                        {t.responsible && <span className="flex items-center gap-1"><MdPerson size={12} /> {t.responsible.fullName}</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_STYLE[t.priority]}`}>{PRIORITY_LABELS[t.priority]}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[t.status]}`}>{STATUS_LABELS[t.status]}</span>
                      <MdChevronRight size={18} className="text-[#94A3B8]" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
            <h3 className="mb-3 text-sm font-black text-[#1A1A1A]">Accesos rápidos</h3>
            <div className="space-y-1">
              {QUICK_ACCESS.map((q) => {
                const Icon = CATEGORY_ICON[q.name] || MdMoreHoriz;
                return (
                  <button key={q.name} onClick={() => openNew(q.name)}
                    className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-[#F8FAFC]">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F0FDFF] text-[#27B1B8]">
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#1A1A1A]">{q.name}</p>
                      <p className="truncate text-xs text-[#94A3B8]">{q.hint}</p>
                    </div>
                    <MdChevronRight size={16} className="shrink-0 text-[#94A3B8]" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
            <h3 className="mb-4 text-sm font-black text-[#1A1A1A]">Categorías populares</h3>
            {distribution.length > 0 ? (
              <>
                <div className="flex justify-center">
                  <DonutChart slices={distribution} size={120} thickness={20} />
                </div>
                <div className="mt-4 space-y-1.5">
                  {distribution.map((d) => (
                    <div key={d.label} className="flex items-center gap-2 text-xs">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="min-w-0 flex-1 truncate text-[#64748B]">{d.label}</span>
                      <span className="font-bold text-[#1A1A1A]">
                        {d.value} ({Math.round((d.value / tickets.length) * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : <p className="text-sm text-[#94A3B8]">Sin solicitudes todavía.</p>}
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
            <h3 className="mb-3 text-sm font-black text-[#1A1A1A]">¿Necesitas ayuda?</h3>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F0FDFF] text-[#27B1B8]">
                <MdHeadsetMic size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#1A1A1A]">Nuestro equipo está listo para ayudarte</p>
                <p className="text-xs text-[#94A3B8]">Horario de atención: L-V 8:00 a.m. - 5:00 p.m.</p>
              </div>
            </div>
            <a href="https://wa.me/573184001648?text=Hola%2C%20necesito%20ayuda%20con%20una%20solicitud."
              target="_blank" rel="noreferrer"
              className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-[#27B1B8] px-3 py-2 text-xs font-bold text-[#27B1B8] hover:bg-[#F0FDFF]">
              Contactar soporte <MdOpenInNew size={13} />
            </a>
          </div>
        </div>
      </div>

      {open && (
        <NewTicketModal categories={categories} presetCategoryId={presetCategoryId} onClose={() => setOpen(false)}
          onCreated={async () => { setOpen(false); await load(); }} setError={setError} />
      )}
    </div>
  );
}

function NewTicketModal({ categories, presetCategoryId, onClose, onCreated, setError }: {
  categories: Category[]; presetCategoryId: string; onClose: () => void; onCreated: () => void; setError: (e: string) => void;
}) {
  const [categoryId, setCategoryId] = useState(presetCategoryId);
  const [priority, setPriority] = useState("MEDIA");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [extraFields, setExtraFields] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const category = categories.find((c) => c.id === categoryId);

  const uploadFile = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/rrhh-local/tickets/upload", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setAttachments((prev) => [...prev, { url: data.url, name: data.name, size: data.size }]);
    else setError(data.error || "No fue posible subir el archivo");
    setUploading(false);
  };

  const submit = async () => {
    if (!categoryId || !subject.trim() || !description.trim()) {
      setError("Completa tipo de solicitud, asunto y descripción");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/rrhh-local/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, priority, subject, description, location, extraFields, attachments }),
    });
    if (res.ok) onCreated();
    else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No fue posible enviar la solicitud");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#E2E8F0] p-5">
          <h3 className="text-base font-black text-[#1A1A1A]">Nueva solicitud</h3>
          <button onClick={onClose} className="text-[#64748B]"><MdClose size={18} /></button>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-bold text-[#64748B]">
              Tipo de solicitud *
              <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setExtraFields({}); }}
                className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm font-normal text-[#1A1A1A]">
                <option value="">Selecciona un tipo</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="block text-xs font-bold text-[#64748B]">
              Prioridad *
              <select value={priority} onChange={(e) => setPriority(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm font-normal text-[#1A1A1A]">
                {Object.entries(PRIORITY_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
          </div>

          <label className="block text-xs font-bold text-[#64748B]">
            Asunto *
            <input value={subject} onChange={(e) => setSubject(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm font-normal text-[#1A1A1A]" />
          </label>

          <label className="block text-xs font-bold text-[#64748B]">
            Descripción *
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
              placeholder="Describe tu solicitud con el mayor detalle posible…"
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm font-normal text-[#1A1A1A]" />
          </label>

          {category?.fieldsSchema?.map((f) => (
            <label key={f.key} className="block text-xs font-bold text-[#64748B]">
              {f.label}{f.required ? " *" : ""}
              {f.type === "select" ? (
                <select value={extraFields[f.key] || ""} onChange={(e) => setExtraFields((p) => ({ ...p, [f.key]: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm font-normal text-[#1A1A1A]">
                  <option value="">Selecciona</option>
                  {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.type === "boolean" ? (
                <select value={extraFields[f.key] || ""} onChange={(e) => setExtraFields((p) => ({ ...p, [f.key]: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm font-normal text-[#1A1A1A]">
                  <option value="">Selecciona</option>
                  <option value="Sí">Sí</option>
                  <option value="No">No</option>
                </select>
              ) : (
                <input value={extraFields[f.key] || ""} onChange={(e) => setExtraFields((p) => ({ ...p, [f.key]: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm font-normal text-[#1A1A1A]" />
              )}
            </label>
          ))}

          <label className="block text-xs font-bold text-[#64748B]">
            Ubicación
            <select value={location} onChange={(e) => setLocation(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm font-normal text-[#1A1A1A]">
              <option value="">Selecciona ubicación</option>
              {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>

          <div>
            <p className="mb-1 text-xs font-bold text-[#64748B]">Adjuntar archivos</p>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#E2E8F0] px-3 py-2 text-xs font-bold text-[#27B1B8]">
              <MdAttachFile size={16} /> {uploading ? "Subiendo…" : "Elegir archivo"}
              <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
            </label>
            {attachments.length > 0 && (
              <ul className="mt-2 space-y-1">
                {attachments.map((a, i) => (
                  <li key={i} className="text-[11px] text-[#64748B]">{a.name}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#E2E8F0] p-5">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-bold text-[#64748B]">Cancelar</button>
          <button onClick={submit} disabled={saving || uploading}
            className="flex items-center gap-1.5 rounded-lg bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            <MdSend size={16} /> {saving ? "Enviando…" : "Enviar solicitud"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailField({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-xs font-bold text-[#64748B]">{icon}{label}</p>
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
