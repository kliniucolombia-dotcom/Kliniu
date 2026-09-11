import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

type EmailPayload = {
  id: string;
  type: string;
  category: string;
  title: string;
  detail: string;
  severity: string;
  targetRoles: string[];
};

const SEVERITY_LABEL: Record<string, string> = {
  info: "ℹ️ Informativo",
  warning: "⚠️ Advertencia",
  urgent: "🔴 Urgente",
};

const TYPE_LABEL: Record<string, string> = {
  order: "Pedido",
  quotation: "Cotización",
  ticket: "Solicitud",
  hr: "Recursos Humanos",
  production: "Producción",
  inventory: "Inventario",
  logistics: "Logística",
  maintenance: "Mantenimiento",
  user: "Usuario",
  campaign: "Campaña",
  announcement: "Comunicado",
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildEmailHtml(n: EmailPayload): string {
  const sevLabel = SEVERITY_LABEL[n.severity] ?? n.severity;
  const typeLabel = TYPE_LABEL[n.type] ?? n.type;
  const panelUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://kliniu.com";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F4F6F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;">
    <div style="background:#27B1B8;padding:20px 24px;">
      <h1 style="margin:0;color:#fff;font-size:16px;font-weight:700;">Kliniu — Panel Comercial</h1>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 8px;font-size:12px;color:#94A3B8;text-transform:uppercase;font-weight:600;">${sevLabel}</p>
      <h2 style="margin:0 0 12px;font-size:18px;color:#1A1A1A;font-weight:800;">${esc(n.title)}</h2>
      <p style="margin:0 0 8px;font-size:14px;color:#64748B;">${esc(n.detail)}</p>
      <p style="margin:0 0 20px;font-size:12px;color:#94A3B8;">${typeLabel}</p>
      <a href="${panelUrl}/panel/notificaciones" style="display:inline-block;background:#27B1B8;color:#fff;padding:10px 24px;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none;">Ver en el panel</a>
    </div>
    <div style="padding:16px 24px;border-top:1px solid #F1F5F9;">
      <p style="margin:0;font-size:11px;color:#94A3B8;">Este es un correo automático del sistema de notificaciones de Kliniu.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Envía email de notificación a todos los usuarios con los roles target que tengan email.
 * No lanza errores — los failures son non-blocking.
 */
export async function sendNotificationEmail(payload: EmailPayload) {
  if (!resend) return;
  if (!prisma) return;

  // Buscar usuarios con los roles target que tengan email
  const users = await prisma.user.findMany({
    where: {
      role: { in: payload.targetRoles as any[] },
      status: "ACTIVE",
      email: { not: "" },
    },
    select: { email: true, fullName: true },
  });

  if (users.length === 0) return;

  const emails = [...new Set(users.map((u) => u.email).filter(Boolean))] as string[];
  if (emails.length === 0) return;

  const from = process.env.NOTIFICATION_EMAIL_FROM ?? "Kliniu <notificaciones@kliniu.com>";

  await resend.emails.send({
    from,
    to: emails,
    subject: `[Kliniu] ${payload.title}`,
    html: buildEmailHtml(payload),
  });
}
