import type { UserRole } from "@/generated/prisma/client";

type RoleHolder = { role: UserRole };

export const ROLE_LABELS: Record<UserRole, string> = {
  CUSTOMER: "Cliente",
  ADMIN: "Administrador",
  SELLER: "Vendedor",
  PACKING: "Empaque",
  SUPERADMIN: "Superadmin",
  RRHH: "Recursos Humanos",
  EMPLOYEE: "Empleado",
  BODEGA: "Bodega",
  DISENO: "Diseño",
  MARKETING: "Marketing",
  JEFE_VENTAS: "Jefe de Ventas",
  TESORERIA: "Tesorería",
  INGENIERIA: "Ingeniería",
  LOGISTICA: "Logística",
  LIDER_ENSAMBLE: "Líder Planta Ensamble",
  LIDER_INYECCION: "Líder Planta Inyección",
  MANTENIMIENTO: "Mantenimiento",
  JEFE_OPERACIONES: "Jefe de Operaciones",
  DIRECTOR_OPERACIONES: "Director de Operaciones",
};

export function isSuperAdmin(user: RoleHolder): boolean {
  return user.role === "SUPERADMIN";
}

export function isAdmin(user: RoleHolder): boolean {
  return user.role === "ADMIN" || isSuperAdmin(user);
}

export function isStaff(user: RoleHolder): boolean {
  return (
    user.role === "ADMIN" ||
    user.role === "SELLER" ||
    user.role === "PACKING" ||
    user.role === "RRHH" ||
    isSuperAdmin(user)
  );
}

export function isRRHH(user: RoleHolder): boolean {
  return user.role === "RRHH" || isSuperAdmin(user);
}
