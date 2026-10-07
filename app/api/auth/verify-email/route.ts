import { NextResponse } from "next/server";
import { getSessionFromCookies, readEmailVerificationToken } from "@/lib/auth";
import { getUserById, markEmailVerified } from "@/lib/users";
import { sendVerificationEmail } from "@/lib/email-verification";
import { checkRateLimit } from "@/lib/rate-limit";

// Enlace del correo: confirma y vuelve a Mi cuenta con el resultado.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim() || "";
  let verified = false;

  try {
    const payload = await readEmailVerificationToken(token);
    verified = await markEmailVerified(payload.userId, payload.email);
  } catch {
    verified = false;
  }

  return NextResponse.redirect(new URL(`/mi-cuenta?verificado=${verified ? "1" : "0"}`, url.origin));
}

// Reenvía el enlace al usuario con sesión.
export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return Response.json({ error: "No autorizado." }, { status: 401 });
    }

    const user = await getUserById(session.userId);
    if (!user || user.status !== "ACTIVE") {
      return Response.json({ error: "No autorizado." }, { status: 401 });
    }

    if (user.emailVerifiedAt) {
      return Response.json({ message: "Tu correo ya está confirmado." });
    }

    if (!(await checkRateLimit(`verify-email:${user.id}`, 3, 15 * 60 * 1000))) {
      return Response.json(
        { error: "Ya te enviamos el enlace varias veces. Espera unos minutos e intenta de nuevo." },
        { status: 429 },
      );
    }

    const sent = await sendVerificationEmail(user, request);
    if (!sent) {
      return Response.json({ error: "No pudimos enviar el correo. Intenta más tarde." }, { status: 502 });
    }

    return Response.json({ message: `Te enviamos el enlace a ${user.email}.` });
  } catch (error) {
    console.error("Error en verify-email:", error);
    return Response.json({ error: "No fue posible reenviar el enlace." }, { status: 500 });
  }
}
