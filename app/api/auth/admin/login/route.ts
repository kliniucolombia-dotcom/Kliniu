import { authenticateUser } from "@/lib/users";
import { checkAdminPin, setSessionCookie } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      adminPin?: string;
    };

    const email = body.email?.trim() || "";
    const password = body.password || "";
    const adminPin = body.adminPin?.trim() || "";

    if (!email || !password) {
      return Response.json(
        { error: "Ingresa tu correo y contraseña." },
        { status: 400 },
      );
    }

    if (!(await checkRateLimit(`admin-login:${getClientIp(request)}:${email}`, 10, 10 * 60 * 1000))) {
      return Response.json(
        { error: "Demasiados intentos. Espera unos minutos e intenta de nuevo." },
        { status: 429 },
      );
    }

    const user = await authenticateUser(email, password);

    if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
      return Response.json(
        { error: "Esta cuenta no tiene permisos de administrador." },
        { status: 403 },
      );
    }

    if (user.role === "ADMIN" && checkAdminPin("") === "unset") {
      console.error("ADMIN_EXTRA_PIN no está configurada: login de ADMIN bloqueado.");
      return Response.json(
        { error: "PIN de administrador no configurado. Contacta al superadministrador." },
        { status: 500 },
      );
    }

    if (user.role === "ADMIN" && !adminPin) {
      return Response.json(
        {
          requiresAdminPin: true,
          user: { id: user.id, role: user.role },
          message: "Confirma el PIN adicional para entrar al panel.",
        },
        { status: 202 },
      );
    }

    if (user.role === "ADMIN" && checkAdminPin(adminPin) !== "ok") {
      return Response.json(
        { error: "El PIN de administrador es incorrecto." },
        { status: 403 },
      );
    }

    await setSessionCookie({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return Response.json({
      user,
      message: "Acceso administrador correcto.",
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message === "INVALID_CREDENTIALS"
        ? "Correo o contraseña incorrectos."
        : error instanceof Error && error.message === "USER_NOT_ACTIVE"
          ? "Esta cuenta está inactiva o suspendida."
          : error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED"
            ? "La base de datos no está configurada todavía."
            : "No fue posible iniciar sesión como administrador.";

    return Response.json({ error: message }, { status: 500 });
  }
}
