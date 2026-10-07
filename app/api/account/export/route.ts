import { getSessionFromCookies } from "@/lib/auth";
import { exportUserData } from "@/lib/users";
import { checkRateLimit } from "@/lib/rate-limit";

// Descarga de los datos personales del titular en JSON.
export async function GET() {
  try {
    const session = await getSessionFromCookies();

    if (!session) {
      return Response.json({ error: "No autorizado." }, { status: 401 });
    }

    if (!(await checkRateLimit(`export-account:${session.userId}`, 5, 15 * 60 * 1000))) {
      return Response.json(
        { error: "Demasiadas descargas seguidas. Espera unos minutos e intenta de nuevo." },
        { status: 429 },
      );
    }

    const data = await exportUserData(session.userId);

    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="mis-datos-kliniu.json"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return Response.json({ error: "No autorizado." }, { status: 401 });
    }
    console.error("Error exportando la cuenta:", error);
    return Response.json({ error: "No fue posible generar la descarga." }, { status: 500 });
  }
}
