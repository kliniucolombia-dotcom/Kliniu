"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  MdEdit,
  MdDelete,
  MdApartment,
  MdExpandMore,
  MdExpandLess,
  MdPeople,
  MdBadge,
  MdLayers,
  MdSearch,
  MdFolderOpen,
  MdInventory2,
  MdSettings,
  MdHeadsetMic,
  MdMoreHoriz,
  MdPersonAdd,
  MdMailOutline,
  MdAdd,
} from "react-icons/md";
import { ROLE_LABELS } from "@/lib/roles";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";
import { SimpleSelect } from "../../_components/simple-select";

type MemberAccount = {
  id: string;
  fullName: string;
  role: string;
  status: string;
  avatarUrl: string | null;
};

type Member = {
  memberId: string | null;
  userId: string | null;
  name: string;
  title: string;
  kind: "holder" | "backup";
  email: string;
  account: MemberAccount | null;
};

type Candidate = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  avatarUrl: string | null;
};

type Department = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  area: string | null;
  isActive: boolean;
  members: Member[];
  backupName: string | null;
};

type Area = {
  key: string;
  name: string;
  description: string;
  departments: Department[];
};

type Stats = { areas: number; units: number; responsables: number; activeAccounts: number };

type View = "departments" | "units" | "people" | "accounts";

type FormState = { name: string; code: string; description: string; area: string; isActive: boolean };

type FlatDepartment = Department & { areaName: string; areaKey: string };

type PersonRow = {
  key: string;
  name: string;
  title: string;
  role: string;
  email: string;
  status: string;
  avatarUrl: string | null;
  departments: string[];
  areaKeys: string[];
  backups: { department: string; name: string }[];
};

type AccountRow = {
  id: string;
  name: string;
  role: string;
  email: string;
  status: string;
  avatarUrl: string | null;
  departments: string[];
  areaKeys: string[];
  kinds: string[];
};

const EMPTY_FORM: FormState = { name: "", code: "", description: "", area: "", isActive: true };

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  SUSPENDED: "Suspendido",
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-[#DCFCE7] text-[#16A34A]",
  INACTIVE: "bg-[#F1F5F9] text-[#64748B]",
  SUSPENDED: "bg-[#FEE2E2] text-[#DC2626]",
};

const AREA_ICONS: Record<string, React.ReactNode> = {
  DIRECCION: <MdFolderOpen size={20} />,
  ALMACENAMIENTO: <MdInventory2 size={20} />,
  PRODUCCION: <MdSettings size={20} />,
  SOPORTE: <MdHeadsetMic size={20} />,
  OTROS: <MdMoreHoriz size={20} />,
};

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function roleLabel(role: string): string {
  return ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role;
}

function memberSubtitle(m: Member): string {
  const role = m.account ? roleLabel(m.account.role) : "";
  if (!role) return m.title;
  if (m.title.toLowerCase() === role.toLowerCase()) return m.title;
  return `${m.title} · ${role}`;
}

function Avatar({ name, url, size = 40 }: { name: string; url: string | null; size?: number }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover" />;
  }
  return (
    <span
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-[#27B1B8] text-xs font-black text-white"
    >
      {initials(name)}
    </span>
  );
}

