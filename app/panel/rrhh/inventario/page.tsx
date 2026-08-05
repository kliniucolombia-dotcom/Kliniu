"use client";
import { useEffect, useMemo, useState } from "react";
import {
  MdInventory2, MdAssignmentReturn, MdWarningAmber, MdGroups, MdSearch,
  MdFileDownload, MdAdd, MdClose, MdLaptop, MdSmartphone, MdCheckroom,
  MdHealthAndSafety, MdBuild, MdChair, MdDirectionsCar, MdMoreHoriz,
} from "react-icons/md";
import { fmtDateOnly } from "@/lib/date";
import { SimpleSelect } from "@/app/panel/_components/simple-select";

type Asset = {
  id: string;
  type: string;
  name: string;
  serial: string | null;
  status: string;
  deliveredAt: string;
  returnedAt: string | null;
  notes: string | null;
  employee: { id: string; user: { fullName: string }; department: { name: string } | null };
  createdBy: { fullName: string } | null;
};

type EmployeeOption = {
  id: string;
  status: string;
  user: { fullName: string };
  department: { name: string } | null;
};

const TYPE_LABELS: Record<string, string> = {
  COMPUTO: "Cómputo",
  MOVIL: "Móvil",
  UNIFORME: "Uniforme",
  EPP: "EPP",
  HERRAMIENTA: "Herramienta",
  MOBILIARIO: "Mobiliario",
  VEHICULO: "Vehículo",
  OTRO: "Otro",
};

const TYPE_ICON: Record<string, React.ElementType> = {
  COMPUTO: MdLaptop,
  MOVIL: MdSmartphone,
  UNIFORME: MdCheckroom,
  EPP: MdHealthAndSafety,
  HERRAMIENTA: MdBuild,
  MOBILIARIO: MdChair,
  VEHICULO: MdDirectionsCar,
  OTRO: MdMoreHoriz,
};

const STATUS_LABELS: Record<string, string> = {
  ENTREGADO: "En poder del colaborador",
  DEVUELTO: "Devuelto",
  DANADO: "Dañado",
  PERDIDO: "Perdido",
};

const STATUS_STYLE: Record<string, string> = {
  ENTREGADO: "bg-[#DBEAFE] text-[#2563EB]",
  DEVUELTO: "bg-[#DCFCE7] text-[#16A34A]",
  DANADO: "bg-[#FEF3C7] text-[#B45309]",
  PERDIDO: "bg-[#FEE2E2] text-[#DC2626]",
};

const PAGE_SIZE = 10;

