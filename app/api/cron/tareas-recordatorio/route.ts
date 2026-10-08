import { hasValidCronSecret } from "@/lib/cron-auth";
import { prisma } from "@/lib/prisma";
import { tasksDueForReminder } from "@/lib/planner";
import { createNotification } from "@/lib/notifications";
import { broadcastPanelUpdate } from "@/lib/realtime";

export const maxDuration = 60;

// Recordatorio de tareas próximas a vencer (<=24 h) o vencidas, sin completar.
export async function GET(request: Request) {
  if (!hasValidCronSecret(request)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const until = new Date(Date.now() + 24 * 3600 * 1000);
  const tasks = await tasksDueForReminder(until);

  // Dedup por día: no repetir el recordatorio de la misma tarea.
  const startOfDay = new Date(Date.now() - 5 * 3600 * 1000);
  startOfDay.setUTCHours(5, 0, 0, 0); // 00:00 de Bogotá (UTC-5) expresado en UTC
  const recent = await prisma.notification.findMany({
    where: { category: "task_due_soon", createdAt: { gte: startOfDay } },
    select: { metadata: true },
  });
  const alreadyNotified = new Set(
    recent.flatMap((n) => {
      const taskId = (n.metadata as { taskId?: string } | null)?.taskId;
      return taskId ? [taskId] : [];
    }),
  );

  let sent = 0;
  for (const task of tasks) {
    if (alreadyNotified.has(task.id)) continue;
    const targets = task.assignees.length > 0 ? task.assignees.map((a) => a.user.id) : [task.createdById];
    const overdue = task.dueDate ? task.dueDate.getTime() < Date.now() : false;
    for (const uid of targets) {
      await createNotification({
        eventKey: "task.due_soon",
        title: `${overdue ? "Tarea vencida" : "Tarea por vencer"}: ${task.title}`,
        detail: overdue ? "La fecha límite ya pasó." : "La fecha límite vence en menos de 24 horas.",
        href: "/panel/tareas",
        targetUserId: uid,
        metadata: { taskId: task.id },
      }).catch(() => {});
      sent++;
    }
  }

  if (sent > 0) broadcastPanelUpdate("notifications").catch(() => {});
  return Response.json({ tasks: tasks.length, sent });
}
