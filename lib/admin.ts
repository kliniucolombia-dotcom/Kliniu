import { getSessionFromCookies } from "@/lib/auth";
import { getUserById } from "@/lib/users";

export async function requireAdminUser() {
  const session = await getSessionFromCookies();

  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  const user = await getUserById(session.userId);

  if (!user || user.role !== "ADMIN") {
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

  if (!user || (user.role !== "ADMIN" && user.role !== "SELLER")) {
    throw new Error("FORBIDDEN");
  }

  return user;
}
