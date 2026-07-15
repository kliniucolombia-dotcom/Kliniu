import { getSessionFromCookies, type SessionPayload } from "@/lib/auth";
import { getUserById, type PublicUser } from "@/lib/users";
import { isAdmin, isSuperAdmin, isRRHH } from "@/lib/roles";
import { DEFAULT_PERMISSIONS, ALL_MODULES, type Permission } from "@/lib/permission-defaults";
import { prisma } from "@/lib/prisma";
import type { PanelModule } from "@/generated/prisma/client";

export type PermissionAction = "view" | "create" | "edit" | "delete";

export type AuthResult =
  | { ok: true; session: SessionPayload; user: PublicUser }
  | { ok: false; status: 401 | 403 };

const ACTION_FIELD: Record<PermissionAction, keyof Permission> = {
  view: "canView",
  create: "canCreate",
  edit: "canEdit",
  delete: "canDelete",
};

const FULL_PERMISSION: Permission = { canView: true, canCreate: true, canEdit: true, canDelete: true };

async function resolveActiveUser(): Promise<
  { ok: true; session: SessionPayload; user: PublicUser } | { ok: false; status: 401 }
> {
  const session = await getSessionFromCookies();
  if (!session) return { ok: false, status: 401 };

  const user = await getUserById(session.userId);
  if (!user || user.status !== "ACTIVE") return { ok: false, status: 401 };

  return { ok: true, session, user };
}

export async function getEffectivePermission(
  user: PublicUser,
  module: PanelModule,
): Promise<Permission> {
  if (isSuperAdmin(user)) return FULL_PERMISSION;
  if (!prisma) return DEFAULT_PERMISSIONS[user.role as Exclude<PublicUser["role"], "SUPERADMIN">][module];

  const override = await prisma.userPermission.findUnique({
    where: { userId_module: { userId: user.id, module } },
  });

  if (override) {
    return {
      canView: override.canView,
      canCreate: override.canCreate,
      canEdit: override.canEdit,
      canDelete: override.canDelete,
    };
  }

  return DEFAULT_PERMISSIONS[user.role as Exclude<PublicUser["role"], "SUPERADMIN">][module];
}

export async function getEffectivePermissions(user: PublicUser): Promise<Record<PanelModule, Permission>> {
  const entries = await Promise.all(
    ALL_MODULES.map(async (module) => [module, await getEffectivePermission(user, module)] as const),
  );
  return Object.fromEntries(entries) as Record<PanelModule, Permission>;
}

export async function requirePermission(module: PanelModule, action: PermissionAction): Promise<AuthResult> {
  const resolved = await resolveActiveUser();
  if (!resolved.ok) return resolved;

  const { session, user } = resolved;
  if (isSuperAdmin(user)) return { ok: true, session, user };

  const perm = await getEffectivePermission(user, module);
  if (!perm[ACTION_FIELD[action]]) return { ok: false, status: 403 };

  return { ok: true, session, user };
}

// Módulo → ruta del panel, en orden de prioridad para decidir a dónde aterriza
// un usuario según lo que sí puede ver. Evita el loop de redirect que ocurre
// si se manda a alguien a una ruta fija (ej. /panel) sin permiso para verla.
const PANEL_LANDING_ROUTES: Array<{ module: PanelModule; path: string }> = [
  { module: "MODULE_DASHBOARD", path: "/panel" },
  { module: "MODULE_PEDIDOS", path: "/panel/pedidos" },
  { module: "MODULE_PRODUCTOS", path: "/panel/productos" },
  { module: "MODULE_OUTLET", path: "/panel/outlet" },
  { module: "MODULE_BODEGAS", path: "/panel/bodegas" },
  { module: "MODULE_BANNERS", path: "/panel/banners" },
  { module: "MODULE_COMBOS", path: "/panel/combos" },
  { module: "MODULE_METRICAS", path: "/panel/metricas" },
  { module: "MODULE_CAMPANAS", path: "/panel/campanas" },
  { module: "MODULE_COSTOS", path: "/panel/costos" },
  { module: "MODULE_CALCULADORA_PRECIO", path: "/panel/calculadora-precio" },
  { module: "MODULE_COTIZACIONES", path: "/panel/cotizaciones" },
  { module: "MODULE_PRODUCCION", path: "/panel/produccion" },
  { module: "MODULE_ODOO", path: "/panel/odoo" },
  { module: "MODULE_USUARIOS", path: "/panel/usuarios" },
  { module: "MODULE_RRHH", path: "/panel/rrhh" },
];

export const PANEL_NO_ACCESS_PATH = "/panel/sin-acceso";

export async function getPanelLandingPath(user: PublicUser): Promise<string> {
  if (isSuperAdmin(user)) return "/panel";

  const perms = await getEffectivePermissions(user);
  for (const { module, path } of PANEL_LANDING_ROUTES) {
    if (perms[module]?.canView) return path;
  }
  return PANEL_NO_ACCESS_PATH;
}

// Igual que requirePermission, pero en vez de siempre mandar a /login cuando
// el usuario SÍ está autenticado pero le falta el permiso puntual, calcula a
// dónde sí puede entrar (o /panel/sin-acceso si no tiene nada asignado).
export async function requirePermissionWithFallback(
  module: PanelModule,
  action: PermissionAction,
): Promise<
  | { ok: true; session: SessionPayload; user: PublicUser }
  | { ok: false; redirectTo: string }
> {
  const resolved = await resolveActiveUser();
  if (!resolved.ok) return { ok: false, redirectTo: "/login" };

  const { session, user } = resolved;
  if (isSuperAdmin(user)) return { ok: true, session, user };

  const perm = await getEffectivePermission(user, module);
  if (perm[ACTION_FIELD[action]]) return { ok: true, session, user };

  return { ok: false, redirectTo: await getPanelLandingPath(user) };
}

export async function requireAdmin(): Promise<AuthResult> {
  const resolved = await resolveActiveUser();
  if (!resolved.ok) return resolved;

  if (!isAdmin(resolved.user)) return { ok: false, status: 403 };
  return resolved;
}

export async function requireSuperAdmin(): Promise<AuthResult> {
  const resolved = await resolveActiveUser();
  if (!resolved.ok) return resolved;

  if (!isSuperAdmin(resolved.user)) return { ok: false, status: 403 };
  return resolved;
}

export async function requireRRHH(): Promise<AuthResult> {
  const resolved = await resolveActiveUser();
  if (!resolved.ok) return resolved;

  if (!isRRHH(resolved.user)) return { ok: false, status: 403 };
  return resolved;
}

export async function requireActiveUser(): Promise<AuthResult> {
  return resolveActiveUser();
}
