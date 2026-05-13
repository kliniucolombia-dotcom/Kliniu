import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { getOrdersForUser } from "@/lib/orders";
import { getUserById } from "@/lib/users";
import AccountProfileForm from "./profile-form";

export const dynamic = "force-dynamic";

export default async function MiCuentaPage() {
  const session = await getSessionFromCookies();

  if (!session) {
    redirect("/login");
  }

  const user = await getUserById(session.userId);

  if (!user) {
    redirect("/login");
  }

  const orders = await getOrdersForUser(session.userId);

  return <AccountProfileForm user={user} orders={orders} />;
}
