import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const DESTINATARIOS = ["ventas@kliniu.com", "david.avila@kliniu.com"];

export async function POST(request: Request) {
  const { nombre, email, empresa, pais, consulta } = await request.json();

  if (!nombre || !email || !consulta) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
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
