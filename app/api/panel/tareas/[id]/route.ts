import { requirePermission } from "@/lib/permissions";
import {
  addPlannerComment,
  assertAssigneesAllowed,
  canMutateTask,
  deletePlannerTask,
  getPlannerTask,
  listPlannerComments,
  normalizeAssigneeIds,
  updatePlannerTask,
} from "@/lib/planner";
import { canSeeTask } from "@/lib/areas";
import { createNotification } from "@/lib/notifications";
import { broadcastPanelUpdate } from "@/lib/realtime";
import type { PlannerPriority, PlannerStatus } from "@/generated/prisma/client";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_TAREAS", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  const task = await getPlannerTask(id);
  if (!task || !canSeeTask(access.user, { createdById: task.createdById, assigneeIds: task.assignees.map((a) => a.user.id), assigneeRoles: task.assignees.map((a) => a.user.role) })) {
    return Response.json({ error: "Tarea no encontrada" }, { status: 404 });
  }
  return Response.json({ task, comments: await listPlannerComments(id) });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_TAREAS", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  const current = await getPlannerTask(id);
  if (!current) return Response.json({ error: "Tarea no encontrada" }, { status: 404 });
  if (!canMutateTask(current, { id: access.user.id, role: access.user.role })) {
    return Response.json({ error: "Solo el creador o un responsable puede editar esta tarea" }, { status: 403 });
  }

  const body = (await request.json()) as {
    title?: string;
    description?: string | null;
    priority?: PlannerPriority;
    status?: PlannerStatus;
    dueDate?: string | null;
    position?: number;
    labels?: unknown;
    checklist?: unknown;
    attachments?: unknown;
    assigneeIds?: unknown;
    comment?: string;
  };

  try {
    if (body.assigneeIds !== undefined) await assertAssigneesAllowed(access.user, normalizeAssigneeIds(body.assigneeIds));
    if (body.comment?.trim()) await addPlannerComment(id, access.user.id, body.comment);

    const task = await updatePlannerTask(id, {
      title: body.title,
      description: body.description,
      priority: body.priority,
      status: body.status,
      dueDate: body.dueDate,
      position: body.position,
      labels: body.labels,
      checklist: body.checklist,
      attachments: body.attachments,
      assigneeIds: body.assigneeIds,
    });

    // Avisa a los asignados nuevos (no re-notifica a quien ya estaba ni al actor).
    if (body.assigneeIds !== undefined) {
      const before = new Set(current.assignees.map((a) => a.user.id));
      const added = normalizeAssigneeIds(body.assigneeIds).filter((uid) => uid !== access.user.id && !before.has(uid));
      for (const uid of added) {
        createNotification({
          eventKey: "task.assigned",
          title: `Te asignaron una tarea: ${task.title}`,
          detail: `${access.user.fullName} te asignó un pendiente`,
          href: "/panel/tareas",
          targetUserId: uid,
          createdById: access.user.id,
          metadata: { taskId: task.id },
        }).catch(() => {});
      }
    }

    broadcastPanelUpdate("planner").catch(() => {});
    return Response.json({ task, comments: await listPlannerComments(id) });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN_ASSIGNEE") return Response.json({ error: "Solo puedes asignar personas de tu área" }, { status: 403 });
    if (error instanceof Error && error.message === "NOT_FOUND") return Response.json({ error: "Tarea no encontrada" }, { status: 404 });
    return Response.json({ error: "No fue posible actualizar la tarea" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_TAREAS", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  const current = await getPlannerTask(id);
  if (!current) return Response.json({ error: "Tarea no encontrada" }, { status: 404 });
  if (!canMutateTask(current, { id: access.user.id, role: access.user.role })) {
    return Response.json({ error: "Solo el creador o un responsable puede eliminar esta tarea" }, { status: 403 });
  }

  await deletePlannerTask(id);
  broadcastPanelUpdate("planner").catch(() => {});
  return Response.json({ ok: true });
}
