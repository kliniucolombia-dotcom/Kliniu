import { requireSuperAdmin, getEffectivePermission } from "@/lib/permissions";
import { getUserById } from "@/lib/users";
import { prisma } from "@/lib/prisma";
import { ALL_MODULES, type Permission } from "@/lib/permission-defaults";
import type { PanelModule } from "@/generated/prisma/client";
import { broadcastPanelUpdate } from "@/lib/realtime";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireSuperAdmin();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  const targetUser = await getUserById(id);
  if (!targetUser) return Response.json({ error: "Usuario no encontrado" }, { status: 404 });

  if (!prisma) return Response.json({ error: "DB no disponible" }, { status: 500 });

  const overrides = await prisma.userPermission.findMany({ where: { userId: id } });
  const overrideByModule = new Map(overrides.map((o) => [o.module, o]));

  const permissions = await Promise.all(
    ALL_MODULES.map(async (module) => ({
      module,
      isOverride: overrideByModule.has(module),
      ...(await getEffectivePermission(targetUser, module)),
    })),
  );

  return Response.json({ permissions });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireSuperAdmin();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  const targetUser = await getUserById(id);
  if (!targetUser) return Response.json({ error: "Usuario no encontrado" }, { status: 404 });

  if (!prisma) return Response.json({ error: "DB no disponible" }, { status: 500 });

  const body = await request.json().catch(() => ({})) as {
    permissions?: Array<{ module: PanelModule } & Permission>;
  };

  if (!body.permissions?.length) {
    return Response.json({ error: "permissions requerido" }, { status: 400 });
  }

  await Promise.all(
    body.permissions.map((p) =>
      prisma!.userPermission.upsert({
        where: { userId_module: { userId: id, module: p.module } },
        create: {
          userId: id,
          module: p.module,
          canView: p.canView,
          canCreate: p.canCreate,
          canEdit: p.canEdit,
          canDelete: p.canDelete,
          updatedBy: access.user.id,
        },
        update: {
          canView: p.canView,
          canCreate: p.canCreate,
          canEdit: p.canEdit,
          canDelete: p.canDelete,
          updatedBy: access.user.id,
        },
      }),
    ),
  );

  await broadcastPanelUpdate("permissions");
  return Response.json({ ok: true });
}
