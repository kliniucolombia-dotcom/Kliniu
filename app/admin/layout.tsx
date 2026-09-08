import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { getUserById } from "@/lib/users";
import { isSuperAdmin } from "@/lib/roles";
import { getEffectivePermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Administración",
};

const ALLOWED_ROLES = ["ADMIN", "SELLER", "SUPERADMIN"];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookies();

  if (!session || !ALLOWED_ROLES.includes(session.role)) {
    redirect("/login?next=/admin");
  }

  const user = await getUserById(session.userId);
  if (!user) redirect("/login?next=/admin");

  // El rol base solo abre la puerta; si a este usuario le bajaron el
  // permiso puntual de MODULE_PRODUCTOS, eso pesa más que su rol.
  if (!isSuperAdmin(user)) {
    const perm = await getEffectivePermission(user, "MODULE_PRODUCTOS");
    if (!perm.canView) redirect("/panel");
  }

  return children;
}
