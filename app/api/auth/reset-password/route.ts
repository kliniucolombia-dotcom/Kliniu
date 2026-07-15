import { readResetPasswordToken } from "@/lib/auth";
import { resetUserPassword } from "@/lib/users";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!checkRateLimit(`reset-password:${ip}`, 8, 15 * 60 * 1000)) {
      return Response.json(
        { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." },
        { status: 429 },
      );
    }

    const body = (await request.json()) as { token?: string; password?: string };
    const token = body.token?.trim() || "";
    const password = body.password || "";

    if (!token) {
      return Response.json({ error: "Enlace inválido." }, { status: 400 });
    }

    if (password.length < 6) {
      return Response.json(
        { error: "La contraseña debe tener al menos 6 caracteres." },
        { status: 400 },
      );
    }

    let payload;
    try {
      payload = await readResetPasswordToken(token);
    } catch {
      return Response.json(
        { error: "El enlace expiró o no es válido. Solicita uno nuevo." },
        { status: 400 },
      );
    }

    await resetUserPassword(payload.userId, password);

    return Response.json({ message: "Contraseña actualizada. Ya puedes iniciar sesión." });
  } catch (error) {
    console.error("Error en reset-password:", error);
    return Response.json(
      { error: "No fue posible restablecer la contraseña." },
      { status: 500 },
    );
  }
}
