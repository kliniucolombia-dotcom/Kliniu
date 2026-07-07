import { getSessionFromCookies } from "@/lib/auth";
import { getUserById } from "@/lib/users";
import { isAdmin } from "@/lib/roles";

export async function requireAdminUser() {
  const session = await getSessionFromCookies();

  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  const user = await getUserById(session.userId);

  if (!user || !isAdmin(user)) {
    throw new Error("FORBIDDEN");
  }

  return user;
}

export async function requireAdminOrSeller() {
  const session = await getSessionFromCookies();

  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  const user = await getUserById(session.userId);

  if (!user || (user.role !== "SELLER" && !isAdmin(user))) {
    throw new Error("FORBIDDEN");
  }

  return user;
}
