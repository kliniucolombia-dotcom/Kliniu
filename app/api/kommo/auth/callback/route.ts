import { exchangeCodeForTokens } from "@/lib/kommo";
import { requireAdminUser } from "@/lib/admin";

export async function GET(request: Request) {
  try {
    await requireAdminUser();

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      return Response.json({ error: `Kommo OAuth error: ${error}` }, { status: 400 });
    }

    if (!code) {
      return Response.json({ error: "Código OAuth no recibido." }, { status: 400 });
    }

    await exchangeCodeForTokens(code);

    return Response.json({ ok: true, message: "Kommo conectado correctamente." });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("[kommo:auth:callback]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
