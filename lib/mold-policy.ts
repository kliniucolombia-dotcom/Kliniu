import type { MoldStatus } from "@/generated/prisma/client";

export function assertDirectMoldStatusChange(current: MoldStatus, next: MoldStatus, hasOpenMount: boolean): void {
  if (next === "IN_USE") throw new Error("MOUNT_REQUIRED");
  if (hasOpenMount || current === "IN_USE") throw new Error("MOLD_MOUNTED");
}
