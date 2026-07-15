import { getSessionFromCookies } from "@/lib/auth";
import { getUserById } from "@/lib/users";
import { getPanelLandingPath } from "@/lib/permissions";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return Response.json({ error: "No autorizado" }, { status: 401 });

  const user = await getUserById(session.userId);
  if (!user || user.status !== "ACTIVE") {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const path = await getPanelLandingPath(user);
  return Response.json({ path });
}
