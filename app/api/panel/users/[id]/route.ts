import { requireSuperAdmin } from "@/lib/permissions";
import { deleteUserByAdmin, getUserDeletionImpact, hasDeletionImpact, updateUserByAdmin } from "@/lib/users";
import { broadcastPanelUpdate } from "@/lib/realtime";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { notifyPasswordChangedByAdmin } from "@/lib/security-alert";
import { compare } from "bcryptjs";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireSuperAdmin();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  const body = await request.json().catch(() => ({})) as {
    fullName?: string; email?: string; whatsappPhone?: string | null;
    role?: "CUSTOMER" | "ADMIN" | "SELLER" | "PACKING" | "SUPERADMIN" | "RRHH" | "BODEGA" | "DISENO" | "MARKETING" | "JEFE_VENTAS" | "TESORERIA" | "INGENIERIA" | "LOGISTICA" | "LIDER_ENSAMBLE" | "LIDER_INYECCION" | "MANTENIMIENTO" | "JEFE_OPERACIONES" | "DIRECTOR_OPERACIONES" | "OPERARIO";
    status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    newPassword?: string;
    confirmPassword?: string;
    backupUserId?: string | null;
    avatarUrl?: string | null;
  };

  const changingPassword = Boolean(body.newPassword?.trim());
  if (changingPassword) {
    // La propia clave se cambia desde Mi cuenta, que pide la clave actual.
    if (id === access.user.id) {
      return Response.json({ error: "Tu propia contraseña se cambia desde Mi cuenta." }, { status: 400 });
    }
    // Una sesión abierta o robada no basta: hay que volver a escribir la clave de quien actúa.
    if (!(await checkRateLimit(`confirm-password:${access.user.id}`, 8, 10 * 60 * 1000))) {
      return Response.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429, headers: { "Retry-After": "600" } });
    }
    const actor = await prisma!.user.findUnique({ where: { id: access.user.id }, select: { passwordHash: true } });
    if (!body.confirmPassword || !actor || !(await compare(body.confirmPassword, actor.passwordHash))) {
      await logAudit({
        actorId: access.user.id,
        actorEmail: access.user.email,
        action: "user.password_confirm_failed",
        entity: "user",
        entityId: id,
        ip: getClientIp(request),
      });
      return Response.json({ error: "Tu contraseña de confirmación es incorrecta." }, { status: 403 });
    }
  }

  try {
    // Estado anterior, para que la bitácora diga de qué rol/estado se pasó a cuál.
    const before = await prisma!.user.findUnique({ where: { id }, select: { role: true, status: true, email: true } });
    const user = await updateUserByAdmin(id, body);
    await broadcastPanelUpdate("users");
    await logAudit({
      actorId: access.user.id,
      actorEmail: access.user.email,
      action: body.newPassword?.trim() ? "user.password_reset" : "user.update",
      entity: "user",
      entityId: id,
      meta: {
        target: before?.email,
        role: body.role,
        status: body.status,
        roleFrom: before && body.role && body.role !== before.role ? before.role : undefined,
        statusFrom: before && body.status && body.status !== before.status ? before.status : undefined,
        emailChanged: Boolean(body.email?.trim()),
      },
      ip: getClientIp(request),
    });
    if (changingPassword) await notifyPasswordChangedByAdmin(user.email);
    return Response.json(user);
  } catch (e) {
    if (e instanceof Error && e.message === "EMAIL_ALREADY_EXISTS") {
      return Response.json({ error: "Ese correo ya está registrado" }, { status: 409 });
    }
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireSuperAdmin();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  if (id === access.user.id) {
    return Response.json({ error: "No puedes eliminar tu propio usuario" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";

  // El historial de Control de Producción no se borra ni con force: se desactiva al usuario.
  const timeEntries = await prisma!.productionTimeEntry.count({ where: { operatorId: id } });
  if (timeEntries > 0) {
    return Response.json(
      { error: `Tiene ${timeEntries} registros de producción: desactívalo en vez de eliminarlo` },
      { status: 409 },
    );
  }

  if (!force) {
    const impact = await getUserDeletionImpact(id);
    if (hasDeletionImpact(impact)) {
      return Response.json({ requiresConfirmation: true, impact }, { status: 409 });
    }
  }

  try {
    await deleteUserByAdmin(id, { force });
    await broadcastPanelUpdate("users");
    await logAudit({
      actorId: access.user.id,
      actorEmail: access.user.email,
      action: "user.delete",
      entity: "user",
      entityId: id,
      meta: { force },
      ip: getClientIp(request),
    });
    return Response.json({ ok: true });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2003") {
      return Response.json(
        { error: "No se puede eliminar: el usuario tiene registros asociados que no se pudieron desvincular" },
        { status: 409 },
      );
    }
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
