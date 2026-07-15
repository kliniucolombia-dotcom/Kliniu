import { registerUser } from "@/lib/users";
import { setSessionCookie } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    if (!checkRateLimit(`register:${getClientIp(request)}`, 5, 10 * 60 * 1000)) {
      return Response.json(
        { error: "Demasiados intentos. Espera unos minutos e intenta de nuevo." },
        { status: 429 },
      );
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
      password?: string;
      confirmPassword?: string;
    };

    const fullName = body.fullName?.trim() || "";
    const email = body.email?.trim() || "";
    const department = body.department?.trim() || "";
    const city = body.city?.trim() || "";
    const addressLine1 = body.addressLine1?.trim() || "";
    const password = body.password || "";
    const confirmPassword = body.confirmPassword || "";

    if (!fullName || !email || !department || !city || !addressLine1 || !password || !confirmPassword) {
      return Response.json(
        { error: "Completa todos los campos obligatorios." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return Response.json(
        { error: "La contraseña debe tener al menos 8 caracteres." },
        { status: 400 },
      );
    }

    if (password !== confirmPassword) {
      return Response.json(
        { error: "Las contraseñas no coinciden." },
        { status: 400 },
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json(
        { error: "Ingresa un correo electrónico válido." },
        { status: 400 },
      );
    }

    const user = await registerUser({
      fullName,
      company: body.company,
      email,
      phone: body.phone,
      department,
      city,
      addressLine1,
      addressLine2: body.addressLine2,
      password,
    });

    await setSessionCookie({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return Response.json(
      {
        user,
        redirectTo: "/mi-cuenta",
        message: "Cuenta creada correctamente.",
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS") {
      return Response.json({ error: "Ya existe una cuenta registrada con ese correo." }, { status: 409 });
    }

    const message =
      error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED"
        ? "La base de datos no está configurada todavía."
        : "No fue posible crear la cuenta.";

    return Response.json({ error: message }, { status: 500 });
  }
}
