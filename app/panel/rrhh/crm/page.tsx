"use client";
import { useEffect, useMemo, useState } from "react";
import {
  MdPersonSearch, MdEditNote, MdAdd, MdClose, MdSearch, MdWorkOutline,
  MdEmojiEvents, MdWarningAmber, MdInfoOutline, MdMoreHoriz,
} from "react-icons/md";
import { fmtDateOnly } from "@/lib/date";
import { SimpleSelect } from "@/app/panel/_components/simple-select";

type Candidate = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  position: string;
  stage: string;
  source: string | null;
  notes: string | null;
  resumeUrl: string | null;
  createdAt: string;
  createdBy: { fullName: string } | null;
};

type EmployeeOption = { id: string; status: string; user: { fullName: string }; department: { name: string } | null };

type EmployeeNote = {
  id: string;
  type: string;
  note: string;
  createdAt: string;
  employee: { id: string; user: { fullName: string } };
  author: { fullName: string };
};

const STAGE_LABELS: Record<string, string> = {
  POSTULADO: "Postulado",
  ENTREVISTA: "Entrevista",
  PRUEBA: "Prueba",
  OFERTA: "Oferta",
  CONTRATADO: "Contratado",
  DESCARTADO: "Descartado",
};

const STAGE_ORDER = ["POSTULADO", "ENTREVISTA", "PRUEBA", "OFERTA", "CONTRATADO", "DESCARTADO"];

const STAGE_STYLE: Record<string, string> = {
  POSTULADO: "bg-[#F1F5F9] text-[#64748B]",
  ENTREVISTA: "bg-[#DBEAFE] text-[#2563EB]",
  PRUEBA: "bg-[#EDE9FE] text-[#7C3AED]",
  OFERTA: "bg-[#FEF3C7] text-[#B45309]",
  CONTRATADO: "bg-[#DCFCE7] text-[#16A34A]",
  DESCARTADO: "bg-[#FEE2E2] text-[#DC2626]",
};

const NOTE_TYPE_LABELS: Record<string, string> = {
  SEGUIMIENTO: "Seguimiento",
  LLAMADO_ATENCION: "Llamado de atención",
  RECONOCIMIENTO: "Reconocimiento",
  OTRO: "Otro",
};

const NOTE_TYPE_ICON: Record<string, React.ElementType> = {
  SEGUIMIENTO: MdInfoOutline,
  LLAMADO_ATENCION: MdWarningAmber,
  RECONOCIMIENTO: MdEmojiEvents,
  OTRO: MdMoreHoriz,
};

const NOTE_TYPE_STYLE: Record<string, string> = {
  SEGUIMIENTO: "bg-[#DBEAFE] text-[#2563EB]",
  LLAMADO_ATENCION: "bg-[#FEE2E2] text-[#DC2626]",
  RECONOCIMIENTO: "bg-[#DCFCE7] text-[#16A34A]",
  OTRO: "bg-[#F1F5F9] text-[#64748B]",
};

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

export default function CrmPanelPage() {
  const [tab, setTab] = useState<"reclutamiento" | "bitacora">("reclutamiento");

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-black text-[#1A1A1A]">CRM</h1>
        <p className="text-xs text-[#64748B]">
          Reclutamiento y bitácora interna de RRHH. Sin relación con Kommo (clientes) ni Wati (ventas por WhatsApp).
        </p>
      </div>

      <div className="flex gap-4 border-b border-[#E2E8F0] text-sm font-bold text-[#64748B]">
        <button onClick={() => setTab("reclutamiento")}
          className={`flex items-center gap-1.5 border-b-2 pb-2 ${tab === "reclutamiento" ? "border-[#27B1B8] text-[#27B1B8]" : "border-transparent"}`}>
          <MdPersonSearch size={16} /> Reclutamiento
        </button>
        <button onClick={() => setTab("bitacora")}
          className={`flex items-center gap-1.5 border-b-2 pb-2 ${tab === "bitacora" ? "border-[#27B1B8] text-[#27B1B8]" : "border-transparent"}`}>
          <MdEditNote size={16} /> Bitácora de colaboradores
        </button>
      </div>

      {tab === "reclutamiento" ? <Reclutamiento /> : <Bitacora />}
    </div>
  );
}

