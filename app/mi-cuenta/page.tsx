import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { getOrdersForUser } from "@/lib/orders";
import { getUserById } from "@/lib/users";
import { getPanelLandingPath } from "@/lib/permissions";
import { PANEL_ROLES } from "@/lib/permission-defaults";
import AccountProfileForm from "./profile-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mi cuenta",
};


export default async function MiCuentaPage() {
  const session = await getSessionFromCookies();

  if (!session) {
    redirect("/login");
  }

  const user = await getUserById(session.userId);

  if (!user) {
    // Cookie válida pero el usuario ya no existe: hay que limpiar la sesión antes
    // de mandar a /login, si no proxy.ts rebota de vuelta aquí en bucle.
    redirect("/api/auth/session-expired");
  }

  if (user.role === "ADMIN") redirect("/admin");
  if (user.role === "SUPERADMIN") redirect("/panel");
  if (user.role === "PACKING") redirect("/empaque");
  if (user.role === "EMPLOYEE") redirect("/empleado");
  if (PANEL_ROLES.includes(user.role)) redirect(await getPanelLandingPath(user));

  const orders = await getOrdersForUser(session.userId);

  return <AccountProfileForm user={user} orders={orders} />;
}
