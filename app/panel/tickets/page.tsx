"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MdSearch, MdAdd, MdAttachFile, MdSend, MdCheckCircle, MdUploadFile, MdClose, MdInsertDriveFile,
  MdShoppingBag, MdDescription, MdCheckroom, MdConstruction, MdChair, MdMoreHoriz, MdDesignServices, MdStorefront, MdComputer, MdDirectionsCar, MdCategory,
} from "react-icons/md";
import type { IconType } from "react-icons";
import { SimpleSelect } from "../_components/simple-select";
import { Section, Empty, Table, Badge, Modal, Footer, btnPrimary, labelCls, inputCls, post, patchReq } from "../_components/ops-ui";
import { TICKET_SLA_LABELS, responsiblesForCategory } from "@/lib/tickets";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";

type Ticket = {
  id: string;
  code: string;
  subject: string;
  priority: string;
  status: string;
  createdAt: string;
  dueDate: string | null;
  category: { name: string };
  employee: { user: { fullName: string } };
  responsible: { id: string; fullName: string } | null;
};
type Category = { id: string; name: string; allowedDepartmentIds: string[] };
type Comment = { id: string; message: string; createdAt: string; user: { fullName: string } };
type TicketDetail = Ticket & {
  description: string;
  attachments?: { id: string; url: string; name: string; size: number | null }[];
  comments?: Comment[];
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

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

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

function CategoryIcon({ name, size = 26 }: { name: string; size?: number }) {
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
      const { role } = await pRes.json();
      setCanManageAssignment(role === "RRHH" || role === "ADMIN" || role === "SUPERADMIN");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
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
              head={["Ticket", "Tipo", "Solicitante", "Fecha", "Prioridad", "Vence", "Estado", "Responsable"]}
              onRowClick={(i) => setDetailId(filtered[i].id)}
              rows={filtered.map((t) => [
                <span key="c" className="font-mono text-xs font-bold text-[#27B1B8]">{t.code}</span>,
                <span key="t" className="flex items-center gap-2"><CategoryIcon name={t.category.name} size={22} />{t.category.name}</span>,
                t.employee.user.fullName,
                fmt(t.createdAt),
                <Badge key="p" label={PRIORITY_LABELS[t.priority]} cls={PRIORITY_BADGE[t.priority]} />,
                t.dueDate ? (
                  <span key="d" className={t.status !== "FINALIZADO" && t.status !== "CANCELADO" && new Date(t.dueDate) < new Date() ? "font-semibold text-[#DC2626]" : "text-[#64748B]"}>
                    {fmt(t.dueDate)}
                  </span>
                ) : "—",
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
          onClose={() => setDetailId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

function TicketDetailModal({ id, staff, canManageAssignment, onClose, onChanged }: {
  id: string;
  staff: StaffUser[];
  canManageAssignment: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const refresh = async () => {
    const res = await fetch(`/api/rrhh-local/tickets/${id}`);
    if (res.ok) setDetail(await res.json());
  };
  useEffect(() => { refresh(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
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

  const openAttachment = async (path: string) => {
    const res = await fetch(`/api/rrhh-local/tickets/download?path=${encodeURIComponent(path)}`);
    if (!res.ok) { setError("No fue posible abrir el archivo"); return; }
    const { url } = await res.json();
    window.open(url, "_blank", "noopener,noreferrer");
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

  const sendComment = async () => {
    if (!comment.trim()) return;
    setSaving(true);
    setError(null);
    const res = await post(`/api/rrhh-local/tickets/${id}/comments`, { message: comment });
    if (res.ok) { setComment(""); await refresh(); } else setError(res.error!);
    setSaving(false);
  };

  if (!detail) {
    return (
      <Modal title="Cargando…" onClose={onClose}>
        <div className="flex h-24 items-center justify-center text-sm text-[#94A3B8]">Cargando…</div>
      </Modal>
    );
  }

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
      <div>
        <p className="text-sm font-bold text-[#1A1A1A]">{detail.subject}</p>
        <p className="mt-0.5 text-xs text-[#94A3B8]">
          {detail.category.name} · Creado por {detail.employee.user.fullName} · {fmt(detail.createdAt)}
        </p>
      </div>

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

      <div>
        <label className={labelCls}>Descripción de la solicitud</label>
        <div className="rounded-xl bg-[#F8FAFC] p-3 text-sm text-[#1A1A1A] whitespace-pre-wrap">{detail.description}</div>
      </div>

      <div>
        <label className={labelCls}>Adjuntos {detail.attachments?.length ? `(${detail.attachments.length})` : ""}</label>
        <div className="flex flex-wrap items-center gap-2">
          {detail.attachments?.map((a) => (
            <button
              key={a.id}
              onClick={() => openAttachment(a.url)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] px-2.5 py-1.5 text-xs text-[#64748B] hover:bg-[#F8FAFC]"
            >
              <MdAttachFile size={14} /> {a.name}{a.size ? ` · ${fileSize(a.size)}` : ""}
            </button>
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

  const category = categories.find((c) => c.id === categoryId);
  const responsibles = category ? responsiblesForCategory(responsiblesByDept, category.allowedDepartmentIds) : [];

  const changeCategory = (id: string) => {
    setCategoryId(id);
    setResponsibleId("");
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
    const res = await post("/api/rrhh-local/tickets", { categoryId, priority, subject, description, responsibleId: responsibleId || null, attachments: files.map(({ path, name, size }) => ({ path, name, size })) });
    setSubmitting(false);
    if (res.ok) onDone("Solicitud enviada"); else onError(res.error!);
  };

  return (
    <Modal title="Nueva solicitud" onClose={onClose} footer={<Footer onClose={onClose} onSubmit={submit} submitting={submitting} disabled={!categoryId || !subject.trim() || !description.trim() || (responsibles.length > 0 && !responsibleId)} />}>
      <div>
        <label className={labelCls}>Tipo de solicitud</label>
        <SimpleSelect
          value={categoryId}
          onChange={changeCategory}
          options={categories.map((c) => ({
            value: c.id,
            label: (
              <span className="flex items-center gap-2.5">
                <CategoryIcon name={c.name} />
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
