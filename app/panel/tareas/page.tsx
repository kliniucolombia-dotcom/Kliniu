"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MdAdd, MdClose, MdDelete, MdChatBubbleOutline, MdAttachFile, MdSearch,
  MdCheckCircle, MdRadioButtonUnchecked, MdViewKanban, MdViewList, MdCalendarMonth,
  MdInsertChart, MdMoreHoriz, MdChevronLeft, MdChevronRight, MdFlag, MdPersonOutline, MdStickyNote2,
} from "react-icons/md";
import { SimpleSelect } from "../_components/simple-select";
import { useConfirm } from "@/app/components/confirm-dialog";
import { btnPrimary, btnGhost, labelCls, inputCls, post, patchReq } from "../_components/ops-ui";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";
import { AREAS, areaForRole } from "@/lib/areas";
import { SkeletonTable } from "../../components/skeleton";

type Status = "PENDING" | "IN_PROGRESS" | "COMPLETED";
type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type UserLite = { id: string; fullName: string; avatarUrl: string | null; role?: string };
type ChecklistItem = { id: string; text: string; done: boolean };
type Attachment = { url: string; name: string; isImage: boolean };
type Task = {
  id: string; title: string; description: string | null; status: Status; priority: Priority;
  dueDate: string | null; position: number; labels: string[]; checklist: ChecklistItem[]; attachments: Attachment[];
  createdAt: string; completedAt: string | null;
  createdBy: UserLite; assignees: { user: UserLite }[]; _count: { comments: number };
};
type Comment = { id: string; message: string; createdAt: string; author: UserLite };
type View = "board" | "list" | "calendar" | "summary" | "notes";
type GroupBy = "status" | "assignee" | "priority" | "label";

const COLUMNS: { key: Status; title: string; accent: string; dot: string }[] = [
  { key: "PENDING", title: "Pendiente", accent: "#F59E0B", dot: "bg-[#F59E0B]" },
  { key: "IN_PROGRESS", title: "En progreso", accent: "#2563EB", dot: "bg-[#2563EB]" },
  { key: "COMPLETED", title: "Completado", accent: "#16A34A", dot: "bg-[#16A34A]" },
];
const PRIORITY: Record<Priority, { label: string; text: string; dot: string }> = {
  LOW: { label: "Baja", text: "text-[#16A34A]", dot: "bg-[#16A34A]" },
  MEDIUM: { label: "Media", text: "text-[#D97706]", dot: "bg-[#F59E0B]" },
  HIGH: { label: "Alta", text: "text-[#DC2626]", dot: "bg-[#DC2626]" },
  URGENT: { label: "Urgente", text: "text-[#B91C1C]", dot: "bg-[#B91C1C]" },
};
const LABEL_PALETTE = [
  { bg: "#EDE9FE", fg: "#6D28D9" }, { bg: "#DBEAFE", fg: "#1D4ED8" }, { bg: "#DCFCE7", fg: "#15803D" },
  { bg: "#FEF3C7", fg: "#B45309" }, { bg: "#FCE7F3", fg: "#BE185D" }, { bg: "#E0F2FE", fg: "#0369A1" },
  { bg: "#E6FAFB", fg: "#0C535B" }, { bg: "#FFEDD5", fg: "#C2410C" }, { bg: "#F1F5F9", fg: "#475569" },
];
const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function labelColor(label: string) {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0;
  return LABEL_PALETTE[h % LABEL_PALETTE.length];
}
function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "?";
}
function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "short" });
}
function overload() {
  return Date.now();
}
function isOverdue(t: { dueDate: string | null; status: Status }) {
  return Boolean(t.dueDate && t.status !== "COMPLETED" && new Date(t.dueDate).getTime() < overload());
}
function isDueWithin(t: { dueDate: string | null; status: Status }, days: number) {
  if (!t.dueDate || t.status === "COMPLETED") return false;
  const diff = new Date(t.dueDate).getTime() - overload();
  return diff >= 0 && diff <= days * 86400_000;
}
function todayKey() {
  return new Date(overload() - 5 * 3600 * 1000).toISOString().slice(0, 10);
}
function monthKey() {
  return new Date(overload() - 5 * 3600 * 1000).toISOString().slice(0, 7);
}
function buildMonth(key: string) {
  const [y, m] = key.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells: { date: string; day: number; inMonth: boolean }[] = [];
  for (let i = 0; i < startOffset; i++) {
    const d = new Date(y, m - 1, i - startOffset + 1);
    cells.push({ date: isoDay(d), day: d.getDate(), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: isoDay(new Date(y, m - 1, d)), day: d, inMonth: true });
  while (cells.length % 7 !== 0) {
    const d = new Date(y, m - 1, daysInMonth + (cells.length - startOffset - daysInMonth) + 1);
    cells.push({ date: isoDay(d), day: d.getDate(), inMonth: false });
  }
  return cells;
}
function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function dueKey(iso: string | null) {
  if (!iso) return null;
  return new Date(new Date(iso).getTime() - 5 * 3600 * 1000).toISOString().slice(0, 10);
}

function Avatar({ user, size = 24 }: { user: UserLite; size?: number }) {
  return user.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={user.avatarUrl} alt={user.fullName} title={user.fullName} className="shrink-0 rounded-full object-cover ring-2 ring-white" style={{ width: size, height: size }} />
  ) : (
    <span title={user.fullName} className="flex shrink-0 items-center justify-center rounded-full bg-[#E6FAFB] font-bold text-[#0C535B] ring-2 ring-white" style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}>
      {initials(user.fullName)}
    </span>
  );
}

