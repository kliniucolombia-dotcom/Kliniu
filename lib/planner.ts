import { prisma } from "@/lib/prisma";
import type { PlannerPriority, PlannerStatus, Prisma, UserRole } from "@/generated/prisma/client";
import { normalizeAttachments, type MaintenanceAttachment } from "@/lib/maintenance-upload";
import { areaForRole, canSeeTask, hasGlobalTaskAccess } from "@/lib/areas";

export const PLANNER_STATUSES: PlannerStatus[] = ["PENDING", "IN_PROGRESS", "COMPLETED"];
export const PLANNER_PRIORITIES: PlannerPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export type PlannerChecklistItem = { id: string; text: string; done: boolean };
export type PlannerActor = { id: string; role: string };

function requirePrisma() {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  return prisma;
}

const include = {
  createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
  assignees: { select: { user: { select: { id: true, fullName: true, avatarUrl: true, role: true } } } },
  _count: { select: { comments: true } },
} satisfies Prisma.PlannerTaskInclude;

export type PlannerTaskRow = Prisma.PlannerTaskGetPayload<{ include: typeof include }>;

export function parseDueDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T12:00:00-05:00`);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function normalizeLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((raw) => (typeof raw === "string" && raw.trim() ? [raw.trim().slice(0, 30)] : []))
    .slice(0, 8);
}

export function normalizeChecklist(value: unknown): PlannerChecklistItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 50)
    .flatMap((raw) => {
      if (!raw || typeof raw !== "object") return [];
      const item = raw as { id?: unknown; text?: unknown; done?: unknown };
      const text = typeof item.text === "string" ? item.text.trim().slice(0, 200) : "";
      if (!text) return [];
      return [{ id: typeof item.id === "string" && item.id ? item.id : crypto.randomUUID(), text, done: item.done === true }];
    });
}

export function normalizeAssigneeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((v): v is string => typeof v === "string" && v.length > 0))).slice(0, 20);
}

// Solo el creador, un asignado o un superadmin pueden editar/mover/borrar.
export function canMutateTask(
  task: { createdById: string; assignees: { user: { id: string } }[] },
  actor: PlannerActor,
): boolean {
  if (actor.role === "SUPERADMIN") return true;
  if (task.createdById === actor.id) return true;
  return task.assignees.some((a) => a.user.id === actor.id);
}

export async function listPlannerTasks() {
  return requirePrisma().plannerTask.findMany({
    orderBy: [{ status: "asc" }, { position: "asc" }, { createdAt: "desc" }],
    include,
  });
}

// Tareas visibles según el área del usuario: por rol, solo ve las de su área
// (o donde participa); superadmin/admin ven todo.
export async function listVisiblePlannerTasks(viewer: { id: string; role: UserRole }) {
  const tasks = await listPlannerTasks();
  return tasks.filter((t) =>
    canSeeTask(viewer, {
      createdById: t.createdById,
      assigneeIds: t.assignees.map((a) => a.user.id),
      assigneeRoles: t.assignees.map((a) => a.user.role),
    }),
  );
}

// Personas a las que el usuario puede asignar: superadmin/admin a cualquiera;
// el resto solo a su misma área (o a sí mismo).
export async function listAssignableUsers(viewer: { id: string; role: UserRole }) {
  const all = await requirePrisma().user.findMany({
    where: { status: "ACTIVE", role: { not: "CUSTOMER" } },
    select: { id: true, fullName: true, avatarUrl: true, role: true },
    orderBy: { fullName: "asc" },
    take: 500,
  });
  if (hasGlobalTaskAccess(viewer.role)) return all;
  const area = areaForRole(viewer.role);
  return all.filter((u) => u.id === viewer.id || (area !== null && areaForRole(u.role) === area));
}

// Valida que los asignados estén permitidos para este usuario (regla de área).
export async function assertAssigneesAllowed(viewer: { id: string; role: UserRole }, ids: string[]) {
  if (ids.length === 0) return;
  const allowed = new Set((await listAssignableUsers(viewer)).map((u) => u.id));
  if (ids.some((id) => !allowed.has(id))) throw new Error("FORBIDDEN_ASSIGNEE");
}

export async function getPlannerTask(id: string) {
  return requirePrisma().plannerTask.findUnique({ where: { id }, include });
}

async function assigneesConnect(ids: string[]) {
  return ids.map((id) => ({ userId: id }));
}

export async function createPlannerTask(input: {
  title: string;
  description?: string;
  priority: PlannerPriority;
  dueDate?: unknown;
  labels?: unknown;
  checklist?: unknown;
  attachments?: unknown;
  assigneeIds?: unknown;
  createdById: string;
}) {
  const db = requirePrisma();
  const last = await db.plannerTask.findFirst({ where: { status: "PENDING" }, orderBy: { position: "desc" }, select: { position: true } });
  return db.plannerTask.create({
    data: {
      title: input.title.trim(),
      description: input.description?.trim() || null,
      priority: input.priority,
      dueDate: parseDueDate(input.dueDate),
      labels: normalizeLabels(input.labels),
      checklist: normalizeChecklist(input.checklist) as unknown as Prisma.InputJsonValue,
      attachments: normalizeAttachments(input.attachments) as unknown as Prisma.InputJsonValue,
      createdById: input.createdById,
      position: (last?.position ?? -1) + 1,
      assignees: { create: await assigneesConnect(normalizeAssigneeIds(input.assigneeIds)) },
    },
    include,
  });
}

export async function updatePlannerTask(
  id: string,
  data: {
    title?: string;
    description?: string | null;
    priority?: PlannerPriority;
    status?: PlannerStatus;
    dueDate?: unknown;
    position?: number;
    labels?: unknown;
    checklist?: unknown;
    attachments?: unknown;
    assigneeIds?: unknown;
  },
) {
  const db = requirePrisma();
  const current = await db.plannerTask.findUnique({ where: { id }, select: { status: true, completedAt: true } });
  if (!current) throw new Error("NOT_FOUND");

  const status = data.status && PLANNER_STATUSES.includes(data.status) ? data.status : undefined;
  const completedAt =
    status === "COMPLETED" ? current.completedAt ?? new Date() : status ? null : undefined;

  const update: Prisma.PlannerTaskUpdateInput = {
    title: data.title?.trim() || undefined,
    description: data.description === undefined ? undefined : (data.description?.trim() || null),
    priority: data.priority && PLANNER_PRIORITIES.includes(data.priority) ? data.priority : undefined,
    status,
    completedAt,
    dueDate: data.dueDate === undefined ? undefined : parseDueDate(data.dueDate),
    position: typeof data.position === "number" && Number.isFinite(data.position) ? Math.max(0, Math.round(data.position)) : undefined,
    labels: data.labels === undefined ? undefined : (normalizeLabels(data.labels) as unknown as Prisma.InputJsonValue),
    checklist: data.checklist === undefined ? undefined : (normalizeChecklist(data.checklist) as unknown as Prisma.InputJsonValue),
    attachments: data.attachments === undefined ? undefined : (normalizeAttachments(data.attachments) as unknown as Prisma.InputJsonValue),
  };

  if (data.assigneeIds !== undefined) {
    const ids = normalizeAssigneeIds(data.assigneeIds);
    update.assignees = { deleteMany: {}, create: await assigneesConnect(ids) };
  }

  return db.plannerTask.update({ where: { id }, data: update, include });
}

export async function deletePlannerTask(id: string) {
  return requirePrisma().plannerTask.delete({ where: { id } });
}

export async function addPlannerComment(taskId: string, authorId: string, message: string) {
  return requirePrisma().plannerComment.create({
    data: { taskId, authorId, message: message.trim() },
    include: { author: { select: { id: true, fullName: true, avatarUrl: true } } },
  });
}

export async function listPlannerComments(taskId: string) {
  return requirePrisma().plannerComment.findMany({
    where: { taskId },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, fullName: true, avatarUrl: true } } },
  });
}

// Tareas no completadas con vencimiento próximo o vencido, para el recordatorio.
export async function tasksDueForReminder(until: Date) {
  return requirePrisma().plannerTask.findMany({
    where: { status: { not: "COMPLETED" }, dueDate: { not: null, lte: until } },
    include,
  });
}

export type { MaintenanceAttachment };