function fmt(d: string | null) {
  if (!d) return "—";
  return fmtDateOnly(d, { day: "2-digit", month: "2-digit", year: "numeric" });
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

export default function InventarioPanelPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [closing, setClosing] = useState<Asset | null>(null);

  const [form, setForm] = useState({
    employeeId: "",
    type: "COMPUTO",
    name: "",
    serial: "",
    deliveredAt: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [closeForm, setCloseForm] = useState({
    status: "DEVUELTO",
    returnedAt: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const load = async () => {
    const [aRes, eRes] = await Promise.all([
      fetch("/api/rrhh-local/assets"),
      fetch("/api/rrhh-local/employees"),
    ]);
    if (aRes.ok) setAssets(await aRes.json());
    else setError("No fue posible cargar la dotación");
    if (eRes.ok) setEmployees(await eRes.json());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const kpis = useMemo(() => {
    const enPoder = assets.filter((a) => a.status === "ENTREGADO");
    return {
      enPoder: enPoder.length,
      devueltos: assets.filter((a) => a.status === "DEVUELTO").length,
      incidencias: assets.filter((a) => a.status === "DANADO" || a.status === "PERDIDO").length,
      colaboradores: new Set(enPoder.map((a) => a.employee.id)).size,
    };
  }, [assets]);

  const filtered = useMemo(() => assets.filter((a) => {
    if (typeFilter && a.type !== typeFilter) return false;
    if (statusFilter && a.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        (a.serial ?? "").toLowerCase().includes(q) ||
        a.employee.user.fullName.toLowerCase().includes(q)
      );
    }
    return true;
  }), [assets, search, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const byType = useMemo(() => {
    const counts = new Map<string, number>();
    assets.filter((a) => a.status === "ENTREGADO").forEach((a) => counts.set(a.type, (counts.get(a.type) ?? 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [assets]);

  const createAsset = async () => {
    if (!form.employeeId || !form.name.trim()) {
      setError("Elige el colaborador y describe el elemento");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/rrhh-local/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const created = (await res.json()) as Asset;
      setAssets((prev) => [created, ...prev]);
      setShowCreate(false);
      setForm({ employeeId: "", type: "COMPUTO", name: "", serial: "", deliveredAt: new Date().toISOString().slice(0, 10), notes: "" });
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "No fue posible registrar la entrega");
    }
    setSaving(false);
  };

  const closeAsset = async () => {
    if (!closing) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/rrhh-local/assets/${closing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(closeForm),
    });
    if (res.ok) {
      const updated = (await res.json()) as Asset;
      setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setClosing(null);
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "No fue posible actualizar el elemento");
    }
    setSaving(false);
  };

  const exportCsv = () => {
    const rows = [
      ["Colaborador", "Departamento", "Tipo", "Elemento", "Serial", "Entrega", "Devolución", "Estado"],
      ...filtered.map((a) => [
        a.employee.user.fullName,
        a.employee.department?.name ?? "Sin departamento",
        TYPE_LABELS[a.type] ?? a.type,
        a.name,
        a.serial ?? "",
        fmt(a.deliveredAt),
        fmt(a.returnedAt),
        STATUS_LABELS[a.status] ?? a.status,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dotacion.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="p-6 text-sm text-[#64748B]">Cargando…</div>;

  const activeEmployees = employees.filter((e) => e.status === "ACTIVE");

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-[#1A1A1A]">Inventario de dotación</h1>
          <p className="text-xs text-[#64748B]">Equipos y dotación entregados a cada colaborador: quién tiene qué y qué falta por devolver.</p>
        </div>
        <button onClick={() => { setShowCreate(true); setError(""); }}
          className="flex items-center gap-1.5 rounded-lg bg-[#27B1B8] px-3 py-2 text-sm font-bold text-white hover:bg-[#1E969B]">
          <MdAdd size={16} /> Registrar entrega
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Kpi value={kpis.enPoder} label="En poder del equipo" hint="Elementos sin devolver" icon={<MdInventory2 size={20} />} tone="bg-[#DBEAFE] text-[#2563EB]" />
        <Kpi value={kpis.colaboradores} label="Colaboradores con dotación" hint="Personas con algo asignado" icon={<MdGroups size={20} />} tone="bg-[#EDE9FE] text-[#7C3AED]" />
        <Kpi value={kpis.devueltos} label="Devueltos" hint="Asignaciones cerradas" icon={<MdAssignmentReturn size={20} />} tone="bg-[#DCFCE7] text-[#16A34A]" />
        <Kpi value={kpis.incidencias} label="Dañados o perdidos" hint="Requieren seguimiento" icon={<MdWarningAmber size={20} />} tone="bg-[#FEE2E2] text-[#DC2626]" />
      </div>

      {byType.length > 0 && (
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
          <h3 className="mb-1 text-sm font-black text-[#1A1A1A]">Dotación activa por tipo</h3>
          <p className="mb-4 text-xs text-[#64748B]">Toca un tipo para filtrar la tabla</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {byType.map(([type, count]) => {
              const Icon = TYPE_ICON[type] ?? MdMoreHoriz;
              const active = typeFilter === type;
              return (
                <button key={type} onClick={() => { setTypeFilter(active ? "" : type); setPage(1); }}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center hover:border-[#27B1B8] hover:bg-[#F0FDFF] ${active ? "border-[#27B1B8] bg-[#F0FDFF]" : "border-[#E2E8F0]"}`}>
                  <Icon size={22} className="text-[#27B1B8]" />
                  <span className="text-lg font-black text-[#1A1A1A]">{count}</span>
                  <span className="text-[10px] font-bold text-[#64748B]">{TYPE_LABELS[type] ?? type}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2">
          <MdSearch size={16} className="text-[#94A3B8]" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por colaborador, elemento o serial…"
            className="w-full text-sm text-[#1A1A1A] outline-none" />
        </div>
        <SimpleSelect
          value={typeFilter}
          onChange={(v) => { setTypeFilter(v); setPage(1); }}
          options={[
            { value: "", label: "Tipo: Todos" },
            ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label })),
          ]}
        />
        <SimpleSelect
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1); }}
          options={[
            { value: "", label: "Estado: Todos" },
            ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
          ]}
        />
        <button onClick={exportCsv}
          className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">
          <MdFileDownload size={16} /> Exportar
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] text-left text-xs font-bold text-[#64748B]">
              <th className="p-3">Colaborador</th>
              <th className="p-3">Elemento</th>
              <th className="p-3">Serial</th>
              <th className="p-3">Entrega</th>
              <th className="p-3">Devolución</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Acción</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((a) => {
              const Icon = TYPE_ICON[a.type] ?? MdMoreHoriz;
              return (
                <tr key={a.id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E6FAFB] text-[10px] font-bold text-[#27B1B8]">
                        {initials(a.employee.user.fullName)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[#1A1A1A]">{a.employee.user.fullName}</p>
                        <p className="truncate text-[11px] text-[#94A3B8]">{a.employee.department?.name ?? "Sin departamento"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Icon size={16} className="shrink-0 text-[#94A3B8]" />
                      <div className="min-w-0">
                        <p className="truncate text-[#1A1A1A]">{a.name}</p>
                        <p className="text-[11px] text-[#94A3B8]">{TYPE_LABELS[a.type] ?? a.type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 font-mono text-xs text-[#64748B]">{a.serial || "—"}</td>
                  <td className="p-3 text-[#64748B]">{fmt(a.deliveredAt)}</td>
                  <td className="p-3 text-[#64748B]">{fmt(a.returnedAt)}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[a.status]}`}>
                      {STATUS_LABELS[a.status] ?? a.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {a.status === "ENTREGADO" ? (
                      <button onClick={() => {
                        setClosing(a);
                        setCloseForm({ status: "DEVUELTO", returnedAt: new Date().toISOString().slice(0, 10), notes: a.notes ?? "" });
                        setError("");
                      }}
                        className="rounded-lg border border-[#E2E8F0] px-2.5 py-1 text-xs font-bold text-[#27B1B8] hover:bg-[#F0FDFF]">
                        Registrar devolución
                      </button>
                    ) : (
                      <span className="text-xs text-[#94A3B8]">Cerrado</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="p-6 text-sm text-[#94A3B8]">
            {assets.length === 0 ? "Todavía no hay dotación registrada." : "No hay elementos con estos filtros."}
          </p>
        )}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-[#E2E8F0] p-3 text-xs text-[#64748B]">
            <span>Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} elementos</span>
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

      {showCreate && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowCreate(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-[#1A1A1A]">Registrar entrega</h3>
                <p className="text-xs text-[#64748B]">Deja constancia de la dotación que recibe el colaborador.</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="text-[#64748B]"><MdClose size={20} /></button>
            </div>

            <div className="mt-5 space-y-4">
              <Field label="Colaborador">
                <SimpleSelect
                  value={form.employeeId}
                  onChange={(v) => setForm({ ...form, employeeId: v })}
                  className="w-full"
                  options={[
                    { value: "", label: "Selecciona un colaborador" },
                    ...activeEmployees.map((e) => ({
                      value: e.id,
                      label: `${e.user.fullName}${e.department ? ` · ${e.department.name}` : ""}`,
                    })),
                  ]}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Tipo">
                  <SimpleSelect
                    value={form.type}
                    onChange={(v) => setForm({ ...form, type: v })}
                    className="w-full"
                    options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))}
                  />
                </Field>
                <Field label="Fecha de entrega">
                  <input type="date" value={form.deliveredAt} onChange={(e) => setForm({ ...form, deliveredAt: e.target.value })}
                    className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#1A1A1A]" />
                </Field>
              </div>

              <Field label="Elemento">
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej. Portátil Lenovo ThinkPad E14"
                  className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#1A1A1A]" />
              </Field>

              <Field label="Serial o placa (opcional)">
                <input value={form.serial} onChange={(e) => setForm({ ...form, serial: e.target.value })}
                  className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#1A1A1A]" />
              </Field>

              <Field label="Notas (opcional)">
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#1A1A1A]" />
              </Field>
            </div>

            <div className="mt-6 flex gap-2">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm font-bold text-[#64748B]">Cancelar</button>
              <button onClick={createAsset} disabled={saving}
                className="flex-1 rounded-lg bg-[#27B1B8] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
                {saving ? "Guardando…" : "Registrar entrega"}
              </button>
            </div>
          </div>
        </div>
      )}

      {closing && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onClick={() => setClosing(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-lg font-black text-[#1A1A1A]">Cerrar asignación</h3>
                <p className="truncate text-xs text-[#64748B]">{closing.name} · {closing.employee.user.fullName}</p>
              </div>
              <button onClick={() => setClosing(null)} className="text-[#64748B]"><MdClose size={20} /></button>
            </div>

            <div className="mt-5 space-y-4">
              <Field label="Estado final">
                <SimpleSelect
                  value={closeForm.status}
                  onChange={(v) => setCloseForm({ ...closeForm, status: v })}
                  className="w-full"
                  options={[
                    { value: "DEVUELTO", label: "Devuelto" },
                    { value: "DANADO", label: "Dañado" },
                    { value: "PERDIDO", label: "Perdido" },
                  ]}
                />
              </Field>
              <Field label="Fecha">
                <input type="date" value={closeForm.returnedAt} onChange={(e) => setCloseForm({ ...closeForm, returnedAt: e.target.value })}
                  className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#1A1A1A]" />
              </Field>
              <Field label="Notas (opcional)">
                <textarea value={closeForm.notes} onChange={(e) => setCloseForm({ ...closeForm, notes: e.target.value })} rows={2}
                  className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#1A1A1A]" />
              </Field>
            </div>

            <div className="mt-6 flex gap-2">
              <button onClick={() => setClosing(null)}
                className="flex-1 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm font-bold text-[#64748B]">Cancelar</button>
              <button onClick={closeAsset} disabled={saving}
                className="flex-1 rounded-lg bg-[#27B1B8] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold text-[#64748B]">{label}</label>
      {children}
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
