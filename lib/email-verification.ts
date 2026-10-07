import { Resend } from "resend";
import { createEmailVerificationToken } from "@/lib/auth";
import { emailLinkOrigin } from "@/lib/site";

const resend = new Resend(process.env.RESEND_API_KEY);

// Envía el enlace de confirmación de correo. Devuelve false si no salió; nunca lanza:
// la verificación es suave y no debe tumbar el registro ni la edición del perfil.
export async function sendVerificationEmail(
  user: { id: string; email: string },
  request: Request,
): Promise<boolean> {
  try {
    const token = await createEmailVerificationToken(user.id, user.email);
    const verifyUrl = `${emailLinkOrigin(request)}/api/auth/verify-email?token=${token}`;

    const { error } = await resend.emails.send({
      from: "Kliniu <contacto@kliniu.com>",
      to: user.email,
      subject: "Confirma tu correo en Kliniu",
      text: [
        // Sin el nombre: lo escribe quien se registra y este correo va a una dirección
        // aún sin verificar, así que serviría para mandar texto ajeno con remitente Kliniu.
        "Hola,",
        "",
        "Confirma que este correo es tuyo para terminar de activar tu cuenta Kliniu.",
        "Este enlace es válido por 24 horas:",
        "",
        verifyUrl,
        "",
        "Si no creaste esta cuenta, puedes ignorar este correo.",
      ].join("\n"),
    });

    if (error) {
      console.error("No se pudo enviar el correo de verificación:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("No se pudo enviar el correo de verificación:", error);
    return false;
  }
}
