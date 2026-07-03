import { requireAdminUser } from "@/lib/admin";
import { retryFailedJobs } from "@/lib/kommo";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    await requireAdminUser();
    await retryFailedJobs();
    return Response.json({ ok: true, message: "Reintentos procesados." });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    await requireAdminUser();
    if (!prisma) return Response.json({ logs: [] });

    const logs = await prisma.kommoSyncLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        entityType: true,
        entityId: true,
        kommoId: true,
        status: true,
        operation: true,
        error: true,
        retries: true,
        lastAttempt: true,
        syncedAt: true,
        createdAt: true,
      },
    });

    return Response.json({ logs });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
