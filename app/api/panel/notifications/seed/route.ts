import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { isSuperAdmin } from "@/lib/roles";
import { broadcastPanelUpdate } from "@/lib/realtime";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "No disponible en producción" }, { status: 403 });
  }

  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!isSuperAdmin(access.user)) return Response.json({ error: "No autorizado" }, { status: 403 });
  if (!prisma) return Response.json({ error: "DB no disponible" }, { status: 500 });

  const userId = access.user.id;

  const samples = [
    {
      type: "quotation",
      category: "quotation_approved",
      title: "Cotización aprobada",
      detail: "La cotización #Q-2024-001 de Juan Pérez fue aprobada. Total: $2,500,000",
      href: "/panel/cotizaciones",
      severity: "info",
      targetRoles: JSON.stringify(["SELLER", "ADMIN"]),
      targetUserId: null,
    },
    {
      type: "quotation",
      category: "quotation_rejected",
      title: "Cotización rechazada",
      detail: "La cotización #Q-2024-002 de María García fue rechazada por el cliente.",
      href: "/panel/cotizaciones",
      severity: "warning",
      targetRoles: JSON.stringify(["SELLER"]),
      targetUserId: null,
    },
    {
      type: "ticket",
      category: "ticket_new",
      title: "Nuevo ticket de soporte",
      detail: "Carlos López abrió un ticket: 'Problema con el pedido #1234'",
      href: "/panel/tickets",
      severity: "info",
      targetRoles: JSON.stringify(["ADMIN", "SELLER"]),
      targetUserId: null,
    },
    {
      type: "ticket",
      category: "ticket_assigned",
      title: "Ticket asignado",
      detail: "Te asignaron el ticket #T-001: 'Consulta sobre entrega'",
      href: "/panel/tickets/T-001",
      severity: "info",
      targetRoles: JSON.stringify(["SELLER"]),
      targetUserId: userId,
    },
    {
      type: "hr",
      category: "request_approved",
      title: "Solicitud de vacaciones aprobada",
      detail: "Tu solicitud de vacaciones del 15 al 20 de marzo fue aprobada.",
      href: "/panel/rrhh",
      severity: "info",
      targetRoles: JSON.stringify(["RRHH"]),
      targetUserId: userId,
    },
    {
      type: "hr",
      category: "request_rejected",
      title: "Solicitud de permiso rechazada",
      detail: "La solicitud de permiso del 5 de febrero fue rechazada. Motivo: conflicto de horario.",
      href: "/panel/rrhh",
      severity: "warning",
      targetRoles: JSON.stringify(["RRHH"]),
      targetUserId: null,
    },
    {
      type: "inventory",
      category: "stock_low",
      title: "Stock bajo",
      detail: "El producto 'Pintura Blanca 1L' tiene solo 5 unidades en bodega principal.",
      href: "/panel/bodegas",
      severity: "urgent",
      targetRoles: JSON.stringify(["BODEGA", "ADMIN"]),
      targetUserId: null,
    },
    {
      type: "maintenance",
      category: "urgent",
      title: "Mantenimiento urgente",
      detail: "La máquina Inyectora #3 requiere mantenimiento urgente. Parada programada.",
      href: "/panel/mantenimiento",
      severity: "urgent",
      targetRoles: JSON.stringify(["ADMIN"]),
      targetUserId: null,
    },
    {
      type: "production",
      category: "run_completed",
      title: "Orden de producción completada",
      detail: "La orden de producción #PO-456 fue completada exitosamente. 500 unidades.",
      href: "/panel/produccion",
      severity: "info",
      targetRoles: JSON.stringify(["BODEGA", "ADMIN"]),
      targetUserId: null,
    },
    {
      type: "campaign",
      category: "campaign_active",
      title: "Campaña activada",
      detail: "La campaña 'Black Friday 2024' fue activada. Presupuesto: $500,000",
      href: "/panel/campanas",
      severity: "info",
      targetRoles: JSON.stringify(["ADMIN"]),
      targetUserId: null,
    },
  ];

  const created = await prisma.notification.createMany({
    data: samples.map((s) => ({
      ...s,
      metadata: Prisma.JsonNull,
      emailSent: false,
      createdById: userId,
    })),
  });

  await broadcastPanelUpdate("notifications").catch(() => {});

  return Response.json({ created: created.count });
}
