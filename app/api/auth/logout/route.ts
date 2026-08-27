import { clearSessionCookie } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST() {
  await clearSessionCookie();
  const response = NextResponse.json({ message: "Sesión cerrada correctamente." });
  response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  response.headers.set("Clear-Site-Data", '"cache"');
  return response;
}
