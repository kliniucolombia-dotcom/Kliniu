"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MdSearch, MdAdd } from "react-icons/md";
import { SimpleSelect } from "../_components/simple-select";
import { Section, Empty, Table, Badge, Modal, Footer, btnPrimary, labelCls, inputCls, post } from "../_components/ops-ui";

type Ticket = {
  id: string;
  code: string;
  subject: string;
  priority: string;
  status: string;
  createdAt: string;
  category: { name: string };
  employee: { user: { fullName: string } };
  responsible: { id: string; fullName: string } | null;
};
type Category = { id: string; name: string };

const PRIORITY_LABELS: Record<string, string> = { BAJA: "Baja", MEDIA: "Media", ALTA: "Alta", URGENTE: "Urgente" };
const PRIORITY_BADGE: Record<string, string> = {
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
const STATUS_BADGE: Record<string, string> = {
  PENDIENTE: "bg-[#FEF3C7] text-[#B45309]",
  EN_PROCESO: "bg-[#DBEAFE] text-[#2563EB]",
  ESPERANDO_RESPUESTA: "bg-[#EDE9FE] text-[#7C3AED]",
  FINALIZADO: "bg-[#DCFCE7] text-[#16A34A]",
  CANCELADO: "bg-[#F1F5F9] text-[#64748B]",
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
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

  const load = async () => {
    const [tRes, cRes] = await Promise.all([
      fetch("/api/panel/tickets"),
      fetch("/api/rrhh-local/ticket-categories"),
    ]);
    if (tRes.status === 401 || tRes.status === 403) { router.push("/panel/sin-acceso"); return; }
    if (tRes.ok) {
      const data = await tRes.json();
      setTickets(data.tickets);
      setScope(data.scope);
      setDepartment(data.department);
    }
    if (cRes.ok) setCategories(await cRes.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 4000);
    return () => clearTimeout(t);
  }, [alert]);

  const filtered = useMemo(() => tickets.filter((t) => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.code.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q) || t.employee.user.fullName.toLowerCase().includes(q);
    }
    return true;
  }), [tickets, search, statusFilter]);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Solicitudes</p>
          <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">
            {scope === "all" ? "Todas las solicitudes" : department ? `Solicitudes de ${department}` : "Solicitudes de mi departamento"}
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            {scope === "all" ? "Vista completa (RRHH)." : "Categorías de PQRS habilitadas para tu departamento."}
          </p>
        </div>
        {categories.length > 0 && (
          <button className={btnPrimary} onClick={() => setShowNew(true)}><MdAdd size={16} />Nueva solicitud</button>
        )}
      </div>

      {alert && (
        <div className={`mb-4 rounded-xl px-3 py-2 text-xs font-semibold ${alert.type === "ok" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEE2E2] text-[#DC2626]"}`}>{alert.msg}</div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-[#94A3B8]">Cargando…</div>
      ) : (
        <Section title={`Solicitudes (${filtered.length})`}>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2">
              <MdSearch size={16} className="text-[#94A3B8]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar ticket, asunto o solicitante…"
                className="w-full text-sm text-[#1A1A1A] outline-none" />
            </div>
            <SimpleSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[{ value: "", label: "Estado: Todos" }, ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))]}
            />
          </div>

          {!department && scope === "department" ? (
            <Empty text="No tienes un departamento asignado. Pide a RRHH que lo configure en tu perfil de empleado." />
          ) : (
            <Table
              head={["Ticket", "Tipo", "Solicitante", "Fecha", "Prioridad", "Estado", "Responsable"]}
              rows={filtered.map((t) => [
                <b key="c" className="font-mono text-xs text-[#27B1B8]">{t.code}</b>,
                t.category.name,
                t.employee.user.fullName,
                fmt(t.createdAt),
                <Badge key="p" label={PRIORITY_LABELS[t.priority]} cls={PRIORITY_BADGE[t.priority]} />,
                <Badge key="s" label={STATUS_LABELS[t.status]} cls={STATUS_BADGE[t.status]} />,
                t.responsible?.fullName ?? "Sin asignar",
              ])}
              empty="Sin solicitudes con estos filtros."
            />
          )}
        </Section>
      )}

      {showNew && (
        <NewTicketModal
          categories={categories}
          onClose={() => setShowNew(false)}
          onDone={(msg) => { setShowNew(false); setAlert({ type: "ok", msg }); load(); }}
          onError={(msg) => setAlert({ type: "err", msg })}
        />
      )}
    </div>
  );
}

function NewTicketModal({ categories, onClose, onDone, onError }: {
  categories: Category[];
  onClose: () => void;
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [priority, setPriority] = useState("MEDIA");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    const res = await post("/api/rrhh-local/tickets", { categoryId, priority, subject, description });
    setSubmitting(false);
    if (res.ok) onDone("Solicitud enviada"); else onError(res.error!);
  };

  return (
    <Modal title="Nueva solicitud" onClose={onClose} footer={<Footer onClose={onClose} onSubmit={submit} submitting={submitting} disabled={!categoryId || !subject.trim() || !description.trim()} />}>
      <div>
        <label className={labelCls}>Tipo de solicitud</label>
        <SimpleSelect value={categoryId} options={categories.map((c) => ({ value: c.id, label: c.name }))} onChange={setCategoryId} />
      </div>
      <div>
        <label className={labelCls}>Prioridad</label>
        <SimpleSelect value={priority} options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))} onChange={setPriority} />
      </div>
      <div>
        <label className={labelCls}>Asunto</label>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Descripción</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={inputCls} />
      </div>
    </Modal>
  );
}
