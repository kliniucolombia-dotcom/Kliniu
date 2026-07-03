import { requireSuperAdmin } from "@/lib/permissions";
import { updateUserByAdmin } from "@/lib/users";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireSuperAdmin();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  const body = await request.json().catch(() => ({})) as {
    fullName?: string; email?: string;
    role?: "CUSTOMER" | "ADMIN" | "SELLER" | "PACKING" | "SUPERADMIN";
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
