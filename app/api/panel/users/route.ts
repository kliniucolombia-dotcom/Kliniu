import { requireSuperAdmin } from "@/lib/permissions";
import { createUserByAdmin, listUsers } from "@/lib/users";

export async function GET() {
  const access = await requireSuperAdmin();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const users = await listUsers();
  return Response.json({ users });
}

export async function POST(request: Request) {
  const access = await requireSuperAdmin();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const body = await request.json().catch(() => ({})) as {
    fullName?: string; email?: string; password?: string;
    role?: "CUSTOMER" | "ADMIN" | "SELLER" | "PACKING" | "SUPERADMIN" | "RRHH" | "BODEGA" | "DISENO" | "MARKETING" | "JEFE_VENTAS" | "TESORERIA" | "INGENIERIA";
  };

  if (!body.fullName?.trim() || !body.email?.trim() || !body.password || !body.role) {
    return Response.json({ error: "Nombre, correo, contraseña y rol son requeridos" }, { status: 400 });
  }

  try {
    const user = await createUserByAdmin({
      fullName: body.fullName,
      email: body.email,
      password: body.password,
      role: body.role,
    });
    return Response.json(user);
  } catch (e) {
    if (e instanceof Error && e.message === "EMAIL_ALREADY_EXISTS") {
      return Response.json({ error: "Ese correo ya está registrado" }, { status: 409 });
    }
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
