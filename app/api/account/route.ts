import { getSessionFromCookies, setSessionCookie } from "@/lib/auth";
import { getUserById, updateUserProfile } from "@/lib/users";

export async function GET() {
  try {
    const session = await getSessionFromCookies();

    if (!session) {
      return Response.json({ error: "No autorizado." }, { status: 401 });
    }

    const user = await getUserById(session.userId);

    if (!user) {
      return Response.json({ error: "No autorizado." }, { status: 401 });
    }

    return Response.json({ user });
  } catch {
    return Response.json(
      { error: "No fue posible cargar la cuenta." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSessionFromCookies();

    if (!session) {
      return Response.json({ error: "No autorizado." }, { status: 401 });
    }

    const body = (await request.json()) as {
      fullName?: string;
      company?: string;
      email?: string;
      phone?: string;
      department?: string;
      city?: string;
      addressLine1?: string;
      addressLine2?: string;
      newPassword?: string;
      confirmPassword?: string;
    };

    if (!body.fullName?.trim() || !body.email?.trim()) {
      return Response.json(
        { error: "Nombre completo y correo son obligatorios." },
        { status: 400 },
      );
    }

    if (body.newPassword?.trim()) {
      if (body.newPassword.trim().length < 8) {
        return Response.json(
          { error: "La nueva contraseña debe tener al menos 8 caracteres." },
          { status: 400 },
        );
      }

      if (body.newPassword !== body.confirmPassword) {
        return Response.json(
          { error: "Las nuevas contraseñas no coinciden." },
          { status: 400 },
        );
      }
    }

    const user = await updateUserProfile(session.userId, {
      fullName: body.fullName,
      company: body.company,
      email: body.email,
      phone: body.phone,
      department: body.department,
      city: body.city,
      addressLine1: body.addressLine1,
      addressLine2: body.addressLine2,
      newPassword: body.newPassword,
    });

    await setSessionCookie({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return Response.json({
      user,
      message: "Cuenta actualizada correctamente.",
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS"
        ? "Ese correo ya está registrado por otra cuenta."
        : error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED"
          ? "La base de datos no está configurada todavía."
          : "No fue posible actualizar la cuenta.";

    return Response.json({ error: message }, { status: 500 });
  }
}