export default function DepartamentosProduccionPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [stats, setStats] = useState<Stats>({ areas: 0, units: 0, responsables: 0, activeAccounts: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ mode: "create" } | { mode: "edit"; id: string } | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState<Department | null>(null);
  const [showManage, setShowManage] = useState(false);
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [view, setView] = useState<View>("departments");
  const [teamTargetId, setTeamTargetId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [teamForm, setTeamForm] = useState<{ userId: string; kind: "HOLDER" | "BACKUP"; title: string }>({ userId: "", kind: "HOLDER", title: "" });
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [teamBusy, setTeamBusy] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/panel/departamentos");
      const d = await r.json();
      setAreas(Array.isArray(d?.areas) ? d.areas : []);
      if (d?.stats) setStats(d.stats);
    } finally {
      setLoading(false);
    }
  }, []);

  const { markLocalWrite } = useRealtimeRefresh(["production"], load);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  const allDepartments = useMemo<FlatDepartment[]>(
    () => areas.flatMap((a) => a.departments.map((d) => ({ ...d, areaName: a.name, areaKey: a.key }))),
    [areas],
  );

  const people = useMemo<PersonRow[]>(() => {
    const map = new Map<string, PersonRow>();
    allDepartments.forEach((d) => {
      d.members
        .filter((m) => m.kind === "holder")
        .forEach((m) => {
          const key = m.account?.id ?? m.email;
          const existing = map.get(key);
          if (existing) {
            if (!existing.departments.includes(d.name)) existing.departments.push(d.name);
            if (!existing.areaKeys.includes(d.areaKey)) existing.areaKeys.push(d.areaKey);
            if (d.backupName && !existing.backups.some((b) => b.department === d.name)) {
              existing.backups.push({ department: d.name, name: d.backupName });
            }
            return;
          }
          map.set(key, {
            key,
            name: m.account?.fullName ?? m.name,
            title: m.title,
            role: m.account?.role ?? "",
            email: m.email,
            status: m.account?.status ?? "",
            avatarUrl: m.account?.avatarUrl ?? null,
            departments: [d.name],
            areaKeys: [d.areaKey],
            backups: d.backupName ? [{ department: d.name, name: d.backupName }] : [],
          });
        });
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [allDepartments]);

  const accounts = useMemo<AccountRow[]>(() => {
    const map = new Map<string, AccountRow>();
    allDepartments.forEach((d) => {
      d.members.forEach((m) => {
        if (!m.account) return;
        const existing = map.get(m.account.id);
        if (existing) {
          if (!existing.departments.includes(d.name)) existing.departments.push(d.name);
          if (!existing.areaKeys.includes(d.areaKey)) existing.areaKeys.push(d.areaKey);
          if (!existing.kinds.includes(m.kind)) existing.kinds.push(m.kind);
          return;
        }
        map.set(m.account.id, {
          id: m.account.id,
          name: m.account.fullName,
          role: m.account.role,
          email: m.email,
          status: m.account.status,
          avatarUrl: m.account.avatarUrl,
          departments: [d.name],
          areaKeys: [d.areaKey],
          kinds: [m.kind],
        });
      });
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [allDepartments]);

  const q = search.trim().toLowerCase();
  const matchText = useCallback((values: string[]) => !q || values.some((v) => v.toLowerCase().includes(q)), [q]);

  const visibleAreas = useMemo(() => {
    return areas
      .filter((a) => areaFilter === "ALL" || a.key === areaFilter)
      .map((a) => ({
        ...a,
        departments: a.departments.filter(
          (d) =>
            matchText([d.name, d.code, d.description ?? "", ...d.members.flatMap((m) => [m.name, m.email])]),
        ),
      }))
      .filter((a) => a.departments.length > 0 || (!q && areaFilter === "ALL"));
  }, [areas, areaFilter, matchText, q]);

  const visibleDepartments = useMemo(
    () =>
      allDepartments.filter(
        (d) =>
          (areaFilter === "ALL" || d.areaKey === areaFilter) &&
          matchText([d.name, d.code, d.areaName, d.description ?? ""]),
      ),
    [allDepartments, areaFilter, matchText],
  );

  const visiblePeople = useMemo(
    () =>
      people.filter(
        (p) =>
          (areaFilter === "ALL" || p.areaKeys.includes(areaFilter)) &&
          (statusFilter === "ALL" || p.status === statusFilter) &&
          matchText([p.name, p.email, roleLabel(p.role), p.title, ...p.departments]),
      ),
    [people, areaFilter, statusFilter, matchText],
  );

  const visibleAccounts = useMemo(
    () =>
      accounts.filter(
        (a) =>
          a.status === "ACTIVE" &&
          (areaFilter === "ALL" || a.areaKeys.includes(areaFilter)) &&
          matchText([a.name, a.email, roleLabel(a.role), ...a.departments]),
      ),
    [accounts, areaFilter, matchText],
  );

  const toggleArea = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const kpis: { key: View; label: string; value: number; icon: React.ReactNode; tone: string }[] = [
    { key: "departments", label: "Áreas", value: stats.areas, icon: <MdApartment size={20} />, tone: "bg-[#D9F2F3] text-[#0E7C82]" },
    { key: "units", label: "Unidades", value: stats.units, icon: <MdLayers size={20} />, tone: "bg-[#E0E7FF] text-[#4F46E5]" },
    { key: "people", label: "Responsables", value: stats.responsables, icon: <MdPeople size={20} />, tone: "bg-[#DBEAFE] text-[#2563EB]" },
    { key: "accounts", label: "Cuentas activas", value: stats.activeAccounts, icon: <MdBadge size={20} />, tone: "bg-[#DCFCE7] text-[#16A34A]" },
  ];

  const openCreate = (areaKey?: string) => {
    setForm({ ...EMPTY_FORM, area: areaKey ?? "" });
    setError(null);
    setModal({ mode: "create" });
  };

  const openEdit = (d: Department) => {
    setForm({ name: d.name, code: d.code, description: d.description ?? "", area: d.area ?? "", isActive: d.isActive });
    setError(null);
    setModal({ mode: "edit", id: d.id });
  };

  const save = async () => {
    if (!form.name.trim() || !form.code.trim()) { setError("Nombre y código son obligatorios"); return; }
    setSaving(true);
    setError(null);
    try {
      const isEdit = modal?.mode === "edit";
      markLocalWrite();
      const r = await fetch(isEdit ? `/api/panel/departamentos/${modal.id}` : "/api/panel/departamentos", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "No se pudo guardar"); return; }
      setModal(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setSaving(true);
    setError(null);
    try {
      markLocalWrite();
      const r = await fetch(`/api/panel/departamentos/${confirmDelete.id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "No se pudo eliminar"); return; }
      setConfirmDelete(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const teamDepartment = useMemo(
    () => (teamTargetId ? allDepartments.find((d) => d.id === teamTargetId) ?? null : null),
    [teamTargetId, allDepartments],
  );

  const openTeam = async (d: Department) => {
    if (!d.id) return;
    setTeamTargetId(d.id);
    setTeamError(null);
    setEditingMemberId(null);
    setTeamForm({ userId: "", kind: "HOLDER", title: "" });
    if (candidates.length === 0) {
      const r = await fetch("/api/panel/departamentos/candidates");
      if (r.ok) {
        const data = await r.json();
        setCandidates(Array.isArray(data?.users) ? data.users : []);
      }
    }
  };

  const startEditMember = (m: Member) => {
    if (!m.memberId) return;
    setEditingMemberId(m.memberId);
    setTeamError(null);
    setTeamForm({ userId: m.userId ?? "", kind: m.kind === "backup" ? "BACKUP" : "HOLDER", title: m.title });
  };

  const resetTeamForm = () => {
    setEditingMemberId(null);
    setTeamForm({ userId: "", kind: "HOLDER", title: "" });
    setTeamError(null);
  };

  const submitMember = async () => {
    if (!teamDepartment) return;
    if (!teamForm.userId) { setTeamError("Selecciona una persona"); return; }
    if (!teamForm.title.trim()) { setTeamError("El cargo es obligatorio"); return; }
    setTeamBusy(true);
    setTeamError(null);
    try {
      const url = editingMemberId
        ? `/api/panel/departamentos/${teamDepartment.id}/members/${editingMemberId}`
        : `/api/panel/departamentos/${teamDepartment.id}/members`;
      markLocalWrite();
      const r = await fetch(url, {
        method: editingMemberId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: teamForm.userId, kind: teamForm.kind, title: teamForm.title.trim() }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setTeamError(data.error ?? "No se pudo guardar"); return; }
      resetTeamForm();
      await load();
    } finally {
      setTeamBusy(false);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!teamDepartment) return;
    setTeamBusy(true);
    setTeamError(null);
    try {
      markLocalWrite();
      const r = await fetch(`/api/panel/departamentos/${teamDepartment.id}/members/${memberId}`, { method: "DELETE" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setTeamError(data.error ?? "No se pudo quitar"); return; }
      if (editingMemberId === memberId) resetTeamForm();
      await load();
    } finally {
      setTeamBusy(false);
    }
  };

  const areaOptions = [{ value: "ALL", label: "Todas las áreas" }, ...areas.map((a) => ({ value: a.key, label: a.name }))];
  const formAreaOptions = areas.map((a) => ({ value: a.key, label: a.name }));

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Operaciones</p>
          <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Departamentos</h1>
          <p className="mt-0.5 text-sm text-[#64748B]">Estructura del área de operaciones y cuentas por departamento</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative">
            <MdSearch size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar…"
              className="w-full rounded-xl border border-[#E2E8F0] bg-white py-2.5 pl-9 pr-3 text-sm text-[#1A1A1A] outline-none focus:border-[#27B1B8] sm:w-64"
            />
          </div>
          <SimpleSelect
            value={areaFilter}
            options={areaOptions}
            onChange={setAreaFilter}
            className="sm:w-52"
            triggerClassName="flex w-full items-center justify-between rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-left text-sm text-[#1A1A1A]"
          />
          {view === "people" && (
            <SimpleSelect
              value={statusFilter}
              options={[
                { value: "ALL", label: "Estado: Todos" },
                ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
              ]}
              onChange={setStatusFilter}
              className="sm:w-44"
              triggerClassName="flex w-full items-center justify-between rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-left text-sm text-[#1A1A1A]"
            />
          )}
          <button
            onClick={() => openCreate(areaFilter !== "ALL" ? areaFilter : undefined)}
            className="rounded-xl bg-[#27B1B8] px-4 py-2.5 text-sm font-black text-white shadow-[0_2px_8px_rgba(39,177,184,0.3)] transition hover:bg-[#1F9AA0]"
          >
            + Nueva unidad
          </button>
        </div>
      </div>

      {error && !modal && !confirmDelete && (
        <div className="mb-4 rounded-xl bg-[#FEE2E2] px-3 py-2 text-xs font-semibold text-[#DC2626]">{error}</div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#27B1B8] border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {kpis.map((k) => {
              const active = view === k.key;
              return (
                <button
                  key={k.key}
                  onClick={() => setView(k.key)}
                  aria-pressed={active}
                  className={`flex items-center gap-2 rounded-2xl border p-3 text-left outline-none transition hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)] focus-visible:border-[#27B1B8] focus-visible:ring-2 focus-visible:ring-[#27B1B8]/20 sm:gap-3 sm:p-4 ${
                    active ? "border-[#27B1B8] bg-[#F0FAFA]" : "border-[#E2E8F0] bg-white"
                  }`}
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${k.tone}`}>{k.icon}</span>
                  <div className="min-w-0">
                    <p className="text-lg font-black text-[#1A1A1A] sm:text-xl">{k.value}</p>
                    <p className={`truncate text-[11px] font-semibold sm:text-xs ${active ? "text-[#0E7C82]" : "text-[#94A3B8]"}`}>{k.label}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {(search.trim() !== "" || areaFilter !== "ALL" || statusFilter !== "ALL") && (
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => { setSearch(""); setAreaFilter("ALL"); setStatusFilter("ALL"); }}
                className="text-xs font-bold text-[#27B1B8] transition hover:text-[#1F9AA0]"
              >
                Limpiar filtros
              </button>
            </div>
          )}

          {view === "departments" && (
            <>
              {visibleAreas.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="space-y-5">
                  {visibleAreas.map((a) => {
                    const isCollapsed = collapsed.has(a.key);
                    return (
                      <div key={a.key} className="rounded-2xl border border-[#E2E8F0] bg-white">
                        <div className="flex items-center gap-2 px-4 py-3 sm:gap-3 sm:px-5 sm:py-4">
                          <button onClick={() => toggleArea(a.key)} className="flex min-w-0 flex-1 items-center gap-2 text-left sm:gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#0E7C82] sm:h-10 sm:w-10">
                              {AREA_ICONS[a.key] ?? <MdApartment size={20} />}
                            </span>
                            <div className="min-w-0 flex-1">
                              <h2 className="text-sm font-black text-[#1A1A1A] sm:text-base">{a.name}</h2>
                              <p className="truncate text-xs text-[#64748B]">{a.description}</p>
                            </div>
                          </button>
                          <span className="shrink-0 text-xs font-semibold text-[#94A3B8]">
                            {a.departments.length}
                            <span className="hidden sm:inline"> {a.departments.length === 1 ? "unidad" : "unidades"}</span>
                            <span className="sm:hidden"> u.</span>
                          </span>
                          <button
                            onClick={() => openCreate(a.key)}
                            aria-label={`Agregar unidad a ${a.name}`}
                            title="Agregar unidad a esta área"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#64748B] transition hover:border-[#27B1B8] hover:text-[#27B1B8]"
                          >
                            <MdAdd size={18} />
                          </button>
                          <button onClick={() => toggleArea(a.key)} aria-label={isCollapsed ? `Expandir ${a.name}` : `Contraer ${a.name}`} className="shrink-0 text-[#94A3B8]">
                            {isCollapsed ? <MdExpandMore size={22} /> : <MdExpandLess size={22} />}
                          </button>
                        </div>

                        {!isCollapsed && (
                          a.departments.length === 0 ? (
                            <div className="border-t border-[#F1F5F9] p-5 text-center text-xs text-[#94A3B8]">
                              Sin unidades en esta área. Usa “+” para agregar una.
                            </div>
                          ) : (
                          <div className="grid gap-3 border-t border-[#F1F5F9] p-3 sm:gap-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3">
                            {a.departments.map((d) => {
                              const holders = d.members.filter((m) => m.kind === "holder");
                              return (
                                <div key={d.code} className="flex flex-col rounded-2xl border border-[#E2E8F0] bg-white p-3 sm:p-4">
                                  <DepartmentHeader d={d} onEdit={() => openEdit(d)} onDelete={() => { setError(null); setConfirmDelete(d); }} onTeam={() => void openTeam(d)} />
                                  {d.description && <p className="mt-1 text-xs text-[#64748B]">{d.description}</p>}
                                  <div className="mt-3 space-y-2">
                                    {holders.length === 0 ? (
                                      <p className="rounded-xl bg-[#F8FAFC] px-3 py-3 text-center text-xs text-[#94A3B8]">
                                        Sin responsables asignados
                                      </p>
                                    ) : (
                                      holders.map((m, i) => (
                                        <div key={`${m.email}-${i}`} className="flex items-center gap-2 rounded-xl bg-[#F1F5F9] px-2.5 py-2.5 sm:gap-3 sm:px-3">
                                          <Avatar name={m.name} url={m.account?.avatarUrl ?? null} size={36} />
                                          <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                              <p className="truncate text-sm font-bold text-[#1A1A1A]">{m.name}</p>
                                              {m.account && <StatusBadge status={m.account.status} />}
                                            </div>
                                            <p className="truncate text-xs text-[#64748B]">{memberSubtitle(m)}</p>
                                            <p className="truncate text-xs text-[#94A3B8]">{m.email}</p>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                  <p className="mt-3 text-xs font-semibold text-[#64748B]">
                                    Respaldo: <span className="font-bold text-[#1A1A1A]">{d.backupName ?? "—"}</span>
                                  </p>
                                </div>
                              );
                            })}

                            {!q && (
                              <Link
                                href="/panel/usuarios"
                                className="flex min-h-[120px] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-[#E2E8F0] p-4 text-center transition hover:border-[#27B1B8] hover:bg-[#F0FAFA]"
                              >
                                <MdPersonAdd size={26} className="text-[#94A3B8]" />
                                <span className="text-sm font-bold text-[#1A1A1A]">Crear cuenta de usuario</span>
                                <span className="text-xs text-[#94A3B8]">Las cuentas se crean en Usuarios</span>
                              </Link>
                            )}
                          </div>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {view === "units" && (
            <>
              {visibleDepartments.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-[#F8FAFC]">
                      <tr>
                        {["Unidad", "Área", "Responsable", "Cuentas", "Estado", ""].map((h) => (
                          <th key={h} className="border-b border-[#E2E8F0] px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleDepartments.map((d) => {
                        const holders = d.members.filter((m) => m.kind === "holder");
                        const count = d.members.filter((m) => m.account).length;
                        return (
                          <tr key={d.code} className="hover:bg-[#F8FAFC]">
                            <td className="border-b border-[#F1F5F9] px-4 py-3">
                              <p className="font-semibold text-[#1A1A1A]">{d.name}</p>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">{d.code}</span>
                            </td>
                            <td className="border-b border-[#F1F5F9] px-4 py-3 text-[#64748B]">{d.areaName}</td>
                            <td className="border-b border-[#F1F5F9] px-4 py-3">
                              {holders.length > 0 ? (
                                <div className="flex items-center gap-2">
                                  <Avatar name={holders[0].name} url={holders[0].account?.avatarUrl ?? null} size={32} />
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-[#1A1A1A]">{holders[0].name}</p>
                                    <p className="truncate text-xs text-[#94A3B8]">{holders[0].email}</p>
                                  </div>
                                  {holders.length > 1 && (
                                    <span className="shrink-0 rounded-full bg-[#E0E7FF] px-2 py-0.5 text-[10px] font-bold text-[#4F46E5]">+{holders.length - 1}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[#94A3B8]">—</span>
                              )}
                            </td>
                            <td className="border-b border-[#F1F5F9] px-4 py-3">
                              <span
                                title={`${count} cuenta(s) de usuario vinculada(s)`}
                                className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-xs font-bold text-[#475569]"
                              >
                                {count}
                              </span>
                            </td>
                            <td className="border-b border-[#F1F5F9] px-4 py-3">
                              <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${d.isActive ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                                {d.isActive ? "Activo" : "Inactivo"}
                              </span>
                            </td>
                            <td className="border-b border-[#F1F5F9] px-4 py-3">
                              {d.id ? (
                                <div className="flex justify-end gap-1">
                                  <button onClick={() => openEdit(d)} aria-label={`Editar ${d.name}`} className="rounded-lg p-2 text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#27B1B8]">
                                    <MdEdit size={16} />
                                  </button>
                                  <button onClick={() => { setError(null); setConfirmDelete(d); }} aria-label={`Eliminar ${d.name}`} className="rounded-lg p-2 text-[#64748B] transition hover:bg-[#FEE2E2] hover:text-[#DC2626]">
                                    <MdDelete size={16} />
                                  </button>
                                </div>
                              ) : (
                                <span className="block text-right text-[10px] font-bold uppercase tracking-widest text-[#CBD5E1]">Documento</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {view === "people" && (
            <>
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-[#EFF6FF] px-4 py-3 text-xs font-semibold text-[#1D4ED8]">
                <MdPeople size={18} />
                Responsables titulares de cada departamento. {visiblePeople.length} en total.
              </div>
              {visiblePeople.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {visiblePeople.map((p) => (
                    <div key={p.key} className="flex flex-col rounded-2xl border border-[#E2E8F0] bg-white p-3 sm:p-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Avatar name={p.name} url={p.avatarUrl} size={48} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-[#1A1A1A]">{p.name}</p>
                          <p className="truncate text-xs text-[#64748B]">{p.title}</p>
                        </div>
                        {p.status && <StatusBadge status={p.status} />}
                      </div>
                      <div className="mt-3 space-y-2 text-xs">
                        <div className="flex items-center gap-2 text-[#64748B]">
                          <MdBadge size={15} className="shrink-0 text-[#94A3B8]" />
                          <span className="font-semibold text-[#1A1A1A]">{p.role ? roleLabel(p.role) : "—"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[#64748B]">
                          <MdMailOutline size={15} className="shrink-0 text-[#94A3B8]" />
                          <span className="truncate">{p.email}</span>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {p.departments.map((name) => (
                          <span key={name} className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[10px] font-bold text-[#475569]">{name}</span>
                        ))}
                      </div>
                      {p.backups.length > 0 && (
                        <div className="mt-3 space-y-1 border-t border-[#F1F5F9] pt-2">
                          {p.backups.map((b) => (
                            <p key={b.department} className="text-xs font-semibold text-[#64748B]">
                              Respaldo en <span className="text-[#94A3B8]">{b.department}</span>:{" "}
                              <span className="font-bold text-[#1A1A1A]">{b.name}</span>
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {view === "accounts" && (
            <>
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-[#F0FDF4] px-4 py-3 text-xs font-semibold text-[#15803D]">
                <MdBadge size={18} />
                Cuentas con acceso activo en el área de operaciones. {visibleAccounts.length} en total.
              </div>
              {visibleAccounts.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-[#F8FAFC]">
                      <tr>
                        {["Cuenta", "Nombre", "Rol", "Departamentos", "Tipo"].map((h) => (
                          <th key={h} className="border-b border-[#E2E8F0] px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleAccounts.map((a) => (
                        <tr key={a.id} className="hover:bg-[#F8FAFC]">
                          <td className="border-b border-[#F1F5F9] px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Avatar name={a.name} url={a.avatarUrl} size={32} />
                              <span className="font-mono text-xs text-[#0E7C82]">{a.email}</span>
                            </div>
                          </td>
                          <td className="border-b border-[#F1F5F9] px-4 py-3 font-semibold text-[#1A1A1A]">{a.name}</td>
                          <td className="border-b border-[#F1F5F9] px-4 py-3">
                            <span className="rounded-full bg-[#E0E7FF] px-2.5 py-1 text-[10px] font-bold text-[#4F46E5]">{roleLabel(a.role)}</span>
                          </td>
                          <td className="border-b border-[#F1F5F9] px-4 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {a.departments.map((name) => (
                                <span key={name} className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[10px] font-bold text-[#475569]">{name}</span>
                              ))}
                            </div>
                          </td>
                          <td className="border-b border-[#F1F5F9] px-4 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {a.kinds.map((kind) => (
                                <span
                                  key={kind}
                                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                    kind === "holder" ? "bg-[#E0E7FF] text-[#4F46E5]" : "bg-[#FEF3C7] text-[#B45309]"
                                  }`}
                                >
                                  {kind === "holder" ? "Titular" : "Respaldo"}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          <div className="mt-8">
            <button
              onClick={() => setShowManage((v) => !v)}
              className="flex items-center gap-2 text-sm font-bold text-[#64748B] transition hover:text-[#27B1B8]"
            >
              {showManage ? <MdExpandLess size={18} /> : <MdExpandMore size={18} />}
              Gestionar unidades
            </button>

            {showManage && (
              <div className="mt-3 overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-[#F8FAFC]">
                    <tr>
                      {["Código", "Nombre", "Área", "Descripción", "Estado", ""].map((h) => (
                        <th key={h} className="border-b border-[#E2E8F0] px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allDepartments.map((d) => (
                      <tr key={d.code} className="hover:bg-[#F8FAFC]">
                        <td className="border-b border-[#F1F5F9] px-4 py-3 font-bold text-[#27B1B8]">{d.code}</td>
                        <td className="border-b border-[#F1F5F9] px-4 py-3 font-semibold text-[#1A1A1A]">{d.name}</td>
                        <td className="border-b border-[#F1F5F9] px-4 py-3 text-[#64748B]">{d.areaName}</td>
                        <td className="border-b border-[#F1F5F9] px-4 py-3 text-[#64748B]">{d.description || "—"}</td>
                        <td className="border-b border-[#F1F5F9] px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${d.isActive ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                            {d.isActive ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="border-b border-[#F1F5F9] px-4 py-3">
                          {d.id ? (
                            <div className="flex justify-end gap-1">
                              <button onClick={() => openEdit(d)} aria-label={`Editar ${d.name}`} className="rounded-lg p-2 text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#27B1B8]">
                                <MdEdit size={16} />
                              </button>
                              <button onClick={() => { setError(null); setConfirmDelete(d); }} aria-label={`Eliminar ${d.name}`} className="rounded-lg p-2 text-[#64748B] transition hover:bg-[#FEE2E2] hover:text-[#DC2626]">
                                <MdDelete size={16} />
                              </button>
                            </div>
                          ) : (
                            <span className="block text-right text-[10px] font-bold uppercase tracking-widest text-[#CBD5E1]">Documento</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {teamDepartment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[#E2E8F0] p-5">
              <div className="min-w-0">
                <h3 className="truncate font-black text-[#1A1A1A]">Equipo · {teamDepartment.name}</h3>
                <p className="text-xs text-[#94A3B8]">Titulares y respaldos de esta unidad. Las personas vienen de Usuarios.</p>
              </div>
              <button onClick={() => { setTeamTargetId(null); resetTeamForm(); }} aria-label="Cerrar"
                className="shrink-0 text-xl leading-none text-[#94A3B8] hover:text-[#1A1A1A]">×</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {teamDepartment.members.length === 0 ? (
                <p className="rounded-xl bg-[#F8FAFC] px-3 py-4 text-center text-xs text-[#94A3B8]">
                  Sin miembros. Agrega el primer responsable.
                </p>
              ) : (
                <ul className="space-y-2">
                  {teamDepartment.members.map((m) => (
                    <li key={m.memberId ?? m.email}
                      className={`flex items-center gap-3 rounded-xl border p-2.5 ${editingMemberId === m.memberId ? "border-[#27B1B8] bg-[#F0FAFA]" : "border-[#E2E8F0]"}`}>
                      <Avatar name={m.name} url={m.account?.avatarUrl ?? null} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate text-sm font-bold text-[#1A1A1A]">{m.name}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${m.kind === "holder" ? "bg-[#E0E7FF] text-[#4F46E5]" : "bg-[#FEF3C7] text-[#B45309]"}`}>
                            {m.kind === "holder" ? "Titular" : "Respaldo"}
                          </span>
                          {m.account && <StatusBadge status={m.account.status} />}
                        </div>
                        <p className="truncate text-xs text-[#64748B]">
                          {m.title}{m.email ? ` · ${m.email}` : ""}{!m.account ? " · sin cuenta" : ""}
                        </p>
                      </div>
                      {m.memberId && (
                        <>
                          <button onClick={() => startEditMember(m)} aria-label={`Editar ${m.name}`} title="Editar"
                            className="rounded-lg p-1.5 text-[#CBD5E1] transition hover:bg-[#F1F5F9] hover:text-[#27B1B8]">
                            <MdEdit size={15} />
                          </button>
                          <button onClick={() => removeMember(m.memberId as string)} disabled={teamBusy} aria-label={`Quitar ${m.name}`} title="Quitar"
                            className="rounded-lg p-1.5 text-[#CBD5E1] transition hover:bg-[#FEE2E2] hover:text-[#DC2626] disabled:opacity-40">
                            <MdDelete size={15} />
                          </button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-5 rounded-xl border border-[#E2E8F0] p-4">
                <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">
                  {editingMemberId ? "Editar miembro" : "Agregar miembro"}
                </p>
                <label className="text-xs font-bold text-[#64748B]">Persona</label>
                <SimpleSelect
                  value={teamForm.userId}
                  options={[
                    { value: "", label: "Selecciona una persona" },
                    ...candidates.map((c) => ({ value: c.id, label: `${c.fullName} — ${roleLabel(c.role)}` })),
                  ]}
                  onChange={(v) => setTeamForm((f) => ({ ...f, userId: v }))}
                  className="mt-1"
                />
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold text-[#64748B]">Rol</label>
                    <SimpleSelect
                      value={teamForm.kind}
                      options={[
                        { value: "HOLDER", label: "Titular" },
                        { value: "BACKUP", label: "Respaldo" },
                      ]}
                      onChange={(v) => setTeamForm((f) => ({ ...f, kind: v as "HOLDER" | "BACKUP" }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#64748B]">Cargo</label>
                    <input
                      value={teamForm.title}
                      onChange={(e) => setTeamForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Ej. Líder de logística"
                      className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]"
                    />
                  </div>
                </div>
                {teamError && <p className="mt-3 text-xs font-semibold text-[#DC2626]">{teamError}</p>}
                <div className="mt-4 flex justify-end gap-2">
                  {editingMemberId && (
                    <button onClick={resetTeamForm} className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">
                      Cancelar edición
                    </button>
                  )}
                  <button onClick={submitMember} disabled={teamBusy}
                    className="rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white hover:bg-[#1F9AA0] disabled:opacity-60">
                    {teamBusy ? "Guardando…" : editingMemberId ? "Guardar cambios" : "Agregar"}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-[#E2E8F0] p-4">
              <button onClick={() => { setTeamTargetId(null); resetTeamForm(); }}
                className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="font-black text-[#1A1A1A]">{modal.mode === "create" ? "Nueva unidad" : "Editar unidad"}</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-[#64748B]">Nombre</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#64748B]">Código</label>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm uppercase outline-none focus:border-[#27B1B8]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#64748B]">Área</label>
                <SimpleSelect
                  value={form.area}
                  options={[{ value: "", label: "— Sin área —" }, ...formAreaOptions]}
                  onChange={(v) => setForm({ ...form, area: v })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#64748B]">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="mt-1 w-full resize-none rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]"
                />
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-[#1A1A1A]">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="h-4 w-4 accent-[#27B1B8]"
                />
                Activo
              </label>
            </div>
            {error && <p className="mt-3 text-xs font-semibold text-[#DC2626]">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => { setModal(null); setError(null); }} className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">
                Cancelar
              </button>
              <button onClick={save} disabled={saving} className="rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white hover:bg-[#1F9AA0] disabled:opacity-60">
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="font-black text-[#1A1A1A]">Eliminar unidad</h3>
            <p className="mt-2 text-sm text-[#64748B]">
              ¿Eliminar <span className="font-bold text-[#1A1A1A]">{confirmDelete.name}</span>? Esta acción no se puede deshacer.
            </p>
            {error && <p className="mt-3 text-xs font-semibold text-[#DC2626]">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => { setConfirmDelete(null); setError(null); }} className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">
                Cancelar
              </button>
              <button onClick={remove} disabled={saving} className="rounded-xl bg-[#DC2626] px-4 py-2 text-sm font-bold text-white hover:bg-[#B91C1C] disabled:opacity-60">
                {saving ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${STATUS_STYLES[status] ?? "bg-[#F1F5F9] text-[#64748B]"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function DepartmentHeader({ d, onEdit, onDelete, onTeam }: { d: Department; onEdit: () => void; onDelete: () => void; onTeam: () => void }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h3 className="break-words text-sm font-black text-[#1A1A1A]">{d.name}</h3>
        <span className="rounded-md bg-[#F1F5F9] px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#64748B]">{d.code}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {d.id && (
          <>
            <button onClick={onTeam} aria-label={`Gestionar equipo de ${d.name}`} title="Gestionar equipo" className="rounded-lg p-1.5 text-[#CBD5E1] transition hover:bg-[#F1F5F9] hover:text-[#27B1B8]">
              <MdPeople size={15} />
            </button>
            <button onClick={onEdit} aria-label={`Editar ${d.name}`} className="rounded-lg p-1.5 text-[#CBD5E1] transition hover:bg-[#F1F5F9] hover:text-[#27B1B8]">
              <MdEdit size={15} />
            </button>
            <button onClick={onDelete} aria-label={`Eliminar ${d.name}`} className="rounded-lg p-1.5 text-[#CBD5E1] transition hover:bg-[#FEE2E2] hover:text-[#DC2626]">
              <MdDelete size={15} />
            </button>
          </>
        )}
        <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${d.isActive ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#F1F5F9] text-[#64748B]"}`}>
          {d.isActive ? "Activo" : "Inactivo"}
        </span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-[#E2E8F0] bg-white p-10 text-center text-sm text-[#94A3B8]">
      <MdApartment size={28} className="mx-auto mb-2 text-[#CBD5E1]" />
      Sin resultados.
    </div>
  );
}
