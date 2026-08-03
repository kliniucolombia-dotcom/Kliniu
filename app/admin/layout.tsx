import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Administración",
};

const ALLOWED_ROLES = ["ADMIN", "SELLER", "SUPERADMIN"];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookies();

  if (!session || !ALLOWED_ROLES.includes(session.role)) {
    redirect("/login?next=/admin");
  }

  return children;
}
