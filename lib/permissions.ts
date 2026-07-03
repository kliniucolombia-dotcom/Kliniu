import { getSessionFromCookies, type SessionPayload } from "@/lib/auth";
import { getUserById, type PublicUser } from "@/lib/users";
import { isAdmin, isSuperAdmin } from "@/lib/roles";
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
