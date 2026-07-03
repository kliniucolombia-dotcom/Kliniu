import type { UserRole } from "@/generated/prisma/client";

type RoleHolder = { role: UserRole };

export function isSuperAdmin(user: RoleHolder): boolean {
  return user.role === "SUPERADMIN";
}

export function isAdmin(user: RoleHolder): boolean {
  return user.role === "ADMIN" || isSuperAdmin(user);
}

export function isStaff(user: RoleHolder): boolean {
  return (
    user.role === "ADMIN" ||
    user.role === "SELLER" ||
    user.role === "PACKING" ||
    isSuperAdmin(user)
  );
}
