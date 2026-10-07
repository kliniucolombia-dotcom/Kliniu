import { clearSessionCookie, getSessionFromCookies, setSessionCookie } from "@/lib/auth";
import { anonymizeCustomerAccount, getUserById, updateUserProfile } from "@/lib/users";
import { sendVerificationEmail } from "@/lib/email-verification";
import { checkRateLimit } from "@/lib/rate-limit";

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
      currentPassword?: string;
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

    if (body.currentPassword !== undefined && typeof body.currentPassword !== "string") {
      return Response.json({ error: "Contraseña actual inválida." }, { status: 400 });
    }

    // Cada envío con contraseña actual es un intento de adivinarla: se limita.
    if (
      body.currentPassword &&
      !(await checkRateLimit(`change-password:${session.userId}`, 5, 15 * 60 * 1000))
    ) {
      return Response.json(
        { error: "Demasiados intentos. Espera unos minutos e intenta de nuevo." },
        { status: 429 },
      );
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
      currentPassword: body.currentPassword,
    });

    await setSessionCookie({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Mismo tope que el reenvío manual (verify-email): cambiar el correo en bucle
    // no puede usarse para mandar correos a direcciones ajenas.
    if (
      user.email !== session.email &&
      (await checkRateLimit(`verify-email:${user.id}`, 3, 15 * 60 * 1000))
    ) {
      await sendVerificationEmail(user, request);
    }

    return Response.json({
      user,
      message: "Cuenta actualizada correctamente.",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CURRENT_PASSWORD_REQUIRED") {
      return Response.json(
        { error: "Escribe tu contraseña actual para cambiar el correo o la contraseña." },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
      return Response.json({ error: "La contraseña actual no es correcta." }, { status: 403 });
    }

    const message =
      error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS"
        ? "Ese correo ya está registrado por otra cuenta."
        : error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED"
          ? "La base de datos no está configurada todavía."
          : "No fue posible actualizar la cuenta.";

    return Response.json({ error: message }, { status: 500 });
  }
}

// Eliminación de la cuenta por el propio titular. Pide la contraseña actual.
export async function DELETE(request: Request) {
  try {
    const session = await getSessionFromCookies();

    if (!session) {
      return Response.json({ error: "No autorizado." }, { status: 401 });
    }

    if (!(await checkRateLimit(`delete-account:${session.userId}`, 5, 15 * 60 * 1000))) {
      return Response.json(
        { error: "Demasiados intentos. Espera unos minutos e intenta de nuevo." },
        { status: 429 },
      );
    }

    const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
    const password = typeof body?.password === "string" ? body.password : "";

    if (!password) {
      return Response.json({ error: "Ingresa tu contraseña para confirmar." }, { status: 400 });
    }

    await anonymizeCustomerAccount(session.userId, password);
    await clearSessionCookie();

    return Response.json({ message: "Tu cuenta fue eliminada." });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";

    if (code === "INVALID_CREDENTIALS") {
      return Response.json({ error: "La contraseña no es correcta." }, { status: 403 });
    }
    if (code === "NOT_CUSTOMER") {
      return Response.json(
        { error: "Las cuentas del equipo las gestiona un administrador." },
        { status: 403 },
      );
    }
    if (code === "USER_NOT_FOUND") {
      return Response.json({ error: "No autorizado." }, { status: 401 });
    }

    console.error("Error eliminando la cuenta:", error);
    return Response.json({ error: "No fue posible eliminar la cuenta." }, { status: 500 });
  }
}
