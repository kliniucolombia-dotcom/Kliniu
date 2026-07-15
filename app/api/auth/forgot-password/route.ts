import { Resend } from "resend";
import { getUserByEmail } from "@/lib/users";
import { createResetPasswordToken } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!checkRateLimit(`forgot-password:${ip}`, 5, 15 * 60 * 1000)) {
      return Response.json(
        { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." },
        { status: 429 },
      );
    }

    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase() || "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "Ingresa un correo válido." }, { status: 400 });
    }

    const genericMessage =
      "Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.";

    const user = await getUserByEmail(email);

    if (!user) {
      return Response.json({ message: genericMessage });
    }

    const token = await createResetPasswordToken(user.id, user.email);
    const origin = new URL(request.url).origin;
    const resetUrl = `${origin}/restablecer-contrasena?token=${token}`;

    await resend.emails.send({
      from: "Kliniu <contacto@kliniu.com>",
      to: user.email,
      subject: "Restablece tu contraseña de Kliniu",
      text: [
        `Hola ${user.fullName},`,
        "",
        "Recibimos una solicitud para restablecer la contraseña de tu cuenta Kliniu.",
        "Este enlace es válido por 30 minutos:",
        "",
        resetUrl,
        "",
        "Si no solicitaste esto, puedes ignorar este correo.",
      ].join("\n"),
    });

    return Response.json({ message: genericMessage });
  } catch (error) {
    console.error("Error en forgot-password:", error);
    return Response.json(
      { error: "No fue posible procesar la solicitud." },
      { status: 500 },
    );
  }
}
