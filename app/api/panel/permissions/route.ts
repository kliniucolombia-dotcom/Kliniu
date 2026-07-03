import { getSessionFromCookies } from "@/lib/auth";
import { getUserById } from "@/lib/users";
import { getEffectivePermissions } from "@/lib/permissions";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return Response.json({ error: "No autorizado" }, { status: 401 });

  const user = await getUserById(session.userId);
  if (!user || user.status !== "ACTIVE") {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const permissions = await getEffectivePermissions(user);
  return Response.json({ role: user.role, permissions });
}
