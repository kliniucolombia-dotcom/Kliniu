import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { getUserById } from "@/lib/users";
import { isSuperAdmin } from "@/lib/roles";
import BitacoraClient from "./bitacora-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bitácora — Panel Comercial" };

export default async function BitacoraPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login?next=/panel/bitacora");

  const user = await getUserById(session.userId);
  if (!user || !isSuperAdmin(user)) redirect("/panel/sin-acceso");

  return <BitacoraClient />;
}
