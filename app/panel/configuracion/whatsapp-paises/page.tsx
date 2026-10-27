import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { getUserById } from "@/lib/users";
import { isSuperAdmin } from "@/lib/roles";
import { getCountryWhatsapp } from "@/lib/country-whatsapp";
import WhatsappPaisesClient from "./whatsapp-paises-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "WhatsApp por país — Panel Comercial" };

export default async function WhatsappPaisesPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login?next=/panel/configuracion/whatsapp-paises");

  const user = await getUserById(session.userId);
  if (!user || !isSuperAdmin(user)) redirect("/panel/sin-acceso");

  return <WhatsappPaisesClient initial={await getCountryWhatsapp()} />;
}