function LabelChip({ label }: { label: string }) {
  const c = labelColor(label);
  return <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{ background: c.bg, color: c.fg }}>{label}</span>;
}

function ChecklistBar({ items }: { items: ChecklistItem[] }) {
  if (!items.length) return null;
  const done = items.filter((i) => i.done).length;
  return (
    <span className="flex items-center gap-1.5" title={`${done} de ${items.length} completados`}>
      <span className="h-1.5 w-10 overflow-hidden rounded-full bg-[#E2E8F0]">
        <span className="block h-full rounded-full bg-[#2563EB]" style={{ width: `${(done / items.length) * 100}%` }} />
      </span>
      <span className="text-[11px] font-semibold text-[#64748B]">{done}/{items.length}</span>
    </span>
  );
}

export default function TareasPanel() {
  const router = useRouter();
  const confirm = useConfirm();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [view, setView] = useState<View>("board");
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<"all" | "mine" | "assignedByMe">("all");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [labelFilter, setLabelFilter] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("status");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<Status | null>(null);
  const [cursor, setCursor] = useState(monthKey());
  const [modal, setModal] = useState<{ task?: Task; status: Status } | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/panel/tareas");
    if (r.status === 401 || r.status === 403) { router.push("/panel/sin-acceso"); return; }
    if (!r.ok) { setLoading(false); return; }
    const d = await r.json();
    setTasks(d.tasks);
    setUsers(d.users);
    setCurrentUserId(d.currentUserId);
    setLoading(false);
  }, [router]);

  const { markLocalWrite } = useRealtimeRefresh(["planner"], load);
  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t); }, [load]);
  useEffect(() => { if (!alert) return; const t = setTimeout(() => setAlert(null), 4000); return () => clearTimeout(t); }, [alert]);

  const canMutate = useCallback((t: Task) => t.createdBy.id === currentUserId || t.assignees.some((a) => a.user.id === currentUserId), [currentUserId]);

  const allLabels = useMemo(() => Array.from(new Set(tasks.flatMap((t) => t.labels))).sort(), [tasks]);
  const participants = useMemo(() => {
    const seen = new Map<string, UserLite>();
    for (const t of tasks) for (const a of t.assignees) seen.set(a.user.id, a.user);
    return Array.from(seen.values()).slice(0, 10);
  }, [tasks]);

  const filtered = useMemo(() => tasks.filter((t) => {
    if (scope === "mine" && !t.assignees.some((a) => a.user.id === currentUserId)) return false;
    if (scope === "assignedByMe" && t.createdBy.id !== currentUserId) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    if (assigneeFilter === "none" && t.assignees.length > 0) return false;
    if (assigneeFilter && assigneeFilter !== "none" && !t.assignees.some((a) => a.user.id === assigneeFilter)) return false;
    if (labelFilter && !t.labels.includes(labelFilter)) return false;
    if (dateFilter === "overdue" && !isOverdue(t)) return false;
    if (dateFilter === "week" && !isDueWithin(t, 7)) return false;
    if (dateFilter === "none" && t.dueDate) return false;
    const q = search.trim().toLowerCase();
    if (q && !`${t.title} ${t.description ?? ""} ${t.labels.join(" ")} ${t.assignees.map((a) => a.user.fullName).join(" ")}`.toLowerCase().includes(q)) return false;
    return true;
  }), [tasks, scope, priorityFilter, assigneeFilter, labelFilter, dateFilter, search, currentUserId]);

  const moveTask = async (task: Task, status: Status) => {
    if (task.status === status) return;
    markLocalWrite();
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status, completedAt: status === "COMPLETED" ? new Date().toISOString() : null } : t)));
    const res = await patchReq(`/api/panel/tareas/${task.id}`, { status, position: 0 });
    if (!res.ok) setAlert({ type: "err", msg: res.error! });
    load();
  };

  const openNew = (status: Status) => setModal({ status });
  const counts = { PENDING: filtered.filter((t) => t.status === "PENDING").length, IN_PROGRESS: filtered.filter((t) => t.status === "IN_PROGRESS").length, COMPLETED: filtered.filter((t) => t.status === "COMPLETED").length } as Record<Status, number>;

  return (
    <div className="min-h-full bg-[#F4F6F8] p-4 lg:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-[#1A1A1A]">Tareas</h1>
          <p className="text-sm text-[#64748B]">Organiza, asigna y haz seguimiento del trabajo del equipo.</p>
        </div>
        <div className="flex items-center gap-3">
          {participants.length > 0 && (
            <div className="hidden items-center md:flex">
              {participants.map((u, i) => <span key={u.id} className="rounded-full" style={{ marginLeft: i ? -8 : 0 }}><Avatar user={u} size={30} /></span>)}
            </div>
          )}
          <button className={`${btnPrimary} !rounded-full !px-4 shrink-0 whitespace-nowrap`} onClick={() => openNew("PENDING")}><MdAdd size={18} />Nueva tarea</button>
        </div>
      </div>

      <div className="mb-4 border-b border-[#E2E8F0]">
        <div className="-mb-px flex gap-1 overflow-x-auto">
          {([["board", "Tablero", <MdViewKanban key="b" size={16} />], ["list", "Lista", <MdViewList key="l" size={16} />], ["calendar", "Calendario", <MdCalendarMonth key="c" size={16} />], ["summary", "Resumen", <MdInsertChart key="s" size={16} />], ["notes", "Mis notas", <MdStickyNote2 key="n" size={16} />]] as [View, string, React.ReactNode][]).map(([k, label, icon]) => (
            <button
              key={k}
              onClick={() => setView(k)}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-bold transition sm:px-4 ${view === k ? "border-[#27B1B8] text-[#0C535B]" : "border-transparent text-[#64748B] hover:text-[#1A1A1A]"}`}
            >
              {icon}{label}
            </button>
          ))}
        </div>
      </div>

      {alert && <div className={`mb-4 rounded-xl px-3 py-2 text-xs font-semibold ${alert.type === "ok" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEE2E2] text-[#DC2626]"}`}>{alert.msg}</div>}

      {view === "notes" ? <NotesView /> : <>
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-[#E2E8F0] bg-white px-3 py-2.5 shadow-sm">
        <div className="relative w-full min-w-0 sm:w-auto sm:flex-1">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]"><MdSearch size={16} /></span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar tareas…" className="w-full rounded-xl border border-transparent bg-[#F4F6F8] py-2 pl-8 pr-2 text-sm outline-none focus:border-[#27B1B8]" />
        </div>
        <FilterSelect label="Responsable" value={assigneeFilter} onChange={setAssigneeFilter} options={[{ value: "", label: "Todos" }, { value: "none", label: "Sin asignar" }, ...users.map((u) => ({ value: u.id, label: u.fullName }))]} />
        <FilterSelect label="Prioridad" value={priorityFilter} onChange={setPriorityFilter} options={[{ value: "", label: "Todas" }, ...(Object.keys(PRIORITY) as Priority[]).map((p) => ({ value: p, label: PRIORITY[p].label }))]} />
        <FilterSelect label="Fecha" value={dateFilter} onChange={setDateFilter} options={[{ value: "all", label: "Todas" }, { value: "overdue", label: "Vencidas" }, { value: "week", label: "Próx. 7 días" }, { value: "none", label: "Sin fecha" }]} />
        <FilterSelect label="Etiqueta" value={labelFilter} onChange={setLabelFilter} options={[{ value: "", label: "Todas" }, ...allLabels.map((l) => ({ value: l, label: l }))]} />
        <FilterSelect label="Ver" value={scope} onChange={(v) => setScope(v as typeof scope)} options={[{ value: "all", label: "Todas" }, { value: "mine", label: "Mis tareas" }, { value: "assignedByMe", label: "Asignadas por mí" }]} />
        {view !== "calendar" && view !== "summary" && (
          <FilterSelect label="Agrupar por" value={groupBy} onChange={(v) => setGroupBy(v as GroupBy)} options={[{ value: "status", label: "Estado" }, { value: "assignee", label: "Responsable" }, { value: "priority", label: "Prioridad" }, { value: "label", label: "Etiqueta" }]} />
        )}
      </div>

      {loading ? <SkeletonTable /> : view === "board" ? (
        <BoardView
          tasks={filtered} groupBy={groupBy} counts={counts} canMutate={canMutate}
          draggingId={draggingId} setDraggingId={setDraggingId} overColumn={overColumn} setOverColumn={setOverColumn}
          onMove={moveTask} onOpen={(t) => setModal({ task: t, status: t.status })} onAdd={openNew}
        />
      ) : view === "list" ? (
        <ListView tasks={filtered} groupBy={groupBy} onOpen={(t) => setModal({ task: t, status: t.status })} />
      ) : view === "calendar" ? (
        <CalendarView tasks={filtered} cursor={cursor} setCursor={setCursor} onOpen={(t) => setModal({ task: t, status: t.status })} />
      ) : (
        <SummaryView tasks={filtered} users={users} />
      )}
      </>}

      {modal && (
        <TaskDrawer
          task={modal.task}
          initialStatus={modal.status}
          users={users}
          canMutate={modal.task ? canMutate(modal.task) : true}
          onClose={() => setModal(null)}
          onDone={(msg) => { setModal(null); setAlert({ type: "ok", msg }); load(); }}
          onError={(msg) => setAlert({ type: "err", msg })}
          markLocalWrite={markLocalWrite}
          confirm={confirm}
        />
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="flex w-[calc(50%-0.25rem)] min-w-0 flex-col items-stretch gap-0.5 sm:w-auto sm:flex-row sm:items-center sm:gap-1.5">
      <span className="truncate text-[11px] font-semibold leading-none text-[#94A3B8] sm:text-xs">{label}</span>
      <SimpleSelect className="w-full sm:w-auto" value={value} options={options} onChange={onChange} triggerClassName="flex w-full items-center justify-between gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-2.5 py-2 text-sm font-semibold text-[#475569] hover:bg-[#F8FAFC]" />
    </div>
  );
}

function groupTasks(tasks: Task[], groupBy: GroupBy): { label: string; items: Task[] }[] {
  if (groupBy === "status") return [];
  const map = new Map<string, Task[]>();
  for (const t of tasks) {
    const keys = groupBy === "assignee"
      ? (t.assignees.length ? t.assignees.map((a) => a.user.fullName) : ["Sin asignar"])
      : groupBy === "priority"
        ? [PRIORITY[t.priority].label]
        : (t.labels.length ? t.labels : ["Sin etiqueta"]);
    for (const k of keys) map.set(k, [...(map.get(k) ?? []), t]);
  }
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([label, items]) => ({ label, items }));
}

function BoardView({ tasks, groupBy, counts, canMutate, draggingId, setDraggingId, overColumn, setOverColumn, onMove, onOpen, onAdd }: {
  tasks: Task[]; groupBy: GroupBy; counts: Record<Status, number>;
  canMutate: (t: Task) => boolean; draggingId: string | null; setDraggingId: (v: string | null) => void;
  overColumn: Status | null; setOverColumn: (v: Status | null) => void;
  onMove: (t: Task, s: Status) => void; onOpen: (t: Task) => void; onAdd: (s: Status) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {COLUMNS.map((col) => {
        const items = tasks.filter((t) => t.status === col.key);
        const groups = groupBy === "status" ? [{ label: "", items }] : groupTasks(items, groupBy);
        return (
          <div
            key={col.key}
            onDragOver={(e) => { e.preventDefault(); setOverColumn(col.key); }}
            onDragLeave={() => setOverColumn(overColumn === col.key ? null : overColumn)}
            onDrop={() => { const t = tasks.find((x) => x.id === draggingId); if (t) onMove(t, col.key); setDraggingId(null); setOverColumn(null); }}
            className={`flex min-h-[40vh] flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm transition md:min-h-[70vh] ${overColumn === col.key ? "ring-2 ring-[#27B1B8]" : ""}`}
          >
            <div className="h-1" style={{ background: col.accent }} />
            <div className="flex items-center justify-between border-b border-[#F1F5F9] px-3.5 py-3">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                <p className="text-sm font-black text-[#1A1A1A]">{col.title}</p>
                <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[11px] font-bold text-[#64748B]">{counts[col.key]}</span>
              </div>
              <button onClick={() => onAdd(col.key)} title="Agregar tarea" aria-label="Agregar tarea" className="flex h-7 w-7 items-center justify-center rounded-lg text-[#94A3B8] transition hover:bg-[#F1F5F9] hover:text-[#27B1B8]">
                <MdAdd size={18} />
              </button>
            </div>
            <div className="flex-1 space-y-2.5 bg-[#FBFCFD] p-2.5">
              {items.length === 0 && <div className="rounded-xl border border-dashed border-[#E2E8F0] py-10 text-center text-xs text-[#94A3B8]">Sin tareas</div>}
              {groups.map((g, gi) => (
                <div key={g.label || gi} className="space-y-2.5">
                  {g.label && <p className="px-1 pt-1 text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">{g.label} · {g.items.length}</p>}
                  {g.items.map((t) => (
                    <TaskCard key={`${g.label}-${t.id}`} task={t} draggable={canMutate(t)} dragging={draggingId === t.id} onDragStart={() => setDraggingId(t.id)} onDragEnd={() => { setDraggingId(null); setOverColumn(null); }} onOpen={() => onOpen(t)} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TaskCard({ task: t, draggable, dragging, onDragStart, onDragEnd, onOpen }: {
  task: Task; draggable: boolean; dragging: boolean; onDragStart: () => void; onDragEnd: () => void; onOpen: () => void;
}) {
  const overdue = isOverdue(t);
  const p = PRIORITY[t.priority];
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className={`cursor-pointer rounded-xl border border-[#E2E8F0] bg-white p-3 shadow-sm transition hover:shadow-md ${dragging ? "opacity-40" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm font-bold leading-snug ${t.status === "COMPLETED" ? "text-[#94A3B8] line-through" : "text-[#1A1A1A]"}`}>{t.title}</p>
        <MdMoreHoriz size={16} className="mt-0.5 shrink-0 text-[#CBD5E1]" />
      </div>
      {t.description && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#64748B]">{t.description}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {t.labels.map((l) => <LabelChip key={l} label={l} />)}
        <span className={`flex items-center gap-1 rounded-md bg-[#F8FAFC] px-1.5 py-0.5 text-[10px] font-bold ${p.text}`}><MdFlag size={11} />{p.label}</span>
      </div>      {t.checklist.length > 0 && <div className="mt-2"><ChecklistBar items={t.checklist} /></div>}
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[#F1F5F9] pt-2.5">
        <div className="flex min-w-0 items-center gap-1.5">
          {t.assignees.length > 0 ? (
            <>
              <div className="flex -space-x-2">{t.assignees.slice(0, 3).map((a) => <Avatar key={a.user.id} user={a.user} size={22} />)}</div>
              <span className="truncate text-[11px] font-semibold text-[#64748B]">{t.assignees[0].user.fullName.split(" ")[0]}</span>
            </>
          ) : <span className="flex items-center gap-1 text-[11px] text-[#CBD5E1]"><MdPersonOutline size={13} />Sin asignar</span>}
        </div>
        <div className="flex shrink-0 items-center gap-2.5 text-[11px] text-[#94A3B8]">
          {t.dueDate && <span className={`font-semibold ${overdue ? "text-[#DC2626]" : ""}`}>📅 {fmtDay(t.dueDate)}</span>}
          {t._count.comments > 0 && <span className="flex items-center gap-0.5"><MdChatBubbleOutline size={13} />{t._count.comments}</span>}
          {t.attachments.length > 0 && <span className="flex items-center gap-0.5"><MdAttachFile size={13} />{t.attachments.length}</span>}
        </div>
      </div>
    </div>
  );
}

function ListView({ tasks, groupBy, onOpen }: { tasks: Task[]; groupBy: GroupBy; onOpen: (t: Task) => void }) {
  const sections = groupBy === "status"
    ? COLUMNS.map((c) => ({ label: c.title, dot: c.dot, items: tasks.filter((t) => t.status === c.key) })).filter((s) => s.items.length > 0)
    : groupTasks(tasks, groupBy).map((g) => ({ label: g.label, dot: "bg-[#94A3B8]", items: g.items }));
  if (tasks.length === 0) return <div className="rounded-2xl border border-dashed border-[#E2E8F0] bg-white py-16 text-center text-sm text-[#94A3B8]">Sin tareas con los filtros actuales.</div>;
  return (
    <div className="space-y-5">
      {sections.map((s) => (
        <div key={s.label}>
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#64748B]"><span className={`h-2 w-2 rounded-full ${s.dot}`} />{s.label} · {s.items.length}</p>
          <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
            {s.items.map((t) => (
              <button key={t.id} onClick={() => onOpen(t)} className="flex w-full items-center gap-3 border-b border-[#F1F5F9] px-4 py-3 text-left last:border-0 hover:bg-[#F8FAFC]">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${t.status === "COMPLETED" ? "bg-[#16A34A]" : t.status === "IN_PROGRESS" ? "bg-[#2563EB]" : "bg-[#F59E0B]"}`} />
                <span className={`min-w-0 flex-1 truncate text-sm font-semibold ${t.status === "COMPLETED" ? "text-[#94A3B8] line-through" : "text-[#1A1A1A]"}`}>{t.title}</span>
                <span className="hidden flex-wrap items-center gap-1 lg:flex">{t.labels.slice(0, 2).map((l) => <LabelChip key={l} label={l} />)}</span>
                <span className={`hidden w-16 text-right text-xs font-bold sm:block ${PRIORITY[t.priority].text}`}>{PRIORITY[t.priority].label}</span>
                {t.checklist.length > 0 && <span className="hidden md:block"><ChecklistBar items={t.checklist} /></span>}
                <span className="hidden w-20 items-center justify-end gap-1 sm:flex">
                  {t.assignees.slice(0, 3).map((a) => <Avatar key={a.user.id} user={a.user} size={22} />)}
                </span>
                <span className={`w-16 text-right text-xs font-semibold ${isOverdue(t) ? "text-[#DC2626]" : "text-[#94A3B8]"}`}>{t.dueDate ? fmtDay(t.dueDate) : "—"}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CalendarView({ tasks, cursor, setCursor, onOpen }: { tasks: Task[]; cursor: string; setCursor: (v: string) => void; onOpen: (t: Task) => void }) {
  const cells = useMemo(() => buildMonth(cursor), [cursor]);
  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) { const k = dueKey(t.dueDate); if (!k) continue; map.set(k, [...(map.get(k) ?? []), t]); }
    return map;
  }, [tasks]);
  const [y, m] = cursor.split("-").map(Number);
  const shift = (delta: number) => {
    const d = new Date(y, m - 1 + delta, 1);
    setCursor(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const today = todayKey();
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-base font-black text-[#1A1A1A]">{MONTHS[m - 1]} {y}</p>
        <div className="flex items-center gap-1">
          <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]" onClick={() => shift(-1)}><MdChevronLeft size={18} /></button>
          <button className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC]" onClick={() => setCursor(monthKey())}>Hoy</button>
          <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]" onClick={() => shift(1)}><MdChevronRight size={18} /></button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[640px] grid-cols-7 border-l border-t border-[#F1F5F9]">
        {WEEKDAYS.map((w) => <div key={w} className="border-b border-r border-[#F1F5F9] bg-[#F8FAFC] py-2 text-center text-[11px] font-bold uppercase text-[#94A3B8]">{w}</div>)}
        {cells.map((c) => {
          const items = byDay.get(c.date) ?? [];
          return (
            <div key={c.date} className={`min-h-[96px] border-b border-r border-[#F1F5F9] p-1.5 ${c.inMonth ? "bg-white" : "bg-[#FAFBFC]"}`}>
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${c.date === today ? "bg-[#27B1B8] text-white" : c.inMonth ? "text-[#475569]" : "text-[#CBD5E1]"}`}>{c.day}</span>
              <div className="mt-1 space-y-1">
                {items.slice(0, 3).map((t) => (
                  <button key={t.id} onClick={() => onOpen(t)} className="block w-full truncate rounded px-1.5 py-1 text-left text-[10px] font-semibold text-white" style={{ background: t.status === "COMPLETED" ? "#16A34A" : t.status === "IN_PROGRESS" ? "#2563EB" : "#F59E0B" }} title={t.title}>
                    {t.title}
                  </button>
                ))}
                {items.length > 3 && <p className="px-1 text-[10px] text-[#94A3B8]">+{items.length - 3} más</p>}
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}

function SummaryView({ tasks, users }: { tasks: Task[]; users: UserLite[] }) {
  const total = tasks.length;
  const byStatus = (s: Status) => tasks.filter((t) => t.status === s).length;
  const overdue = tasks.filter((t) => isOverdue(t)).length;
  const byPriority = (Object.keys(PRIORITY) as Priority[]).map((p) => ({ label: PRIORITY[p].label, count: tasks.filter((t) => t.priority === p).length, color: PRIORITY[p].dot }));
  const perUser = users.map((u) => ({ user: u, count: tasks.filter((t) => t.assignees.some((a) => a.user.id === u.id)).length })).filter((x) => x.count > 0).sort((a, b) => b.count - a.count).slice(0, 6);
  const maxP = Math.max(1, ...byPriority.map((b) => b.count));
  const maxU = Math.max(1, ...perUser.map((u) => u.count));

  const kpis: { label: string; value: number; color: string }[] = [
    { label: "Total", value: total, color: "#0C535B" },
    { label: "Pendientes", value: byStatus("PENDING"), color: "#F59E0B" },
    { label: "En progreso", value: byStatus("IN_PROGRESS"), color: "#2563EB" },
    { label: "Completadas", value: byStatus("COMPLETED"), color: "#16A34A" },
    { label: "Vencidas", value: overdue, color: "#DC2626" },
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
            <p className="text-2xl font-black" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs font-semibold text-[#64748B]">{k.label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-black text-[#1A1A1A]">Por prioridad</p>
          <div className="space-y-2.5">
            {byPriority.map((b) => (
              <div key={b.label} className="flex items-center gap-3">
                <span className="w-16 text-xs font-semibold text-[#64748B]">{b.label}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#F1F5F9]"><div className="h-full rounded-full" style={{ width: `${(b.count / maxP) * 100}%`, background: b.color }} /></div>
                <span className="w-6 text-right text-xs font-bold text-[#1A1A1A]">{b.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-black text-[#1A1A1A]">Por responsable</p>
          {perUser.length === 0 ? <p className="text-xs text-[#94A3B8]">Sin tareas asignadas.</p> : (
            <div className="space-y-2.5">
              {perUser.map((u) => (
                <div key={u.user.id} className="flex items-center gap-3">
                  <Avatar user={u.user} size={24} />
                  <span className="w-28 truncate text-xs font-semibold text-[#64748B]">{u.user.fullName}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#F1F5F9]"><div className="h-full rounded-full bg-[#27B1B8]" style={{ width: `${(u.count / maxU) * 100}%` }} /></div>
                  <span className="w-6 text-right text-xs font-bold text-[#1A1A1A]">{u.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskDrawer({
  task, initialStatus, users, canMutate, onClose, onDone, onError, markLocalWrite, confirm,
}: {
  task?: Task; initialStatus: Status; users: UserLite[]; canMutate: boolean;
  onClose: () => void; onDone: (msg: string) => void; onError: (msg: string) => void;
  markLocalWrite: () => void; confirm: (opts: { title: string; message: string; confirmLabel?: string; danger?: boolean }) => Promise<boolean>;
}) {
  const editing = Boolean(task);
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "MEDIUM");
  const [status, setStatus] = useState<Status>(task?.status ?? initialStatus);
  const [dueDate, setDueDate] = useState(task?.dueDate ? dueDateInput(task.dueDate) : "");
  const [labels, setLabels] = useState<string>(task?.labels.join(", ") ?? "");
  const [checklist, setChecklist] = useState<ChecklistItem[]>(task?.checklist ?? []);
  const [attachments, setAttachments] = useState<Attachment[]>(task?.attachments ?? []);
  const [assigneeIds, setAssigneeIds] = useState<string[]>(task?.assignees.map((a) => a.user.id) ?? []);
  const [newItem, setNewItem] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [comment, setComment] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userQuery, setUserQuery] = useState("");

  const assigneeGroups = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    const list = q ? users.filter((u) => u.fullName.toLowerCase().includes(q)) : users;
    const map = new Map<string, UserLite[]>();
    for (const u of list) {
      const key = areaForRole(u.role ?? "") ?? "GENERAL";
      const arr = map.get(key) ?? [];
      arr.push(u);
      map.set(key, arr);
    }
    const groups = AREAS.filter((a) => map.has(a.key)).map((a) => ({ name: a.name as string, items: map.get(a.key)! }));
    if (map.has("GENERAL")) groups.push({ name: "General", items: map.get("GENERAL")! });
    return groups;
  }, [users, userQuery]);

  useEffect(() => {
    if (!task) return;
    fetch(`/api/panel/tareas/${task.id}`).then(async (r) => { if (r.ok) setComments((await r.json()).comments); });
  }, [task]);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/panel/tareas/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) { onError(json.error ?? "No fue posible subir el archivo"); return; }
      setAttachments((a) => [...a, { url: json.url, name: json.name, isImage: json.isImage }]);
    } finally { setUploading(false); }
  };

  const addChecklist = () => {
    if (!newItem.trim()) return;
    setChecklist((c) => [...c, { id: crypto.randomUUID(), text: newItem.trim(), done: false }]);
    setNewItem("");
  };

  const payload = () => ({
    title, description, priority, status, dueDate: dueDate || null,
    labels: labels.split(",").map((l) => l.trim()).filter(Boolean),
    checklist, attachments, assigneeIds,
  });

  const submit = async () => {
    setSaving(true);
    markLocalWrite();
    const res = editing ? await patchReq(`/api/panel/tareas/${task!.id}`, payload()) : await post("/api/panel/tareas", payload());
    setSaving(false);
    if (res.ok) onDone(editing ? "Tarea actualizada" : "Tarea creada"); else onError(res.error!);
  };

  const sendComment = async () => {
    if (!comment.trim() || !task) return;
    markLocalWrite();
    const res = await patchReq(`/api/panel/tareas/${task.id}`, { comment });
    if (res.ok) { const r = await fetch(`/api/panel/tareas/${task.id}`); if (r.ok) setComments((await r.json()).comments); setComment(""); }
    else onError(res.error!);
  };

  const remove = async () => {
    if (!task) return;
    const ok = await confirm({ title: "Eliminar tarea", message: `¿Eliminar "${task.title}"? Esta acción no se puede deshacer.`, confirmLabel: "Eliminar", danger: true });
    if (!ok) return;
    markLocalWrite();
    const r = await fetch(`/api/panel/tareas/${task.id}`, { method: "DELETE" });
    if (r.ok) onDone("Tarea eliminada"); else onError("No fue posible eliminar la tarea");
  };

  const toggleAssignee = (id: string) => setAssigneeIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="flex h-full w-full max-w-[460px] flex-col bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#94A3B8]">{editing ? "Tarea" : "Nueva tarea"}</p>
            <h3 className="text-base font-black text-[#1A1A1A]">{editing ? "Detalle" : "Crear pendiente"}</h3>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#1A1A1A]" aria-label="Cerrar"><MdClose size={20} /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div><label className={labelCls}>Título</label><input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="Qué hay que hacer" maxLength={200} /></div>
          <div><label className={labelCls}>Descripción</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} /></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><label className={labelCls}>Prioridad</label><SimpleSelect value={priority} options={(Object.keys(PRIORITY) as Priority[]).map((p) => ({ value: p, label: PRIORITY[p].label }))} onChange={(v) => setPriority(v as Priority)} /></div>
            <div><label className={labelCls}>Estado</label><SimpleSelect value={status} options={COLUMNS.map((c) => ({ value: c.key, label: c.title }))} onChange={(v) => setStatus(v as Status)} /></div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><label className={labelCls}>Fecha límite</label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Etiquetas</label><input value={labels} onChange={(e) => setLabels(e.target.value)} className={inputCls} placeholder="Compras, Urgente" /></div>
          </div>

          <div>
            <label className={labelCls}>Responsables</label>
            <input value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder="Buscar persona…" className={`${inputCls} mb-2`} />
            <div className="max-h-52 space-y-3 overflow-y-auto rounded-xl border border-[#E2E8F0] p-2">
              {assigneeGroups.length === 0 && <p className="px-1 py-3 text-center text-xs text-[#94A3B8]">Sin resultados</p>}
              {assigneeGroups.map((g) => (
                <div key={g.name}>
                  <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">{g.name} · {g.items.length}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {g.items.map((u) => {
                      const on = assigneeIds.includes(u.id);
                      return (
                        <button key={u.id} type="button" onClick={() => toggleAssignee(u.id)} className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-semibold ${on ? "border-[#27B1B8] bg-[#E6FAFB] text-[#0C535B]" : "border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"}`}>
                          <Avatar user={u} size={18} />{u.fullName}{on ? " ✓" : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Checklist</label>
            <div className="space-y-1.5">
              {checklist.map((it) => (
                <div key={it.id} className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] px-2 py-1.5">
                  <button type="button" onClick={() => setChecklist((c) => c.map((x) => x.id === it.id ? { ...x, done: !x.done } : x))} className="text-[#27B1B8]">
                    {it.done ? <MdCheckCircle size={18} /> : <MdRadioButtonUnchecked size={18} />}
                  </button>
                  <span className={`flex-1 text-sm ${it.done ? "text-[#94A3B8] line-through" : "text-[#1A1A1A]"}`}>{it.text}</span>
                  <button type="button" onClick={() => setChecklist((c) => c.filter((x) => x.id !== it.id))} className="text-[#94A3B8] hover:text-[#DC2626]"><MdClose size={16} /></button>
                </div>
              ))}
              <div className="flex gap-2">
                <input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChecklist(); } }} placeholder="Agregar paso…" className={inputCls} />
                <button type="button" className={btnGhost} onClick={addChecklist}><MdAdd size={16} /></button>
              </div>
            </div>
          </div>

          <div>
            <label className={labelCls}>Adjuntos</label>
            <div className="flex flex-wrap items-center gap-2">
              <label className={`${btnGhost} cursor-pointer`}><MdAttachFile size={16} />{uploading ? "Subiendo…" : "Adjuntar"}
                <input type="file" multiple className="hidden" disabled={uploading} onChange={(e) => { Array.from(e.target.files ?? []).forEach((f) => void upload(f)); e.target.value = ""; }} />
              </label>
              {attachments.map((a, i) => (
                <span key={`${a.url}-${i}`} className="flex items-center gap-1 rounded-lg border border-[#E2E8F0] p-1">
                  {a.isImage
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={a.url} alt={a.name} className="h-10 w-10 rounded object-cover" />
                    : <a href={a.url} target="_blank" rel="noopener noreferrer" className="max-w-[140px] truncate px-1 text-xs font-semibold text-[#27B1B8]">📎 {a.name}</a>}
                  <button type="button" className="px-1 text-[#DC2626]" onClick={() => setAttachments((arr) => arr.filter((_, j) => j !== i))}>×</button>
                </span>
              ))}
            </div>
          </div>

          {editing && (
            <div className="border-t border-[#E2E8F0] pt-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#64748B]"><MdChatBubbleOutline size={14} />Comentarios</p>
              <div className="mb-2 max-h-48 space-y-2 overflow-y-auto">
                {comments.length === 0 && <p className="text-xs text-[#94A3B8]">Sin comentarios.</p>}
                {comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2">
                    <Avatar user={c.author} size={24} />
                    <div className="rounded-xl bg-[#F8FAFC] px-3 py-1.5">
                      <p className="text-[11px] font-bold text-[#1A1A1A]">{c.author.fullName} <span className="font-normal text-[#94A3B8]">· {new Date(c.createdAt).toLocaleString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span></p>
                      <p className="text-sm text-[#1A1A1A]">{c.message}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void sendComment(); } }} placeholder="Escribe un comentario…" className={inputCls} />
                <button type="button" className={btnPrimary} onClick={sendComment} disabled={!comment.trim()}>Enviar</button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-[#E2E8F0] px-5 py-3.5">
          {editing && canMutate && <button onClick={remove} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#FEE2E2] bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FEE2E2]" aria-label="Eliminar"><MdDelete size={18} /></button>}
          <button onClick={onClose} className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">Cancelar</button>
          <button onClick={submit} disabled={!title.trim() || saving || uploading} className="flex-1 rounded-xl bg-[#27B1B8] py-2.5 text-sm font-bold text-white hover:opacity-80 disabled:opacity-50">{saving ? "Guardando…" : editing ? "Guardar" : "Crear tarea"}</button>
        </div>
      </div>
    </div>
  );
}

function dueDateInput(iso: string) {
  return new Date(new Date(iso).getTime() - 5 * 3600 * 1000).toISOString().slice(0, 10);
}

type Note = { id: string; title: string; content: string; color: string; updatedAt: string };
const NOTE_COLORS = ["#FEF3C7", "#DBEAFE", "#DCFCE7", "#FCE7F3", "#EDE9FE", "#F1F5F9"];

function NotesView() {
  const confirm = useConfirm();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [draft, setDraft] = useState({ title: "", content: "", color: NOTE_COLORS[0] });
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/panel/tareas/notas");
    if (r.ok) setNotes((await r.json()).notes);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function add() {
    const res = await post("/api/panel/tareas/notas", draft);
    if (!res.ok) return setError(res.error ?? "Error");
    setError("");
    setDraft({ title: "", content: "", color: draft.color });
    void load();
  }
  async function save(n: Note, patch: Partial<Note>) {
    setNotes((prev) => prev && prev.map((x) => (x.id === n.id ? { ...x, ...patch } : x)));
    await patchReq(`/api/panel/tareas/notas/${n.id}`, patch);
  }
  async function remove(n: Note) {
    if (!(await confirm({ title: "Eliminar nota", message: "Esta nota se eliminará para siempre.", confirmLabel: "Eliminar", danger: true }))) return;
    await fetch(`/api/panel/tareas/notas/${n.id}`, { method: "DELETE" });
    setNotes((prev) => prev && prev.filter((x) => x.id !== n.id));
  }

  return (
    <div>
      <p className="mb-3 text-xs font-semibold text-[#64748B]">Solo tú puedes ver estas notas.</p>
      <div className="mb-5 rounded-2xl border border-[#E2E8F0] p-3 shadow-sm" style={{ background: draft.color }}>
        <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Título (opcional)" maxLength={120} className="mb-1 w-full bg-transparent text-sm font-bold outline-none" />
        <textarea value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} placeholder="Escribe una nota…" rows={3} maxLength={5000} className="w-full resize-none bg-transparent text-sm outline-none" />
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex gap-1.5">
            {NOTE_COLORS.map((c) => (
              <button key={c} type="button" aria-label={`Color ${c}`} onClick={() => setDraft({ ...draft, color: c })} className={`h-6 w-6 rounded-full border-2 ${draft.color === c ? "border-[#0C535B]" : "border-white"}`} style={{ background: c }} />
            ))}
          </div>
          <button className={btnPrimary} onClick={add} disabled={!draft.title.trim() && !draft.content.trim()}><MdAdd size={16} />Agregar nota</button>
        </div>
        {error && <p className="mt-2 text-xs font-semibold text-[#DC2626]">{error}</p>}
      </div>

      {!notes ? <SkeletonTable /> : notes.length === 0 ? (
        <p className="py-10 text-center text-sm text-[#94A3B8]">Aún no tienes notas.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((n) => (
            <div key={n.id} className="min-w-0 rounded-2xl border border-[#E2E8F0] p-3 shadow-sm" style={{ background: n.color }}>
              <input defaultValue={n.title} maxLength={120} placeholder="Sin título" onBlur={(e) => e.target.value !== n.title && save(n, { title: e.target.value })} className="mb-1 w-full bg-transparent text-sm font-bold outline-none" />
              <textarea defaultValue={n.content} rows={5} maxLength={5000} onBlur={(e) => e.target.value !== n.content && save(n, { content: e.target.value })} className="w-full resize-none bg-transparent text-sm outline-none" />
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex gap-1">
                  {NOTE_COLORS.map((c) => (
                    <button key={c} type="button" aria-label={`Color ${c}`} onClick={() => save(n, { color: c })} className={`h-4 w-4 rounded-full border ${n.color === c ? "border-[#0C535B]" : "border-white"}`} style={{ background: c }} />
                  ))}
                </div>
                <span className="text-[10px] font-semibold text-[#64748B]">{fmtDay(n.updatedAt)}</span>
                <button aria-label="Eliminar nota" onClick={() => remove(n)} className="rounded-lg p-1 text-[#DC2626] hover:bg-white/60"><MdDelete size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
