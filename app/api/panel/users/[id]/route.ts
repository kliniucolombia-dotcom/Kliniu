import { requireSuperAdmin } from "@/lib/permissions";
import { deleteUserByAdmin, getUserDeletionImpact, hasDeletionImpact, updateUserByAdmin } from "@/lib/users";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireSuperAdmin();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  const body = await request.json().catch(() => ({})) as {
    fullName?: string; email?: string;
    role?: "CUSTOMER" | "ADMIN" | "SELLER" | "PACKING" | "SUPERADMIN" | "RRHH";
    status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    newPassword?: string;
  };

  try {
    const user = await updateUserByAdmin(id, body);
    return Response.json(user);
  } catch (e) {
    if (e instanceof Error && e.message === "EMAIL_ALREADY_EXISTS") {
      return Response.json({ error: "Ese correo ya está registrado" }, { status: 409 });
    }
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireSuperAdmin();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  if (id === access.user.id) {
    return Response.json({ error: "No puedes eliminar tu propio usuario" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";

  if (!force) {
    const impact = await getUserDeletionImpact(id);
    if (hasDeletionImpact(impact)) {
      return Response.json({ requiresConfirmation: true, impact }, { status: 409 });
    }
  }

  try {
    await deleteUserByAdmin(id, { force });
    return Response.json({ ok: true });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2003") {
      return Response.json(
        { error: "No se puede eliminar: el usuario tiene registros asociados que no se pudieron desvincular" },
        { status: 409 },
      );
    }
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
