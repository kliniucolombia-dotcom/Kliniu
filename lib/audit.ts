import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { bogotaTime, sendSecurityAlert } from "@/lib/security-alert";

export type AuditInput = {
  actorId?: string | null;
  actorEmail: string;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
  ip?: string | null;
};

// Registra una acción sensible. Nunca lanza: un fallo de bitácora no puede
// tumbar la acción que se está auditando.
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    if (!prisma) return;
    // El rol se guarda tal como era al actuar: si después cambia, el registro no miente.
    const actor = input.actorId
      ? await prisma.user.findUnique({ where: { id: input.actorId }, select: { role: true } })
      : null;
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        meta: (actor ? { ...input.meta, actorRole: actor.role } : input.meta) as Prisma.InputJsonValue ?? undefined,
        ip: input.ip ?? null,
      },
    });
    await alertIfSensitive(input, actor?.role);
  } catch (error) {
    console.error("AUDIT_LOG_FAILED", error);
  }
}

const PRIVILEGED_ROLES = ["SUPERADMIN", "ADMIN"];

// Avisa por correo de lo que, si no fuera tuyo, querrías saber ya: clave de otra
// persona cambiada desde el panel, o una cuenta con privilegios que entra desde una
// IP nueva, cambia su clave o su correo, o recibe varios intentos fallidos seguidos.
async function alertIfSensitive(input: AuditInput, actorRole?: string) {
  const privileged = actorRole ? PRIVILEGED_ROLES.includes(actorRole) : false;
  const who = `${input.actorEmail} (${actorRole ?? "sin rol"})`;
  const base = [`Cuenta: ${who}`, `IP: ${input.ip ?? "desconocida"}`, `Hora (Bogotá): ${bogotaTime()}`];

  if (input.action === "user.password_reset") {
    await sendSecurityAlert("clave cambiada desde el panel", ["Se cambió la clave de una cuenta desde el panel de usuarios.", ...base]);
  } else if (privileged && input.action === "auth.login_new_ip") {
    await sendSecurityAlert("inicio de sesión desde una IP nueva", ["Una cuenta con privilegios entró desde una IP que no había usado.", ...base]);
  } else if (privileged && ["auth.password_reset_email", "auth.password_changed", "auth.email_changed"].includes(input.action)) {
    await sendSecurityAlert("cuenta con privilegios modificada", [`Acción: ${input.action}`, ...base]);
  } else if (input.action === "auth.login_failed_burst") {
    await sendSecurityAlert("varios intentos fallidos seguidos", ["Hay varios intentos fallidos contra una cuenta del personal.", ...base]);
  }
}

// Intento fallido contra una cuenta de personal. Los correos que no existen o son
// de clientes no se anotan: solo llenarían la bitácora de ruido.
export async function auditLoginFailure(email: string, ip: string, reason: string): Promise<void> {
  try {
    if (!prisma) return;
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, email: true, role: true },
    });
    if (!user || user.role === "CUSTOMER") return;
    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "auth.login_failed",
      entity: "user",
      entityId: user.id,
      meta: { reason },
      ip,
    });

    // Cinco fallos en diez minutos: se anota una sola vez (al llegar justo a 5).
    const recent = await prisma.auditLog.count({
      where: {
        actorId: user.id,
        action: "auth.login_failed",
        createdAt: { gt: new Date(Date.now() - 10 * 60 * 1000) },
      },
    });
    if (recent === 5) {
      await logAudit({
        actorId: user.id,
        actorEmail: user.email,
        action: "auth.login_failed_burst",
        entity: "user",
        entityId: user.id,
        meta: { attempts: recent, windowMinutes: 10 },
        ip,
      });
    }
  } catch (error) {
    console.error("AUDIT_LOG_FAILED", error);
  }
}

// Anota la primera vez que una cuenta de personal entra desde una IP. Se llama
// antes de registrar el login: así "visto antes" solo mira historial anterior.
export async function auditNewLoginIp(
  user: { id: string; email: string; role: string },
  ip: string,
): Promise<void> {
  try {
    if (!prisma || user.role === "CUSTOMER") return;
    const seen = await prisma.auditLog.findFirst({
      where: {
        actorId: user.id,
        ip,
        action: { in: ["admin.login", "auth.login_new_ip"] },
      },
      select: { id: true },
    });
    if (seen) return;
    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "auth.login_new_ip",
      entity: "user",
      entityId: user.id,
      ip,
    });
  } catch (error) {
    console.error("AUDIT_LOG_FAILED", error);
  }
}
