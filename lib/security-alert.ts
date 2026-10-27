import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

// Avisa por correo a los SUPERADMIN activos. Nunca lanza: una alerta que falla
// no puede tumbar el login ni la acción que la disparó.
export async function sendSecurityAlert(subject: string, lines: string[]): Promise<void> {
  try {
    if (!prisma || !process.env.RESEND_API_KEY) return;
    const admins = await prisma.user.findMany({
      where: { role: "SUPERADMIN", status: "ACTIVE" },
      select: { email: true },
    });
    if (!admins.length) return;

    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: "Kliniu <contacto@kliniu.com>",
      to: admins.map((a) => a.email),
      subject: `Alerta de seguridad Kliniu: ${subject}`,
      text: [...lines, "", "Revisa la bitácora del panel. Si no reconoces esta actividad, cambia la clave de la cuenta y cierra las sesiones."].join("\n"),
    });
    if (error) console.error("SECURITY_ALERT_FAILED", error);
  } catch (error) {
    console.error("SECURITY_ALERT_FAILED", error);
  }
}

export function bogotaTime(date = new Date()): string {
  return date.toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "medium" });
}

// Avisa a la propia persona de que un administrador le cambió la contraseña o el correo.
// Nunca incluye la clave.
export async function notifyAccountChangedByAdmin(toEmail: string, what: "contraseña" | "correo"): Promise<void> {
  try {
    if (!process.env.RESEND_API_KEY) return;
    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: "Kliniu <contacto@kliniu.com>",
      to: toEmail,
      subject: `Tu ${what} de Kliniu fue cambiado`,
      text: [
        "Hola,",
        "",
        `Un administrador cambió el ${what === "correo" ? "correo" : "la contraseña"} de tu cuenta Kliniu el ${bogotaTime()} (hora de Bogotá).`,
        "Si no lo esperabas, avísale a tu jefe o a un administrador de inmediato.",
      ].join("\n"),
    });
    if (error) console.error("ACCOUNT_NOTICE_FAILED", error);
  } catch (error) {
    console.error("ACCOUNT_NOTICE_FAILED", error);
  }
}
