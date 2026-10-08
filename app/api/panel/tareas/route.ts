import { requirePermission } from "@/lib/permissions";
import {
  assertAssigneesAllowed,
  createPlannerTask,
  listAssignableUsers,
  listVisiblePlannerTasks,
  normalizeAssigneeIds,
  PLANNER_PRIORITIES,
} from "@/lib/planner";
import { AREAS, areaForRole } from "@/lib/areas";
import { createNotification } from "@/lib/notifications";
import { broadcastPanelUpdate } from "@/lib/realtime";
import type { PlannerPriority } from "@/generated/prisma/client";

export async function GET() {
  const access = await requirePermission("MODULE_TAREAS", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const [tasks, users] = await Promise.all([
    listVisiblePlannerTasks(access.user),
    listAssignableUsers(access.user),
  ]);

  return Response.json({
    tasks,
    users,
    currentUserId: access.user.id,
    areas: AREAS,
    myArea: areaForRole(access.user.role),
  });
}

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_TAREAS", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const body = (await request.json()) as {
    title?: string;
    description?: string;
    priority?: PlannerPriority;
    dueDate?: string;
    labels?: unknown;
    checklist?: unknown;
    attachments?: unknown;
    assigneeIds?: unknown;
  };
  if (!body.title?.trim()) return Response.json({ error: "El título es obligatorio" }, { status: 400 });
  const priority = body.priority && PLANNER_PRIORITIES.includes(body.priority) ? body.priority : "MEDIUM";

  try {
    const assigneeIds = normalizeAssigneeIds(body.assigneeIds);
    await assertAssigneesAllowed(access.user, assigneeIds);

    const task = await createPlannerTask({
      title: body.title,
      description: body.description,
      priority,
      dueDate: body.dueDate,
      labels: body.labels,
      checklist: body.checklist,
      attachments: body.attachments,
      assigneeIds,
      createdById: access.user.id,
    });

    // Avisa a los asignados que no sean el creador.
    for (const uid of assigneeIds.filter((id) => id !== access.user.id)) {
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

    broadcastPanelUpdate("planner").catch(() => {});
    return Response.json({ task });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN_ASSIGNEE") {
      return Response.json({ error: "Solo puedes asignar personas de tu área" }, { status: 403 });
    }
    return Response.json({ error: "No fue posible crear la tarea" }, { status: 400 });
  }
}