function Reclutamiento() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", position: "", source: "", notes: "" });

  const load = async () => {
    const res = await fetch("/api/rrhh-local/candidates");
    if (res.ok) setCandidates(await res.json());
    else setError("No fue posible cargar los candidatos");
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => candidates.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.fullName.toLowerCase().includes(q) || c.position.toLowerCase().includes(q);
  }), [candidates, search]);

  const byStage = useMemo(() => {
    const map = new Map<string, Candidate[]>();
    STAGE_ORDER.forEach((s) => map.set(s, []));
    filtered.forEach((c) => map.get(c.stage)?.push(c));
    return map;
  }, [filtered]);

  const moveStage = async (candidate: Candidate, stage: string) => {
    setCandidates((prev) => prev.map((c) => (c.id === candidate.id ? { ...c, stage } : c)));
    const res = await fetch(`/api/rrhh-local/candidates/${candidate.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    if (!res.ok) {
      setError("No fue posible mover el candidato");
      await load();
    }
  };

  const createCandidate = async () => {
    if (!form.fullName.trim() || !form.position.trim()) {
      setError("El nombre y el cargo son obligatorios");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/rrhh-local/candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const created = (await res.json()) as Candidate;
      setCandidates((prev) => [created, ...prev]);
      setShowCreate(false);
      setForm({ fullName: "", email: "", phone: "", position: "", source: "", notes: "" });
    } else {
      const b = await res.json().catch(() => ({}));
      setError(b.error || "No fue posible crear el candidato");
    }
    setSaving(false);
  };

  if (loading) return <div className="p-6 text-sm text-[#64748B]">Cargando…</div>;

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2">
          <MdSearch size={16} className="text-[#94A3B8]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar candidato o cargo…"
            className="w-full text-sm text-[#1A1A1A] outline-none" />
        </div>
        <button onClick={() => { setShowCreate(true); setError(""); }}
          className="flex items-center gap-1.5 rounded-lg bg-[#27B1B8] px-3 py-2 text-sm font-bold text-white hover:bg-[#1E969B]">
          <MdAdd size={16} /> Nuevo candidato
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 overflow-x-auto sm:grid-cols-3 lg:grid-cols-6">
        {STAGE_ORDER.map((stage) => (
          <div key={stage} className="min-w-[200px] rounded-xl border border-[#E2E8F0] bg-white">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] p-3">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STAGE_STYLE[stage]}`}>{STAGE_LABELS[stage]}</span>
              <span className="text-xs font-bold text-[#94A3B8]">{byStage.get(stage)?.length ?? 0}</span>
            </div>
            <div className="max-h-[420px] space-y-2 overflow-y-auto p-2">
              {(byStage.get(stage) ?? []).map((c) => (
                <div key={c.id} className="rounded-lg border border-[#E2E8F0] p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E6FAFB] text-[10px] font-bold text-[#27B1B8]">
                      {initials(c.fullName)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-[#1A1A1A]">{c.fullName}</p>
                      <p className="truncate text-[10px] text-[#94A3B8]">{c.position}</p>
                    </div>
                  </div>
                  <SimpleSelect
                    value={c.stage}
                    onChange={(v) => moveStage(c, v)}
                    className="mt-2 w-full"
                    triggerClassName="px-1.5 py-1 text-[11px]"
                    options={STAGE_ORDER.map((s) => ({ value: s, label: STAGE_LABELS[s] }))}
                  />
                </div>
              ))}
              {(byStage.get(stage) ?? []).length === 0 && (
                <p className="p-2 text-center text-[11px] text-[#94A3B8]">Sin candidatos</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowCreate(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-black text-[#1A1A1A]">Nuevo candidato</h3>
              <button onClick={() => setShowCreate(false)} className="text-[#64748B]"><MdClose size={20} /></button>
            </div>

            <div className="mt-5 space-y-4">
              <Field label="Nombre completo">
                <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#1A1A1A]" />
              </Field>
              <Field label="Cargo al que aplica">
                <input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}
                  placeholder="Ej. Asesor comercial"
                  className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#1A1A1A]" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Correo (opcional)">
                  <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#1A1A1A]" />
                </Field>
                <Field label="Teléfono (opcional)">
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#1A1A1A]" />
                </Field>
              </div>
              <Field label="Fuente (opcional)">
                <input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
                  placeholder="Ej. LinkedIn, referido, elempleo"
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
              <button onClick={createCandidate} disabled={saving}
                className="flex-1 rounded-lg bg-[#27B1B8] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
                {saving ? "Guardando…" : "Crear candidato"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Bitacora() {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [notes, setNotes] = useState<EmployeeNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ employeeId: "", type: "SEGUIMIENTO", note: "" });

  const load = async () => {
    const [eRes, nRes] = await Promise.all([
      fetch("/api/rrhh-local/employees"),
      fetch("/api/rrhh-local/employee-notes"),
    ]);
    if (eRes.ok) setEmployees(await eRes.json());
    if (nRes.ok) setNotes(await nRes.json());
    else setError("No fue posible cargar la bitácora");
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filteredEmployees = useMemo(() => {
    const active = employees.filter((e) => e.status === "ACTIVE");
    if (!search) return active;
    const q = search.toLowerCase();
    return active.filter((e) => e.user.fullName.toLowerCase().includes(q));
  }, [employees, search]);

  const employeeNotes = useMemo(
    () => notes.filter((n) => !selectedEmployee || n.employee.id === selectedEmployee),
    [notes, selectedEmployee],
  );

  const createNote = async () => {
    if (!form.employeeId || !form.note.trim()) {
      setError("Elige un colaborador y escribe la nota");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/rrhh-local/employee-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const created = (await res.json()) as EmployeeNote;
      setNotes((prev) => [created, ...prev]);
      setShowCreate(false);
      setForm({ employeeId: "", type: "SEGUIMIENTO", note: "" });
    } else {
      const b = await res.json().catch(() => ({}));
      setError(b.error || "No fue posible guardar la nota");
    }
    setSaving(false);
  };

  if (loading) return <div className="p-6 text-sm text-[#64748B]">Cargando…</div>;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      <div className="rounded-xl border border-[#E2E8F0] bg-white">
        <div className="border-b border-[#E2E8F0] p-3">
          <div className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1.5">
            <MdSearch size={14} className="text-[#94A3B8]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar colaborador…"
              className="w-full bg-transparent text-xs text-[#1A1A1A] outline-none" />
          </div>
        </div>
        <div className="max-h-[520px] overflow-y-auto">
          <button onClick={() => setSelectedEmployee("")}
            className={`flex w-full items-center gap-2 border-b border-[#F1F5F9] p-3 text-left hover:bg-[#F8FAFC] ${!selectedEmployee ? "bg-[#F0FDFF]" : ""}`}>
            <MdWorkOutline size={16} className="text-[#27B1B8]" />
            <span className="text-sm font-bold text-[#1A1A1A]">Todos los colaboradores</span>
          </button>
          {filteredEmployees.map((e) => (
            <button key={e.id} onClick={() => setSelectedEmployee(e.id)}
              className={`flex w-full items-center gap-2 border-b border-[#F1F5F9] p-3 text-left hover:bg-[#F8FAFC] ${selectedEmployee === e.id ? "bg-[#F0FDFF]" : ""}`}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E6FAFB] text-[10px] font-bold text-[#27B1B8]">
                {initials(e.user.fullName)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#1A1A1A]">{e.user.fullName}</p>
                <p className="truncate text-[11px] text-[#94A3B8]">{e.department?.name ?? "Sin departamento"}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-[#1A1A1A]">
            {selectedEmployee
              ? employees.find((e) => e.id === selectedEmployee)?.user.fullName
              : `Actividad reciente (${employeeNotes.length})`}
          </p>
          <button onClick={() => {
            setForm({ employeeId: selectedEmployee, type: "SEGUIMIENTO", note: "" });
            setShowCreate(true);
            setError("");
          }}
            className="flex items-center gap-1.5 rounded-lg bg-[#27B1B8] px-3 py-2 text-sm font-bold text-white hover:bg-[#1E969B]">
            <MdAdd size={16} /> Nueva nota
          </button>
        </div>

        <div className="space-y-2">
          {employeeNotes.map((n) => {
            const Icon = NOTE_TYPE_ICON[n.type] ?? MdInfoOutline;
            return (
              <div key={n.id} className="rounded-xl border border-[#E2E8F0] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${NOTE_TYPE_STYLE[n.type]}`}>
                      <Icon size={16} />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-[#1A1A1A]">
                        {NOTE_TYPE_LABELS[n.type] ?? n.type}
                        {!selectedEmployee && <span className="font-normal text-[#64748B]"> · {n.employee.user.fullName}</span>}
                      </p>
                      <p className="text-[11px] text-[#94A3B8]">{n.author.fullName} · {fmtDateOnly(n.createdAt, { day: "2-digit", month: "2-digit", year: "numeric" })}</p>
                    </div>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-[#1A1A1A]">{n.note}</p>
              </div>
            );
          })}
          {employeeNotes.length === 0 && (
            <p className="rounded-xl border border-[#E2E8F0] bg-white p-6 text-center text-sm text-[#94A3B8]">
              {selectedEmployee ? "Sin notas para este colaborador todavía." : "Sin notas registradas todavía."}
            </p>
          )}
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-black text-[#1A1A1A]">Nueva nota</h3>
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
                    ...employees.filter((e) => e.status === "ACTIVE").map((e) => ({ value: e.id, label: e.user.fullName })),
                  ]}
                />
              </Field>
              <Field label="Tipo">
                <SimpleSelect
                  value={form.type}
                  onChange={(v) => setForm({ ...form, type: v })}
                  className="w-full"
                  options={Object.entries(NOTE_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
                />
              </Field>
              <Field label="Nota">
                <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={4}
                  className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#1A1A1A]" />
              </Field>
            </div>

            <div className="mt-6 flex gap-2">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm font-bold text-[#64748B]">Cancelar</button>
              <button onClick={createNote} disabled={saving}
                className="flex-1 rounded-lg bg-[#27B1B8] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
                {saving ? "Guardando…" : "Guardar nota"}
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
