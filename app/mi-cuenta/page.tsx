import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { getOrdersForUser } from "@/lib/orders";
import { getUserById } from "@/lib/users";
import { getPanelLandingPath } from "@/lib/permissions";
import AccountProfileForm from "./profile-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mi cuenta",
};

// Mismo mapeo de roles que /api/auth/login: /mi-cuenta es solo para CUSTOMER,
// cualquier otro rol de staff se manda a su panel correspondiente.
const PANEL_ROLES = ["SELLER", "RRHH", "BODEGA", "DISENO", "MARKETING", "JEFE_VENTAS", "TESORERIA", "INGENIERIA"];

export default async function MiCuentaPage() {
  const session = await getSessionFromCookies();

  if (!session) {
    redirect("/login");
  }

  const user = await getUserById(session.userId);

  if (!user) {
    redirect("/login");
  }

  if (user.role === "ADMIN") redirect("/admin");
  if (user.role === "SUPERADMIN") redirect("/panel");
  if (user.role === "PACKING") redirect("/empaque");
  if (user.role === "EMPLOYEE") redirect("/empleado");
  if (PANEL_ROLES.includes(user.role)) redirect(await getPanelLandingPath(user));

  const orders = await getOrdersForUser(session.userId);

  return <AccountProfileForm user={user} orders={orders} />;
}
