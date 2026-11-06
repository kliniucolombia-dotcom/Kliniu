import { logAudit } from "@/lib/audit";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// Historial de la guía de Coordinadora de un pedido: cada aviso del webhook, más cuándo se generó o anuló.
// Se guarda en AuditLog (sin tabla nueva) con esta acción.
const ACTION = "order.carrier_event";

export type CarrierEvent = {
  tipo: "generada" | "anulada" | "estado" | "novedad";
  guia: string;
  codigo?: string;
  descripcion: string;
  fechaCoordinadora?: string; // fecha/hora que reporta Coordinadora, si viene
};

// Códigos de estado del push Tracking v3.
const ESTADOS: Record<string, string> = {
  "1": "Guía recibida",
  "2": "En terminal de origen",
  "3": "En transporte",
  "4": "En terminal de destino",
  "5": "En reparto",
  "6": "Entregada",
  "8": "Cerrada por incidencia",
  "9": "En punto Droop",
};

export function estadoLabel(codigo: string, desc?: string) {
  return ESTADOS[codigo] ?? desc ?? `Estado ${codigo}`;
}

export function trackingUrl(guia: string) {
  return `https://coordinadora.com/rastreo/rastreo-de-guia/detalle-de-rastreo-de-guia/?guia=${encodeURIComponent(guia)}`;
}

export async function logCarrierEvent(orderId: string, event: CarrierEvent, actorEmail = "webhook:coordinadora", actorId: string | null = null) {
  if (!prisma) return;
  const meta = JSON.parse(JSON.stringify(event)) as Prisma.InputJsonObject; // sin claves undefined, igual a como queda guardado
  // Pub/Sub puede reenviar el mismo aviso: no duplicar.
  const repetido = await prisma.auditLog.findFirst({
    where: { action: ACTION, entityId: orderId, meta: { equals: meta } },
    select: { id: true },
  });
  if (repetido) return;
  await logAudit({ actorId, actorEmail, action: ACTION, entity: "order", entityId: orderId, meta });
}

export async function listCarrierEvents(orderId: string) {
  if (!prisma) return [];
  const rows = await prisma.auditLog.findMany({
    where: { action: ACTION, entityId: orderId },
    orderBy: { createdAt: "asc" },
    select: { id: true, createdAt: true, actorEmail: true, meta: true },
  });
  return rows.map((r) => ({ id: r.id, createdAt: r.createdAt, actorEmail: r.actorEmail, ...(r.meta as CarrierEvent) }));
}
