import type { UserRole } from "@/generated/prisma/client";

export type NotificationSeverity = "info" | "warning" | "urgent";

export type NotificationEvent = {
  type: string;
  category: string;
  title: string;
  detail: string;
  href?: string;
  severity?: NotificationSeverity;
  targetRoles: UserRole[];
  targetUserId?: string;
  sendEmail?: boolean;
  metadata?: Record<string, unknown>;
};

/** Roles que aterrizan en /panel y pueden recibir notificaciones in-app. */
const PANEL_ROLES: UserRole[] = [
  "SELLER", "RRHH", "BODEGA", "DISENO", "MARKETING", "JEFE_VENTAS",
  "TESORERIA", "INGENIERIA", "LOGISTICA", "LIDER_ENSAMBLE", "LIDER_INYECCION",
  "MANTENIMIENTO", "JEFE_OPERACIONES", "DIRECTOR_OPERACIONES",
];

const SALES: UserRole[] = ["SELLER", "JEFE_VENTAS", "ADMIN", "SUPERADMIN"];
const OPS: UserRole[] = ["JEFE_OPERACIONES", "DIRECTOR_OPERACIONES", "INGENIERIA"];
const ALL_PANEL: UserRole[] = [...PANEL_ROLES, "SUPERADMIN"];

export const NOTIFICATION_EVENTS: Record<string, Omit<NotificationEvent, "title" | "detail" | "metadata">> = {
  // ─── Pedidos ──
  "order.new":          { type: "order", category: "new_order",     targetRoles: SALES,                  severity: "info" },
  "order.paid":         { type: "order", category: "order_paid",    targetRoles: [...SALES, "TESORERIA"], severity: "info" },
  "order.shipped":      { type: "order", category: "order_shipped", targetRoles: ["SELLER", "LOGISTICA"], severity: "info" },
  "order.cancelled":    { type: "order", category: "order_cancelled", targetRoles: SALES,                severity: "warning" },

  // ─── Cotizaciones ──
  "quotation.new":      { type: "quotation", category: "quotation_new",      targetRoles: SALES,         severity: "info" },
  "quotation.approved": { type: "quotation", category: "quotation_approved", targetRoles: ["SELLER"],     severity: "info",     sendEmail: true },
  "quotation.rejected": { type: "quotation", category: "quotation_rejected", targetRoles: ["SELLER"],     severity: "warning",  sendEmail: true },

  // ─── Tickets / Solicitudes ──
  "ticket.new":         { type: "ticket", category: "ticket_new",      targetRoles: ["RRHH", "ADMIN", "SUPERADMIN"], severity: "info" },
  "ticket.assigned":    { type: "ticket", category: "ticket_assigned", targetRoles: [], severity: "info" }, // targetUserId dinámico
  "ticket.resolved":    { type: "ticket", category: "ticket_resolved", targetRoles: ["RRHH", "ADMIN"], severity: "info" },

  // ─── RRHH ──
  "hr.vacation_request":    { type: "hr", category: "vacation_request",    targetRoles: ["RRHH"],            severity: "info" },
  "hr.overtime_request":    { type: "hr", category: "overtime_request",    targetRoles: ["RRHH"],            severity: "info" },
  "hr.benefit_request":     { type: "hr", category: "benefit_request",     targetRoles: ["RRHH"],            severity: "info" },
  "hr.certificate_request": { type: "hr", category: "certificate_request", targetRoles: ["RRHH"],            severity: "info" },
  "hr.request_approved":    { type: "hr", category: "request_approved",    targetRoles: ["RRHH", "EMPLOYEE"], severity: "info",    sendEmail: true },
  "hr.request_rejected":    { type: "hr", category: "request_rejected",    targetRoles: ["RRHH", "EMPLOYEE"], severity: "warning", sendEmail: true },

  // ─── Producción ──
  "production.run_completed":  { type: "production", category: "run_completed",   targetRoles: OPS,                  severity: "info" },
  "production.order_approved": { type: "production", category: "order_approved",  targetRoles: OPS,                  severity: "info" },
  "production.order_started":  { type: "production", category: "order_started",   targetRoles: OPS,                  severity: "info" },

  // ─── Inventario / Bodega ──
  "inventory.stock_low":        { type: "inventory", category: "stock_low",         targetRoles: ["BODEGA", "INGENIERIA", ...OPS], severity: "warning", sendEmail: true },
  "inventory.warehouse_transfer": { type: "inventory", category: "warehouse_transfer", targetRoles: ["BODEGA", "LOGISTICA"],       severity: "info" },
  "inventory.adjustment":       { type: "inventory", category: "adjustment",        targetRoles: ["BODEGA"],                     severity: "info" },

  // ─── Logística ──
  "logistics.route_assigned": { type: "logistics", category: "route_assigned", targetRoles: ["LOGISTICA"],              severity: "info" },
  "logistics.incident":       { type: "logistics", category: "incident",       targetRoles: ["LOGISTICA", ...OPS],       severity: "warning" },

  // ─── Mantenimiento ──
  "maintenance.scheduled": { type: "maintenance", category: "scheduled", targetRoles: ["MANTENIMIENTO", "INGENIERIA"],         severity: "info" },
  "maintenance.urgent":    { type: "maintenance", category: "urgent",    targetRoles: ["MANTENIMIENTO", "INGENIERIA", ...OPS], severity: "urgent", sendEmail: true },

  // ─── Usuarios ──
  "user.created":   { type: "user", category: "user_created",   targetRoles: ["ADMIN", "SUPERADMIN"], severity: "info" },
  "user.suspended": { type: "user", category: "user_suspended", targetRoles: ["ADMIN", "SUPERADMIN"], severity: "warning" },

  // ─── Campañas ──
  "campaign.active": { type: "campaign", category: "campaign_active", targetRoles: ["MARKETING", "SELLER"], severity: "info" },

  // ─── Comunicados ──
  "announcement.new": { type: "announcement", category: "announcement_new", targetRoles: ALL_PANEL, severity: "info" },
};

/** Helper para crear el mapa rápido key → event config. */
export function getEventConfig(eventKey: string) {
  return NOTIFICATION_EVENTS[eventKey] ?? null;
}
