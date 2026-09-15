import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { broadcastPanelUpdate } from "@/lib/realtime";
import { createSupabaseStorageClient } from "@/lib/supabase-storage";
import { recordTicketEvents } from "@/lib/ticket-events";
import { computeTicketDueDate, groupResponsiblesByDepartment, isAssigneeAllowed } from "@/lib/tickets";
import { canManageTicketAssignment } from "@/lib/ticket-access";

const BUCKET = "rrhh-soportes";
const MAX_IDS = 100;
const VALID_STATUS = ["PENDIENTE", "EN_PROCESO", "ESPERANDO_RESPUESTA", "FINALIZADO", "CANCELADO"];
const VALID_PRIORITY = ["BAJA", "MEDIA", "ALTA", "URGENTE"];

/** Acciones masivas sobre solicitudes. Solo RRHH/Admin/SuperAdmin. */
export async function POST(request: Request) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });
  const db = prisma;

  if (!canManageTicketAssignment(access.user)) {
    return Response.json({ error: "Solo RRHH o Admin pueden editar solicitudes" }, { status: 403 });
  }

  const body = (await request.json()) as { ids?: unknown; op?: string; value?: string | null };
  const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === "string") : [];
  const unique = [...new Set(ids)];
  if (unique.length === 0) return Response.json({ error: "Debes seleccionar al menos una solicitud" }, { status: 400 });
  if (unique.length > MAX_IDS) {
    return Response.json({ error: `Máximo ${MAX_IDS} solicitudes por acción` }, { status: 400 });
  }

  const op = body.op;
  const value = body.value ?? null;

  if (op === "delete") {
    const tickets = await db.ticket.findMany({
      where: { id: { in: unique } },
      select: { id: true, attachments: { select: { url: true } } },
    });
    if (tickets.length === 0) return Response.json({ ok: true, affected: 0 });

    await db.ticket.deleteMany({ where: { id: { in: unique } } });

    const paths = tickets
      .flatMap((t) => t.attachments.map((a) => a.url))
      .filter((u) => u.startsWith("tickets/"));
    if (paths.length) {
      const supabase = createSupabaseStorageClient();
      if (supabase) {
        try {
          await supabase.storage.from(BUCKET).remove(paths);
        } catch {
          // Ignorar: los registros ya fueron eliminados.
        }
      }
    }

    await broadcastPanelUpdate("tickets");
    return Response.json({ ok: true, affected: tickets.length });
  }

  if (op === "status") {
    if (!value || !VALID_STATUS.includes(value)) {
      return Response.json({ error: "Estado inválido" }, { status: 400 });
    }
    const tickets = await db.ticket.findMany({ where: { id: { in: unique } }, select: { id: true, status: true } });
    const res = await db.ticket.updateMany({
      where: { id: { in: unique } },
      data: {
        status: value as never,
        resolvedAt: value === "FINALIZADO" ? new Date() : null,
      },
    });
    await recordTicketEvents(
      tickets
        .filter((t) => t.status !== value)
        .map((t) => ({ ticketId: t.id, actorId: access.user.id, type: "STATUS" as const, field: "status", fromValue: t.status, toValue: value })),
    );
    await broadcastPanelUpdate("tickets");
    return Response.json({ ok: true, affected: res.count });
  }

  if (op === "priority") {
    if (!value || !VALID_PRIORITY.includes(value)) {
      return Response.json({ error: "Prioridad inválida" }, { status: 400 });
    }
    const tickets = await db.ticket.findMany({
      where: { id: { in: unique } },
      select: { id: true, createdAt: true, priority: true },
    });
    await db.$transaction(
      tickets.map((t) =>
        db.ticket.update({
          where: { id: t.id },
          data: {
            priority: value as never,
            dueDate: value !== t.priority ? computeTicketDueDate(value, t.createdAt) : undefined,
          },
        }),
      ),
    );
    await recordTicketEvents(
      tickets
        .filter((t) => t.priority !== value)
        .map((t) => ({ ticketId: t.id, actorId: access.user.id, type: "PRIORITY" as const, field: "priority", fromValue: t.priority, toValue: value })),
    );
    await broadcastPanelUpdate("tickets");
    return Response.json({ ok: true, affected: tickets.length });
  }

  if (op === "responsible") {
    const responsibleId = value || null;
    const tickets = await db.ticket.findMany({
      where: { id: { in: unique } },
      select: { id: true, responsibleId: true, responsible: { select: { fullName: true } }, category: { select: { allowedDepartmentIds: true } } },
    });

    let assigneeName = "Sin asignar";
    if (responsibleId) {
      const user = await db.user.findUnique({ where: { id: responsibleId }, select: { id: true, fullName: true } });
      if (!user) return Response.json({ error: "Responsable inválido" }, { status: 400 });
      assigneeName = user.fullName;

      // El responsable debe pertenecer a los departamentos permitidos de cada categoría.
      const employees = await db.employee.findMany({
        where: { status: "ACTIVE", departmentId: { not: null } },
        select: { userId: true, departmentId: true, user: { select: { fullName: true } } },
      });
      const byDepartment = groupResponsiblesByDepartment(employees);
      const invalid = tickets.some(
        (t) => t.category.allowedDepartmentIds.length > 0 && !isAssigneeAllowed(byDepartment, t.category.allowedDepartmentIds, responsibleId),
      );
      if (invalid) {
        return Response.json({ error: "El responsable no pertenece a los departamentos de una o más categorías seleccionadas" }, { status: 400 });
      }
    }

    const res = await db.ticket.updateMany({
      where: { id: { in: unique } },
      data: { responsibleId },
    });
    await recordTicketEvents(
      tickets
        .filter((t) => t.responsibleId !== responsibleId)
        .map((t) => ({
          ticketId: t.id,
          actorId: access.user.id,
          type: "RESPONSIBLE" as const,
          field: "responsible",
          fromValue: t.responsible?.fullName ?? "Sin asignar",
          toValue: assigneeName,
        })),
    );
    await broadcastPanelUpdate("tickets");
    return Response.json({ ok: true, affected: res.count });
  }

  return Response.json({ error: "Acción no válida" }, { status: 400 });
}
