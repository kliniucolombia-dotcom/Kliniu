"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  MdDescription, MdAttachMoney, MdCalendarToday, MdPeople,
  MdSearch, MdFilterList, MdChevronLeft, MdChevronRight, MdMoreHoriz,
} from "react-icons/md";
import { SimpleSelect } from "../_components/simple-select";

const fmt = (n: number) =>
  n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

type QuotationStatus = "DRAFT" | "SENT" | "APPROVED" | "REJECTED" | "EXPIRED";

const STATUS_META: Record<QuotationStatus, { label: string; color: string; bg: string }> = {
  DRAFT:    { label: "Borrador", color: "#64748B", bg: "#F1F5F9" },
  SENT:     { label: "Enviada",  color: "#D97706", bg: "#FEF3C7" },
  APPROVED: { label: "Aprobada", color: "#16A34A", bg: "#DCFCE7" },
  REJECTED: { label: "Rechazada", color: "#DC2626", bg: "#FEE2E2" },
  EXPIRED:  { label: "Vencida",  color: "#94A3B8", bg: "#F1F5F9" },
};

type QuotationListItem = {
  id: string;
  number: string;
  status: QuotationStatus;
  clientName: string;
  createdAt: string;
  summary: { total: number };
};

type Client = { id: string; fullName: string; company: string | null };

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function CotizacionesListPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<QuotationListItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");

  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [qr, cr] = await Promise.all([
        fetch("/api/panel/quotations"),
        fetch("/api/panel/clients"),
      ]);
      const qd = await qr.json();
      const cd = await cr.json();
      setQuotations(qd.quotations ?? []);
      setClients(Array.isArray(cd) ? cd : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!selectedClientId) { setError("Selecciona un cliente"); return; }
    setCreating(true);
    setError(null);
    try {
      const r = await fetch("/api/panel/quotations", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId: selectedClientId }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "No se pudo crear"); return; }
      router.push(`/panel/cotizaciones/${d.id}`);
    } finally {
      setCreating(false);
    }
  };

  const confirmRemove = async () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    const r = await fetch(`/api/panel/quotations/${id}`, { method: "DELETE" });
    if (r.ok) setQuotations((prev) => prev.filter((q) => q.id !== id));
  };

  const now = new Date();
  const isThisMonth = (d: string) => {
    const dt = new Date(d);
    return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
  };

  const kpis = useMemo(() => {
    const thisMonth = quotations.filter((q) => isThisMonth(q.createdAt));
    const total = thisMonth.length;
    const valorTotal = thisMonth.reduce((s, q) => s + q.summary.total, 0);
    const borrador = thisMonth.filter((q) => q.status === "DRAFT").length;
    const clientesUnicos = new Set(thisMonth.map((q) => q.clientName)).size;
    return { total, valorTotal, borrador, clientesUnicos };
  }, [quotations]);

  const filtered = useMemo(() => {
    return quotations.filter((q) => {
      if (statusFilter && q.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!q.number.toLowerCase().includes(s) && !q.clientName.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [quotations, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [search, statusFilter, pageSize]);

  const getPageNumbers = () => {
    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Panel Comercial</p>
          <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Cotizaciones Comerciales</h1>
          <p className="mt-0.5 text-sm text-[#64748B]">Genera y da seguimiento a cotizaciones para tus clientes</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="rounded-xl bg-[#27B1B8] px-4 py-2.5 text-sm font-black text-white shadow-[0_2px_8px_rgba(39,177,184,0.3)] transition hover:bg-[#1F9AA0]"
        >
          + Nueva cotización
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="flex items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EAF8F6] text-xl text-[#27B1B8]"><MdDescription /></span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Total cotizaciones</p>
            <p className="text-xl font-black text-[#1A1A1A]">{kpis.total}</p>
            <p className="text-[11px] text-[#94A3B8]">Este mes</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EFF6FF] text-xl text-[#2563EB]"><MdAttachMoney /></span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Valor total</p>
            <p className="text-xl font-black text-[#1A1A1A]">{fmt(kpis.valorTotal)}</p>
            <p className="text-[11px] text-[#94A3B8]">Este mes</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F5F3FF] text-xl text-[#7C3AED]"><MdCalendarToday /></span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Cotizaciones borrador</p>
            <p className="text-xl font-black text-[#1A1A1A]">{kpis.borrador}</p>
            <p className="text-[11px] text-[#94A3B8]">En progreso</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FFF7ED] text-xl text-[#EA580C]"><MdPeople /></span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Clientes únicos</p>
            <p className="text-xl font-black text-[#1A1A1A]">{kpis.clientesUnicos}</p>
            <p className="text-[11px] text-[#94A3B8]">Este mes</p>
          </div>
        </div>
      </div>

      {error && !showNewModal && (
        <div className="mb-4 rounded-xl bg-[#FEE2E2] px-3 py-2 text-xs font-semibold text-[#DC2626]">{error}</div>
      )}

      <div className="rounded-2xl border border-[#E2E8F0] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#E2E8F0] p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-black text-[#1A1A1A]">Listado de cotizaciones</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"><MdSearch /></span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar cotización o cliente"
                className="w-64 rounded-xl border border-[#E2E8F0] py-2 pl-9 pr-3 text-sm outline-none focus:border-[#27B1B8]"
              />
            </div>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold ${showFilters ? "border-[#27B1B8] text-[#27B1B8]" : "border-[#E2E8F0] text-[#64748B]"} hover:bg-[#F8FAFC]`}
            >
              <MdFilterList /> Filtros
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-center gap-3 border-b border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <div className="w-56">
              <SimpleSelect
                value={statusFilter}
                options={[
                  { value: "", label: "Todos los estados" },
                  ...Object.entries(STATUS_META).map(([v, m]) => ({ value: v, label: m.label })),
                ]}
                onChange={setStatusFilter}
              />
            </div>
            {statusFilter && (
              <button onClick={() => setStatusFilter("")} className="text-xs font-bold text-[#27B1B8] hover:underline">
                Limpiar filtro
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#27B1B8] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#94A3B8]">
            Sin cotizaciones que coincidan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-[#F8FAFC]">
                <tr>
                  {["Número", "Cliente", "Estado", "Total", "Fecha"].map((h) => (
                    <th key={h} className="border-b border-[#E2E8F0] px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">{h}</th>
                  ))}
                  <th className="border-b border-[#E2E8F0] px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Acción</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((q) => {
                  const meta = STATUS_META[q.status];
                  const initials = q.clientName.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
                  return (
                    <tr key={q.id} className="hover:bg-[#F8FAFC]">
                      <td className="border-b border-[#F1F5F9] px-4 py-3">
                        <button onClick={() => router.push(`/panel/cotizaciones/${q.id}`)} className="font-bold text-[#27B1B8] hover:underline">
                          {q.number}
                        </button>
                      </td>
                      <td className="border-b border-[#F1F5F9] px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EAF8F6] text-[11px] font-black text-[#27B1B8]">{initials}</span>
                          <span className="text-[#1A1A1A]">{q.clientName}</span>
                        </div>
                      </td>
                      <td className="border-b border-[#F1F5F9] px-4 py-3">
                        <span className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest" style={{ color: meta.color, background: meta.bg }}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="border-b border-[#F1F5F9] px-4 py-3 font-bold text-[#1A1A1A]">{fmt(q.summary.total)}</td>
                      <td className="border-b border-[#F1F5F9] px-4 py-3 text-[#64748B]">
                        <div>{new Date(q.createdAt).toLocaleDateString("es-CO")}</div>
                        <div className="text-[11px] text-[#94A3B8]">
                          {new Date(q.createdAt).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" })}
                        </div>
                      </td>
                      <td className="border-b border-[#F1F5F9] px-4 py-3">
                        <div className="relative inline-block">
                          <button
                            onClick={() => setPendingDeleteId(q.status === "DRAFT" ? q.id : null)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-[#64748B] hover:bg-[#F1F5F9]"
                            title={q.status === "DRAFT" ? "Eliminar" : "Sin acciones disponibles"}
                          >
                            <MdMoreHoriz />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-[#E2E8F0] p-4 sm:flex-row">
            <p className="text-xs text-[#94A3B8]">
              Mostrando {(page - 1) * pageSize + 1} a {Math.min(page * pageSize, filtered.length)} de {filtered.length} resultados
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E2E8F0] text-[#64748B] disabled:opacity-40"
                >
                  <MdChevronLeft />
                </button>
                {getPageNumbers().map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${n === page ? "bg-[#27B1B8] text-white" : "text-[#64748B] hover:bg-[#F1F5F9]"}`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E2E8F0] text-[#64748B] disabled:opacity-40"
                >
                  <MdChevronRight />
                </button>
              </div>
              <div className="w-32">
                <SimpleSelect
                  value={String(pageSize)}
                  options={PAGE_SIZE_OPTIONS.map((n) => ({ value: String(n), label: `${n} por página` }))}
                  onChange={(v) => setPageSize(Number(v))}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="font-black text-[#1A1A1A]">Nueva cotización</h3>
            <p className="mt-2 text-sm text-[#64748B]">Selecciona el cliente para esta cotización.</p>
            <div className="mt-4">
              <SimpleSelect
                value={selectedClientId}
                options={[
                  { value: "", label: "— Selecciona un cliente —" },
                  ...clients.map((c) => ({ value: c.id, label: c.company || c.fullName })),
                ]}
                onChange={setSelectedClientId}
              />
            </div>
            {error && <p className="mt-2 text-xs font-semibold text-[#DC2626]">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => { setShowNewModal(false); setError(null); }}
                className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]"
              >
                Cancelar
              </button>
              <button
                onClick={create}
                disabled={creating}
                className="rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white hover:bg-[#1F9AA0] disabled:opacity-60"
              >
                {creating ? "Creando…" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="font-black text-[#1A1A1A]">Eliminar cotización</h3>
            <p className="mt-2 text-sm text-[#64748B]">Esta acción no se puede deshacer. ¿Deseas continuar?</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setPendingDeleteId(null)}
                className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]"
              >
                Cancelar
              </button>
              <button
                onClick={confirmRemove}
                className="rounded-xl bg-[#DC2626] px-4 py-2 text-sm font-bold text-white hover:bg-[#B91C1C]"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
