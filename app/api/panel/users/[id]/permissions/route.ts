import { requireSuperAdmin, getEffectivePermission } from "@/lib/permissions";
import { getUserById } from "@/lib/users";
import { prisma } from "@/lib/prisma";
import { ALL_MODULES, type Permission } from "@/lib/permission-defaults";
import type { PanelModule } from "@/generated/prisma/client";
import { broadcastPanelUpdate } from "@/lib/realtime";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireSuperAdmin();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  const targetUser = await getUserById(id);
  if (!targetUser) return Response.json({ error: "Usuario no encontrado" }, { status: 404 });

  if (!prisma) return Response.json({ error: "DB no disponible" }, { status: 503 });

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

  if (!prisma) return Response.json({ error: "DB no disponible" }, { status: 503 });

  const body = await request.json().catch(() => ({})) as {
    permissions?: Array<{ module: PanelModule } & Permission>;
  };

  if (!body.permissions?.length) {
    return Response.json({ error: "permissions requerido" }, { status: 400 });
  }

  // Lo que el usuario podía hacer antes (override o por defecto), para anotar solo lo que cambia.
  const FLAGS = ["canView", "canCreate", "canEdit", "canDelete"] as const;
  const changes: Record<string, { from: Record<string, boolean>; to: Record<string, boolean> }> = {};
  for (const p of body.permissions) {
    const prev = await getEffectivePermission(targetUser, p.module);
    if (FLAGS.some((f) => prev[f] !== p[f])) {
      changes[p.module] = {
        from: Object.fromEntries(FLAGS.map((f) => [f, prev[f]])),
        to: Object.fromEntries(FLAGS.map((f) => [f, p[f]])),
      };
    }
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
  await logAudit({
    actorId: access.user.id,
    actorEmail: access.user.email,
    action: "user.permissions_update",
    entity: "user",
    entityId: id,
    meta: { target: targetUser.email, changes },
    ip: getClientIp(request),
  });
  return Response.json({ ok: true });
}
