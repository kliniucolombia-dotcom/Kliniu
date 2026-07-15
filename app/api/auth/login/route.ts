import { authenticateUser, getUserById } from "@/lib/users";
import { setSessionCookie } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getPanelLandingPath } from "@/lib/permissions";

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

    if (!checkRateLimit(`login:${getClientIp(request)}:${email}`, 10, 10 * 60 * 1000)) {
      return Response.json(
        { error: "Demasiados intentos. Espera unos minutos e intenta de nuevo." },
        { status: 429 },
      );
    }

    const user = await authenticateUser(email, password);
    const expectedAdminPin = process.env.ADMIN_EXTRA_PIN?.trim() || "1234";

    if (user.role === "ADMIN" && !adminPin) {
      return Response.json(
        {
          requiresAdminPin: true,
          user: {
            id: user.id,
            role: user.role,
          },
          message: "Confirma el PIN adicional para entrar al panel.",
        },
        { status: 202 },
      );
    }

    if (user.role === "ADMIN" && adminPin !== expectedAdminPin) {
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

    const fullUser = (user.role === "SELLER" || user.role === "RRHH") ? await getUserById(user.id) : null;

    const redirectTo =
      user.role === "ADMIN"      ? "/admin"      :
      user.role === "SUPERADMIN" ? "/panel"      :
      user.role === "SELLER"     ? await getPanelLandingPath(fullUser!) :
      user.role === "PACKING"    ? "/empaque"    :
      user.role === "RRHH"       ? await getPanelLandingPath(fullUser!) :
      user.role === "EMPLOYEE"   ? "/empleado"   :
      "/mi-cuenta";

    return Response.json({
      user,
      redirectTo,
      message: "Inicio de sesión correcto.",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
      return Response.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
    }

    if (error instanceof Error && error.message === "USER_NOT_ACTIVE") {
      return Response.json({ error: "Esta cuenta está inactiva o suspendida." }, { status: 403 });
    }

    const message =
      error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED"
        ? "La base de datos no está configurada todavía."
        : "No fue posible iniciar sesión.";

    const debug = process.env.NODE_ENV !== "production" || process.env.DEBUG_AUTH === "1"
      ? (error instanceof Error ? error.message : String(error))
      : undefined;

    return Response.json({ error: message, debug }, { status: 500 });
  }
}
