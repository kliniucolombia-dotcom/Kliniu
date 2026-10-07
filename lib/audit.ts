import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

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
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        meta: (input.meta as Prisma.InputJsonValue) ?? undefined,
        ip: input.ip ?? null,
      },
    });
  } catch (error) {
    console.error("AUDIT_LOG_FAILED", error);
  }
}
