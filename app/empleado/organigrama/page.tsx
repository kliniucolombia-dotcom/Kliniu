"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  MdAccountTree, MdApartment, MdSearch, MdGroups, MdPlace, MdSupervisorAccount,
  MdClose, MdEmail, MdPhone, MdBadge, MdExpandMore, MdChevronRight, MdGridView, MdViewList,
  MdHub,
} from "react-icons/md";
import { SimpleSelect } from "@/app/panel/_components/simple-select";
import { fmtDateOnly } from "@/lib/date";

type DirectoryEmployee = {
  id: string;
  jobTitle: string;
  site: string | null;
  managerId: string | null;
  hireDate: string;
  contractType: string;
  departmentId: string | null;
  directReports: number;
  isRRHH: boolean;
  user: { fullName: string; email: string; phone: string | null; city: string | null; avatarUrl: string | null };
};

type Directory = {
  meId: string;
  departments: { id: string; name: string; code: string }[];
  employees: DirectoryEmployee[];
  sites: string[];
  jobTitles: string[];
  stats: { totalEmployees: number; totalDepartments: number; totalLeaders: number; totalSites: number };
};

const CONTRACT_LABELS: Record<string, string> = {
  INDEFINITE: "Término indefinido",
  FIXED_TERM: "Término fijo",
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function seniority(hireDate: string) {
  const start = new Date(hireDate);
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  months = Math.max(0, months);
  const years = Math.floor(months / 12);
  return `${years} año${years === 1 ? "" : "s"} ${months % 12} mes${months % 12 === 1 ? "" : "es"}`;
}

/** Normaliza tildes para que "gomez" encuentre "Gómez". */
function norm(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export default function OrganigramaPage() {
  const [data, setData] = useState<Directory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [siteFilter, setSiteFilter] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [view, setView] = useState<"radial" | "cards" | "tree">("radial");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<DirectoryEmployee | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/empleado/directorio");
      if (res.ok) setData(await res.json());
      else setError("No fue posible cargar el organigrama");
      setLoading(false);
    })();
  }, []);

  const employees = data?.employees ?? [];

  const byId = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const deptName = (id: string | null) =>
    data?.departments.find((d) => d.id === id)?.name ?? "Sin departamento";

  const filtered = useMemo(() => {
    const term = norm(search.trim());
    return employees.filter((e) => {
      if (deptFilter && e.departmentId !== deptFilter) return false;
      if (siteFilter && e.site !== siteFilter) return false;
      if (jobFilter && e.jobTitle !== jobFilter) return false;
      if (term && !norm(e.user.fullName).includes(term) && !norm(e.jobTitle).includes(term)) return false;
      return true;
    });
  }, [employees, search, deptFilter, siteFilter, jobFilter]);

  /** Agrupa los resultados por departamento, incluyendo el grupo "sin departamento". */
  const grouped = useMemo(() => {
    const map = new Map<string, DirectoryEmployee[]>();
    filtered.forEach((e) => {
      const key = e.departmentId ?? "none";
      map.set(key, [...(map.get(key) ?? []), e]);
    });
    return Array.from(map.entries()).sort((a, b) => deptName(a[0] === "none" ? null : a[0])
      .localeCompare(deptName(b[0] === "none" ? null : b[0])));
  }, [filtered, data]);

  /** Raíces del árbol: quienes no tienen jefe, o cuyo jefe no está en el resultado filtrado. */
  const roots = useMemo(() => {
    const ids = new Set(filtered.map((e) => e.id));
    return filtered.filter((e) => !e.managerId || !ids.has(e.managerId));
  }, [filtered]);

  const childrenOf = (id: string) => filtered.filter((e) => e.managerId === id);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  if (loading) return <div className="p-6 text-sm text-[#64748B]">Cargando…</div>;
  if (!data) return <div className="p-6 text-sm text-red-500">{error || "Sin datos"}</div>;

  const manager = selected?.managerId ? byId.get(selected.managerId) : null;
  const teammates = selected
    ? employees.filter((e) => e.departmentId === selected.departmentId && e.id !== selected.id)
    : [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E6FAFB] text-[#27B1B8]">
          <MdAccountTree size={20} />
        </div>
        <div>
          <h1 className="text-xl font-black text-[#1A1A1A]">Organigrama</h1>
          <p className="text-xs text-[#64748B]">Conoce los departamentos y encuentra rápidamente a cualquier colaborador.</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi value={data.stats.totalEmployees} label="Colaboradores" icon={<MdGroups size={20} />} tone="bg-[#E6FAFB] text-[#27B1B8]" />
        <Kpi value={data.stats.totalDepartments} label="Departamentos" icon={<MdApartment size={20} />} tone="bg-[#DBEAFE] text-[#2563EB]" />
        <Kpi value={data.stats.totalLeaders} label="Líderes" icon={<MdSupervisorAccount size={20} />} tone="bg-[#EDE9FE] text-[#7C3AED]" />
        <Kpi value={data.stats.totalSites} label="Sedes" icon={<MdPlace size={20} />} tone="bg-[#DCFCE7] text-[#16A34A]" />
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
        <div className="relative min-w-[200px] flex-1">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={16} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar colaborador…"
            className="w-full rounded-lg border border-[#E2E8F0] py-2 pl-9 pr-3 text-sm" />
        </div>
        <div className="min-w-[150px]">
          <p className="mb-1 text-[10px] font-bold uppercase text-[#94A3B8]">Departamento</p>
          <SimpleSelect value={deptFilter} onChange={setDeptFilter}
            options={[{ value: "", label: "Todos" }, ...data.departments.map((d) => ({ value: d.id, label: d.name }))]}
            triggerClassName="flex w-full items-center justify-between rounded-lg border border-[#E2E8F0] px-3 py-2 text-left text-sm text-[#1A1A1A]" />
        </div>
        {data.sites.length > 0 && (
          <div className="min-w-[140px]">
            <p className="mb-1 text-[10px] font-bold uppercase text-[#94A3B8]">Sede</p>
            <SimpleSelect value={siteFilter} onChange={setSiteFilter}
              options={[{ value: "", label: "Todas" }, ...data.sites.map((s) => ({ value: s, label: s }))]}
              triggerClassName="flex w-full items-center justify-between rounded-lg border border-[#E2E8F0] px-3 py-2 text-left text-sm text-[#1A1A1A]" />
          </div>
        )}
        <div className="min-w-[150px]">
          <p className="mb-1 text-[10px] font-bold uppercase text-[#94A3B8]">Cargo</p>
          <SimpleSelect value={jobFilter} onChange={setJobFilter}
            options={[{ value: "", label: "Todos" }, ...data.jobTitles.map((j) => ({ value: j, label: j }))]}
            triggerClassName="flex w-full items-center justify-between rounded-lg border border-[#E2E8F0] px-3 py-2 text-left text-sm text-[#1A1A1A]" />
        </div>
        <div className="flex gap-1 rounded-lg border border-[#E2E8F0] p-1">
          <button onClick={() => setView("radial")} title="Mi organigrama"
            className={`flex h-8 w-8 items-center justify-center rounded ${view === "radial" ? "bg-[#E6FAFB] text-[#27B1B8]" : "text-[#64748B]"}`}>
            <MdHub size={18} />
          </button>
          <button onClick={() => setView("cards")} title="Tarjetas"
            className={`flex h-8 w-8 items-center justify-center rounded ${view === "cards" ? "bg-[#E6FAFB] text-[#27B1B8]" : "text-[#64748B]"}`}>
            <MdGridView size={18} />
          </button>
          <button onClick={() => setView("tree")} title="Jerarquía"
            className={`flex h-8 w-8 items-center justify-center rounded ${view === "tree" ? "bg-[#E6FAFB] text-[#27B1B8]" : "text-[#64748B]"}`}>
            <MdViewList size={18} />
          </button>
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-[#94A3B8]">Ningún colaborador coincide con los filtros.</p>
      )}

      {view === "radial" && (
        <TreeOrgChart
          me={byId.get(data.meId) ?? null}
          employees={filtered}
          onSelect={setSelected}
        />
      )}

      {view === "cards" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {grouped.map(([deptId, list]) => (
            <div key={deptId} className="rounded-xl border border-[#E2E8F0] bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F0F9FF] text-[#0369A1]">
                  <MdApartment size={18} />
                </div>
                <div>
                  <p className="text-sm font-black text-[#1A1A1A]">
                    {deptName(deptId === "none" ? null : deptId)}
                  </p>
                  <p className="text-[11px] text-[#94A3B8]">
                    {list.length} colaborador{list.length === 1 ? "" : "es"}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {list.slice(0, 4).map((e) => (
                  <button key={e.id} onClick={() => setSelected(e)}
                    className="flex w-full items-center gap-2 rounded-lg p-1.5 text-left hover:bg-[#F8FAFC]">
                    <Avatar employee={e} size={32} />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-[#1A1A1A]">{e.user.fullName}</p>
                      <p className="truncate text-[11px] text-[#94A3B8]">{e.jobTitle}</p>
                    </div>
                  </button>
                ))}
                {list.length > 4 && (
                  <p className="pl-1.5 text-[11px] font-bold text-[#27B1B8]">
                    +{list.length - 4} colaborador{list.length - 4 === 1 ? "" : "es"}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "tree" && (
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <div className="space-y-1">
            {roots.map((e) => (
              <TreeNode key={e.id} employee={e} level={0} childrenOf={childrenOf}
                expanded={expanded} onToggle={toggle} onSelect={setSelected} />
            ))}
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-20 flex justify-end bg-black/40" onClick={() => setSelected(null)}>
          <div className="h-full w-full max-w-sm overflow-y-auto bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b border-[#E2E8F0] p-5">
              <div className="flex flex-col items-center gap-2 text-center">
                <Avatar employee={selected} size={72} />
                <div>
                  <p className="text-base font-black text-[#1A1A1A]">{selected.user.fullName}</p>
                  <p className="text-sm text-[#64748B]">{selected.jobTitle}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="shrink-0 text-[#64748B]"><MdClose size={20} /></button>
            </div>

            <div className="space-y-5 p-5">
              <section>
                <h4 className="mb-2 text-xs font-black uppercase text-[#94A3B8]">Información de contacto</h4>
                <div className="space-y-2 text-sm">
                  <a href={`mailto:${selected.user.email}`} className="flex items-center gap-2 text-[#1A1A1A] hover:text-[#27B1B8]">
                    <MdEmail size={16} className="shrink-0 text-[#94A3B8]" /> <span className="truncate">{selected.user.email}</span>
                  </a>
                  {selected.user.phone && (
                    <a href={`tel:${selected.user.phone}`} className="flex items-center gap-2 text-[#1A1A1A] hover:text-[#27B1B8]">
                      <MdPhone size={16} className="shrink-0 text-[#94A3B8]" /> {selected.user.phone}
                    </a>
                  )}
                  {selected.user.city && (
                    <p className="flex items-center gap-2 text-[#1A1A1A]">
                      <MdPlace size={16} className="shrink-0 text-[#94A3B8]" /> {selected.user.city}
                    </p>
                  )}
                  {selected.site && (
                    <p className="flex items-center gap-2 text-[#1A1A1A]">
                      <MdApartment size={16} className="shrink-0 text-[#94A3B8]" /> {selected.site}
                    </p>
                  )}
                </div>
              </section>

              <section>
                <h4 className="mb-2 text-xs font-black uppercase text-[#94A3B8]">Información laboral</h4>
                <div className="space-y-2">
                  <Row label="Departamento" value={deptName(selected.departmentId)} />
                  <Row label="Jefe inmediato" value={manager?.user.fullName ?? "—"} />
                  <Row label="Ingreso" value={fmtDateOnly(selected.hireDate, { day: "numeric", month: "short", year: "numeric" })} />
                  <Row label="Antigüedad" value={seniority(selected.hireDate)} />
                  <Row label="Contrato" value={CONTRACT_LABELS[selected.contractType] ?? selected.contractType} />
                </div>
              </section>

              <section>
                <h4 className="mb-2 text-xs font-black uppercase text-[#94A3B8]">Acciones rápidas</h4>
                <div className="flex flex-wrap gap-2">
                  <a href={`mailto:${selected.user.email}`}
                    className="flex items-center gap-1.5 rounded-lg bg-[#27B1B8] px-3 py-2 text-xs font-bold text-white hover:bg-[#1F9BA1]">
                    <MdEmail size={14} /> Enviar correo
                  </a>
                  {selected.user.phone && (
                    <a href={`tel:${selected.user.phone}`}
                      className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs font-bold text-[#27B1B8] hover:bg-[#F8FAFC]">
                      <MdPhone size={14} /> Llamar
                    </a>
                  )}
                </div>
              </section>

              <section>
                <h4 className="mb-2 text-xs font-black uppercase text-[#94A3B8]">Organigrama</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] text-[#94A3B8]">Reporta a</p>
                    {manager ? (
                      <button onClick={() => setSelected(manager)} className="mt-1 flex items-center gap-2 text-left">
                        <Avatar employee={manager} size={32} />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-[#1A1A1A]">{manager.user.fullName}</p>
                          <p className="truncate text-[11px] text-[#94A3B8]">{manager.jobTitle}</p>
                        </div>
                      </button>
                    ) : (
                      <p className="mt-1 text-xs text-[#64748B]">Sin jefe inmediato registrado</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] text-[#94A3B8]">Tiene a cargo</p>
                    <p className="text-xs font-bold text-[#1A1A1A]">
                      {selected.directReports} colaborador{selected.directReports === 1 ? "" : "es"}
                    </p>
                  </div>
                </div>
              </section>

              {teammates.length > 0 && (
                <section>
                  <h4 className="mb-2 text-xs font-black uppercase text-[#94A3B8]">
                    Equipo — {deptName(selected.departmentId)}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {teammates.slice(0, 8).map((t) => (
                      <button key={t.id} onClick={() => setSelected(t)} title={t.user.fullName}>
                        <Avatar employee={t} size={34} />
                      </button>
                    ))}
                    {teammates.length > 8 && (
                      <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#F1F5F9] text-[10px] font-black text-[#64748B]">
                        +{teammates.length - 8}
                      </span>
                    )}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const TREE_COLORS = {
  me: "#27B1B8",
  jefe: "#2563EB",
  superior: "#7C3AED",
  companero: "#16A34A",
  rrhh: "#EA580C",
} as const;

const LINE_COLOR = "#CBD5E1";

const TreeNodeCard = ({ employee, color, highlight, onSelect, cardRef }: {
  employee: DirectoryEmployee;
  color: string;
  highlight?: boolean;
  onSelect: (e: DirectoryEmployee) => void;
  cardRef?: (el: HTMLButtonElement | null) => void;
}) => (
  <button
    ref={cardRef}
    onClick={() => onSelect(employee)}
    title={`${employee.user.fullName} — ${employee.jobTitle}`}
    className="relative z-[1] flex w-36 flex-col items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 py-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    style={{ borderTopWidth: 3, borderTopColor: color }}
  >
    <span className="relative">
      <Avatar employee={employee} size={highlight ? 64 : 56} />
      <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#16A34A]" title="Activo" />
    </span>
    <div className="min-w-0">
      <p className="truncate text-xs font-black text-[#1A1A1A]">{employee.user.fullName.split(" ").slice(0, 2).join(" ")}</p>
      <p className="truncate text-[11px] text-[#64748B]">{employee.jobTitle}</p>
    </div>
  </button>
);

type TreeLine = { x1: number; y1: number; x2: number; y2: number };

/** Árbol jerárquico: jefe de tu jefe (si existe) → tu jefe → compañeros del mismo depto (incluyéndote). RRHH aparte, sin líneas. */
function TreeOrgChart({ me, employees, onSelect }: {
  me: DirectoryEmployee | null;
  employees: DirectoryEmployee[];
  onSelect: (e: DirectoryEmployee) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const superiorRef = useRef<HTMLButtonElement | null>(null);
  const jefeRef = useRef<HTMLButtonElement | null>(null);
  const companeroRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [lines, setLines] = useState<TreeLine[]>([]);

  const jefe = me ? employees.find((e) => e.id === me.managerId) ?? null : null;
  const superior = jefe ? employees.find((e) => e.id === jefe.managerId) ?? null : null;
  const companeros = me ? employees.filter((e) => e.departmentId === me.departmentId && e.id !== jefe?.id) : [];
  const rrhh = me
    ? employees.filter((e) => e.isRRHH && e.id !== me.id && e.id !== jefe?.id && e.id !== superior?.id)
    : [];

  const measure = () => {
    const container = containerRef.current;
    if (!container) return;
    const base = container.getBoundingClientRect();
    const center = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return { top: { x: r.left + r.width / 2 - base.left, y: r.top - base.top }, bottom: { x: r.left + r.width / 2 - base.left, y: r.bottom - base.top } };
    };
    const next: TreeLine[] = [];
    if (superiorRef.current && jefeRef.current) {
      const a = center(superiorRef.current);
      const b = center(jefeRef.current);
      next.push({ x1: a.bottom.x, y1: a.bottom.y, x2: b.top.x, y2: b.top.y });
    }
    if (jefeRef.current) {
      const a = center(jefeRef.current);
      companeros.forEach((c) => {
        const el = companeroRefs.current.get(c.id);
        if (!el) return;
        const b = center(el);
        next.push({ x1: a.bottom.x, y1: a.bottom.y, x2: b.top.x, y2: b.top.y });
      });
    }
    setLines(next);
  };

  useLayoutEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id, jefe?.id, superior?.id, companeros.length]);

  if (!me) return null;

  if (!jefe && companeros.length <= 1 && rrhh.length === 0) {
    return (
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-10 text-center text-sm text-[#94A3B8]">
        Aún no hay jefe, compañeros de departamento o RRHH visibles en tu círculo laboral.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white p-8">
      <div ref={containerRef} className="relative flex min-w-fit flex-col items-center gap-10">
        <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ zIndex: 0 }}>
          {lines.map((l, i) => (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={LINE_COLOR} strokeWidth={1.5} />
          ))}
        </svg>

        {superior && (
          <TreeNodeCard employee={superior} color={TREE_COLORS.superior} onSelect={onSelect} cardRef={(el) => { superiorRef.current = el; }} />
        )}

        {jefe ? (
          <TreeNodeCard employee={jefe} color={TREE_COLORS.jefe} highlight onSelect={onSelect} cardRef={(el) => { jefeRef.current = el; }} />
        ) : (
          <p className="rounded-lg bg-[#F8FAFC] px-3 py-2 text-xs text-[#94A3B8]">Sin jefe directo asignado</p>
        )}

        {companeros.length > 0 && (
          <div className="flex flex-wrap justify-center gap-6">
            {companeros.map((c) => (
              <TreeNodeCard
                key={c.id}
                employee={c}
                color={c.id === me.id ? TREE_COLORS.me : TREE_COLORS.companero}
                highlight={c.id === me.id}
                onSelect={onSelect}
                cardRef={(el) => {
                  if (el) companeroRefs.current.set(c.id, el);
                  else companeroRefs.current.delete(c.id);
                }}
              />
            ))}
          </div>
        )}

        {rrhh.length > 0 && (
          <div className="w-full border-t border-dashed border-[#E2E8F0] pt-6">
            <p className="mb-4 text-center text-[11px] font-black uppercase tracking-wide text-[#EA580C]">Recursos Humanos</p>
            <div className="flex flex-wrap justify-center gap-4">
              {rrhh.map((r) => (
                <TreeNodeCard key={r.id} employee={r} color={TREE_COLORS.rrhh} onSelect={onSelect} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-4 text-xs font-bold text-[#64748B]">
        <Legend color={TREE_COLORS.me} label="Tú" />
        <Legend color={TREE_COLORS.jefe} label="Jefe directo" />
        {superior && <Legend color={TREE_COLORS.superior} label="Jefe de tu jefe" />}
        <Legend color={TREE_COLORS.companero} label="Compañeros" />
        <Legend color={TREE_COLORS.rrhh} label="Recursos Humanos" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function TreeNode({ employee, level, childrenOf, expanded, onToggle, onSelect }: {
  employee: DirectoryEmployee;
  level: number;
  childrenOf: (id: string) => DirectoryEmployee[];
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (e: DirectoryEmployee) => void;
}) {
  const children = childrenOf(employee.id);
  const isOpen = expanded.has(employee.id);

  return (
    <div>
      <div className="flex items-center gap-1 rounded-lg py-1 hover:bg-[#F8FAFC]" style={{ paddingLeft: level * 20 }}>
        {children.length > 0 ? (
          <button onClick={() => onToggle(employee.id)} className="flex h-6 w-6 shrink-0 items-center justify-center text-[#64748B]">
            {isOpen ? <MdExpandMore size={18} /> : <MdChevronRight size={18} />}
          </button>
        ) : (
          <span className="h-6 w-6 shrink-0" />
        )}
        <button onClick={() => onSelect(employee)} className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left">
          <Avatar employee={employee} size={30} />
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-[#1A1A1A]">{employee.user.fullName}</p>
            <p className="truncate text-[11px] text-[#94A3B8]">{employee.jobTitle}</p>
          </div>
          {children.length > 0 && (
            <span className="ml-auto shrink-0 rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-bold text-[#64748B]">
              {children.length}
            </span>
          )}
        </button>
      </div>
      {isOpen && children.map((c) => (
        <TreeNode key={c.id} employee={c} level={level + 1} childrenOf={childrenOf}
          expanded={expanded} onToggle={onToggle} onSelect={onSelect} />
      ))}
    </div>
  );
}

function Avatar({ employee, size }: { employee: DirectoryEmployee; size: number }) {
  if (employee.user.avatarUrl) {
    return (
      <img src={employee.user.avatarUrl} alt="" className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }} />
    );
  }
  return (
    <div className="flex shrink-0 items-center justify-center rounded-full bg-[#E6FAFB] font-black text-[#27B1B8]"
      style={{ width: size, height: size, fontSize: Math.max(10, size / 3) }}>
      {initials(employee.user.fullName)}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#F1F5F9] pb-2 text-sm last:border-b-0 last:pb-0">
      <span className="text-[#64748B]">{label}</span>
      <span className="text-right font-semibold text-[#1A1A1A]">{value}</span>
    </div>
  );
}

function Kpi({ value, label, icon, tone }: { value: number; label: string; icon: React.ReactNode; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-2xl font-black text-[#1A1A1A]">{value}</p>
        <p className="text-xs font-bold text-[#64748B]">{label}</p>
      </div>
    </div>
  );
}
