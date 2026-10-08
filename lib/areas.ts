import type { UserRole } from "@/generated/prisma/client";

export type AreaKey = "COMERCIAL" | "CATALOGO" | "OPERACIONES" | "RRHH" | "ADMINISTRACION";

export type Area = { key: AreaKey; name: string };

export const AREAS: Area[] = [
  { key: "COMERCIAL", name: "Comercial" },
  { key: "CATALOGO", name: "Catálogo" },
  { key: "OPERACIONES", name: "Operaciones" },
  { key: "RRHH", name: "Recursos Humanos" },
  { key: "ADMINISTRACION", name: "Administración" },
];

const ROLE_AREA: Record<UserRole, AreaKey | null> = {
  SELLER: "COMERCIAL",
  JEFE_VENTAS: "COMERCIAL",
  DISENO: "CATALOGO",
  MARKETING: "CATALOGO",
  PACKING: "OPERACIONES",
  BODEGA: "OPERACIONES",
  LIDER_INYECCION: "OPERACIONES",
  LIDER_ENSAMBLE: "OPERACIONES",
  OPERARIO: "OPERACIONES",
  MANTENIMIENTO: "OPERACIONES",
  LOGISTICA: "OPERACIONES",
  INGENIERIA: "OPERACIONES",
  JEFE_OPERACIONES: "OPERACIONES",
  DIRECTOR_OPERACIONES: "OPERACIONES",
  RRHH: "RRHH",
  EMPLOYEE: "RRHH",
  ADMIN: "ADMINISTRACION",
  TESORERIA: "ADMINISTRACION",
  CUSTOMER: null,
  SUPERADMIN: null,
};

export function areaForRole(role: string): AreaKey | null {
  return ROLE_AREA[role as UserRole] ?? null;
}

export function areaName(key: AreaKey | null): string {
  return AREAS.find((a) => a.key === key)?.name ?? "General";
}

/** Superadmin y admin ven y asignan sin restricción de área. */
export function hasGlobalTaskAccess(role: UserRole): boolean {
  return role === "SUPERADMIN" || role === "ADMIN";
}

/** ¿Puede `viewer` ver una tarea asignada a `assigneeRoles`/creada por `createdById`? */
export function canSeeTask(
  viewer: { id: string; role: UserRole },
  task: { createdById: string; assigneeRoles: UserRole[]; assigneeIds: string[] },
): boolean {
  if (hasGlobalTaskAccess(viewer.role)) return true;
  if (task.createdById === viewer.id) return true;
  if (task.assigneeIds.includes(viewer.id)) return true;
  const area = areaForRole(viewer.role);
  if (!area) return false;
  return task.assigneeRoles.some((r) => areaForRole(r) === area);
}
