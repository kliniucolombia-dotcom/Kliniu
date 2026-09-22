import { clearSessionCookie } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST() {
  await clearSessionCookie();
  const response = NextResponse.json({ message: "Sesión cerrada correctamente." });
  response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  // Sin Clear-Site-Data: Chrome no resuelve el fetch hasta purgar toda la caché del
  // origen, y solo purgaba assets estáticos no sensibles. Las vistas protegidas ya
  // van con no-store desde proxy.ts y el bfcache lo cubre AuthHistoryGuard.
  return response;
}
