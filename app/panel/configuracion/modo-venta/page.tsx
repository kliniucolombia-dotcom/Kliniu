import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { getUserById } from "@/lib/users";
import { isSuperAdmin } from "@/lib/roles";
import { getSaleMode } from "@/lib/sale-mode";
import ModoVentaClient from "./modo-venta-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Modo de Venta — Panel Comercial" };

export default async function ModoVentaPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login?next=/panel/configuracion/modo-venta");

  const user = await getUserById(session.userId);
  if (!user || !isSuperAdmin(user)) redirect("/panel/sin-acceso");

  const mode = await getSaleMode();

  return <ModoVentaClient initialMode={mode} />;
}
