import { NextResponse } from "next/server";
import { Resend } from "resend";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const resend = new Resend(process.env.RESEND_API_KEY);

const DESTINATARIOS = ["ventas@kliniu.com", "david.avila@kliniu.com"];

export async function POST(request: Request) {
  if (!(await checkRateLimit(`contact:${getClientIp(request)}`, 5, 10 * 60 * 1000))) {
    return NextResponse.json(
      { error: "Demasiados mensajes seguidos. Espera unos minutos e intenta de nuevo." },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const field = (key: string, max: number) => {
    const value = body?.[key];
    return typeof value === "string" ? value.trim().slice(0, max) : "";
  };
  const nombre = field("nombre", 120);
  const email = field("email", 160);
  const empresa = field("empresa", 120);
  const pais = field("pais", 120);
  const consulta = field("consulta", 4000);

  if (!nombre || !email || !consulta) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Ingresa un correo electrónico válido." }, { status: 400 });
  }

  try {
    await resend.emails.send({
      from: "Kliniu Web <contacto@kliniu.com>",
      to: DESTINATARIOS[Math.floor(Math.random() * DESTINATARIOS.length)],
      replyTo: email,
      subject: "Consulta desde kliniu.com",
      text: [
        `Nombre: ${nombre}`,
        `Email: ${email}`,
        empresa ? `Empresa: ${empresa}` : "",
        pais ? `País: ${pais}` : "",
        "",
        "Consulta:",
        consulta,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error enviando correo de contacto:", error);
    return NextResponse.json({ error: "No se pudo enviar el mensaje" }, { status: 500 });
  }
}
