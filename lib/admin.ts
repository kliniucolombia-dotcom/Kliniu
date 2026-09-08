import { getSessionFromCookies } from "@/lib/auth";
import { getUserById } from "@/lib/users";
import { isAdmin, isSuperAdmin } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import type { PanelModule } from "@/generated/prisma/client";
import type { PermissionAction } from "@/lib/permissions";

const ACTION_FIELD: Record<PermissionAction, "canView" | "canCreate" | "canEdit" | "canDelete"> = {
  view: "canView",
  create: "canCreate",
  edit: "canEdit",
  delete: "canDelete",
};

// Un ADMIN/SELLER pasa el check de rol de requireAdminOrSeller sin importar
// overrides granulares. Si alguien le bajó el permiso puntual a este usuario
// para este módulo, eso debe pesar más que su rol base — si no, un ADMIN
// "restringido" en /panel sigue pudiendo colarse por /admin sin restricción.
async function assertNoContraryOverride(userId: string, module: PanelModule, action: PermissionAction) {
  if (!prisma) return;
  const override = await prisma.userPermission.findUnique({
    where: { userId_module: { userId, module } },
  });
  if (override && !override[ACTION_FIELD[action]]) {
    throw new Error("FORBIDDEN");
  }
}

export async function requireStaffUpload() {
  const session = await getSessionFromCookies();

  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  const user = await getUserById(session.userId);

  if (!user || (user.role !== "SELLER" && user.role !== "RRHH" && user.role !== "DISENO" && !isAdmin(user))) {
    throw new Error("FORBIDDEN");
  }

  return user;
}

export async function requireAdminUser() {
  const session = await getSessionFromCookies();

  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  const user = await getUserById(session.userId);

  if (!user || !isAdmin(user)) {
    throw new Error("FORBIDDEN");
  }

  return user;
}

export async function requireSuperAdmin() {
  const session = await getSessionFromCookies();

  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  const user = await getUserById(session.userId);

  if (!user || !isSuperAdmin(user)) {
    throw new Error("FORBIDDEN");
  }

  return user;
}

export async function requireAdminOrSeller(module?: PanelModule, action?: PermissionAction) {
  const session = await getSessionFromCookies();

  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  const user = await getUserById(session.userId);

  if (!user || (user.role !== "SELLER" && !isAdmin(user))) {
    throw new Error("FORBIDDEN");
  }

  if (module && action && !isSuperAdmin(user)) {
    await assertNoContraryOverride(user.id, module, action);
  }

  return user;
}
