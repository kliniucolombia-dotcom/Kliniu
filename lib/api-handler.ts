/**
 * Envuelve un handler de route.ts: cualquier excepción no manejada se traduce a
 * una respuesta JSON con el status correcto y mensaje genérico (sin filtrar `e.message`).
 *
 *   export const POST = apiHandler(async (request: Request) => { ... });
 */
type Handler<A extends unknown[]> = (...args: A) => Promise<Response> | Response;

function errorCode(e: unknown): string | undefined {
  return e && typeof e === "object" && "code" in e && typeof e.code === "string" ? e.code : undefined;
}

export function apiErrorResponse(e: unknown, label = "api"): Response {
  // redirect()/notFound() de Next se implementan lanzando: no son errores.
  const digest = e && typeof e === "object" && "digest" in e ? String(e.digest) : "";
  if (digest.startsWith("NEXT_")) throw e;

  const msg = e instanceof Error ? e.message : "";
  if (msg === "UNAUTHORIZED") return Response.json({ error: "No autorizado" }, { status: 401 });
  if (msg === "FORBIDDEN") return Response.json({ error: "No autorizado" }, { status: 403 });
  if (e instanceof SyntaxError) return Response.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 });
  const code = errorCode(e);
  if (code === "P2025") return Response.json({ error: "Registro no encontrado" }, { status: 404 });
  if (code === "P2002") return Response.json({ error: "Ya existe un registro con esos datos" }, { status: 409 });
  if (code === "P1001" || code === "P1002" || code === "P1017") {
    return Response.json({ error: "Base de datos no disponible" }, { status: 503 });
  }

  console.error(`[${label}]`, e);
  return Response.json({ error: "Error interno" }, { status: 500 });
}

export function apiHandler<A extends unknown[]>(fn: Handler<A>, label?: string) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      return apiErrorResponse(e, label);
    }
  };
}
