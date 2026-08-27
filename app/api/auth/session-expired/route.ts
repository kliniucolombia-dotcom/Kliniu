import { clearSessionCookie } from "@/lib/auth";

// La cookie de sesión es un JWT válido, pero el usuario ya no existe en la base
// (borrado, o la consulta falló). Sin limpiar la cookie, proxy.ts rebota /login
// de vuelta a /mi-cuenta y se forma un bucle infinito de redirecciones.
export async function GET(request: Request) {
  await clearSessionCookie();
  return Response.redirect(new URL("/login", request.url), 302);
}
