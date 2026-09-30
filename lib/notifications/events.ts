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
  "MANTENIMIENTO", "JEFE_OPERACIONES", "DIRECTOR_OPERACIONES", "OPERARIO", "PACKING",
];

const SALES: UserRole[] = ["SELLER", "JEFE_VENTAS", "ADMIN", "SUPERADMIN"];
/** Jefatura de operaciones + ingeniería: líderes que deben enterarse de todo el área. */
const OPS: UserRole[] = ["JEFE_OPERACIONES", "DIRECTOR_OPERACIONES", "INGENIERIA"];
/** Planta de inyección: líder, empaque (acceso al módulo de producción) y jefaturas. */
const INYECCION: UserRole[] = ["LIDER_INYECCION", "PACKING", ...OPS];
/** Planta de ensamble: operarios, líder y jefaturas. */
const ENSAMBLE: UserRole[] = ["LIDER_ENSAMBLE", "OPERARIO", ...OPS];
/** Equipo de mantenimiento: técnicos y jefaturas. */
const MANTENIMIENTO_TEAM: UserRole[] = ["MANTENIMIENTO", ...OPS];
/** Equipo de logística: analistas y jefaturas. */
const LOGISTICA_TEAM: UserRole[] = ["LOGISTICA", ...OPS];
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
  "ticket.status_changed": { type: "ticket", category: "ticket_status", targetRoles: [], severity: "info" }, // targetUserId dinámico
  "ticket.comment":     { type: "ticket", category: "ticket_comment",  targetRoles: [], severity: "info" }, // targetUserId dinámico
  "ticket.resolved":    { type: "ticket", category: "ticket_resolved", targetRoles: ["RRHH", "ADMIN"], severity: "info" },

  // ─── RRHH ──
  "hr.vacation_request":    { type: "hr", category: "vacation_request",    targetRoles: ["RRHH"],            severity: "info" },
  "hr.overtime_request":    { type: "hr", category: "overtime_request",    targetRoles: ["RRHH"],            severity: "info" },
  "hr.benefit_request":     { type: "hr", category: "benefit_request",     targetRoles: ["RRHH"],            severity: "info" },
  "hr.certificate_request": { type: "hr", category: "certificate_request", targetRoles: ["RRHH"],            severity: "info" },
  "hr.request_approved":    { type: "hr", category: "request_approved",    targetRoles: ["RRHH", "EMPLOYEE"], severity: "info",    sendEmail: true },
  "hr.request_rejected":    { type: "hr", category: "request_rejected",    targetRoles: ["RRHH", "EMPLOYEE"], severity: "warning", sendEmail: true },

  // ─── Producción (inyección) ──
  "production.order_created":   { type: "production", category: "order_created",   targetRoles: INYECCION, severity: "info" },
  "production.order_approved":  { type: "production", category: "order_approved",  targetRoles: INYECCION, severity: "info" },
  "production.order_started":   { type: "production", category: "order_started",   targetRoles: INYECCION, severity: "info" },
  "production.order_completed": { type: "production", category: "order_completed",  targetRoles: INYECCION, severity: "info" },
  "production.order_cancelled": { type: "production", category: "order_cancelled",  targetRoles: INYECCION, severity: "warning" },
  "production.run_created":     { type: "production", category: "run_created",      targetRoles: INYECCION, severity: "info" },
  "production.run_completed":   { type: "production", category: "run_completed",    targetRoles: INYECCION, severity: "info" },

  // ─── Ensamble ──
  "ensamble.work_order_created": { type: "ensamble", category: "work_order_created", targetRoles: ENSAMBLE, severity: "info" },
  "ensamble.work_order_closed":  { type: "ensamble", category: "work_order_closed",  targetRoles: ENSAMBLE, severity: "info" },
  "ensamble.entry_recorded":     { type: "ensamble", category: "entry_recorded",     targetRoles: [],       severity: "info" }, // targetUserId dinámico

  // ─── Inventario / Bodega ──
  "inventory.stock_low":        { type: "inventory", category: "stock_low",         targetRoles: ["BODEGA", "INGENIERIA", ...OPS], severity: "warning", sendEmail: true },
  "inventory.warehouse_transfer": { type: "inventory", category: "warehouse_transfer", targetRoles: ["BODEGA", "LOGISTICA"],       severity: "info" },
  "inventory.adjustment":       { type: "inventory", category: "adjustment",        targetRoles: ["BODEGA"],                     severity: "info" },

  // ─── Logística ──
  "logistics.route_assigned": { type: "logistics", category: "route_assigned", targetRoles: LOGISTICA_TEAM, severity: "info" },
  "logistics.incident":       { type: "logistics", category: "incident",       targetRoles: LOGISTICA_TEAM, severity: "warning" },

  // ─── Informes de operaciones ──
  "operations.report_submitted": { type: "operations", category: "report_submitted", targetRoles: OPS, severity: "info" },

  // ─── Mantenimiento ──
  "maintenance.scheduled":  { type: "maintenance", category: "scheduled",  targetRoles: MANTENIMIENTO_TEAM, severity: "info" },
  "maintenance.assigned":   { type: "maintenance", category: "assigned",   targetRoles: [],                 severity: "info" }, // targetUserId dinámico
  "maintenance.reassigned": { type: "maintenance", category: "reassigned", targetRoles: MANTENIMIENTO_TEAM, severity: "info" },
  "maintenance.urgent":     { type: "maintenance", category: "urgent",     targetRoles: MANTENIMIENTO_TEAM, severity: "urgent" },

  // ─── Usuarios ──
  "user.created":   { type: "user", category: "user_created",   targetRoles: ["ADMIN", "SUPERADMIN"], severity: "info" },
  "user.suspended": { type: "user", category: "user_suspended", targetRoles: ["ADMIN", "SUPERADMIN"], severity: "warning" },

  // ─── Campañas ──
  "campaign.active": { type: "campaign", category: "campaign_active", targetRoles: ["MARKETING", "SELLER"], severity: "info" },

  // ─── WhatsApp / WATI ──
  "wati.moderation_escalated": { type: "wati", category: "moderation_escalated", targetRoles: SALES, severity: "warning" },

  // ─── Comunicados ──
  "announcement.new": { type: "announcement", category: "announcement_new", targetRoles: ALL_PANEL, severity: "info" },
};

/** Helper para crear el mapa rápido key → event config. */
export function getEventConfig(eventKey: string) {
  return NOTIFICATION_EVENTS[eventKey] ?? null;
}
