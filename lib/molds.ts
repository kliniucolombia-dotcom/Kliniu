import { prisma } from "@/lib/prisma";
import type { MoldStatus } from "@/generated/prisma/client";
import { parseBogotaDate } from "@/lib/logistics";

function requirePrisma() {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  return prisma;
}

function endOfBogotaDay(value: string): Date {
  return new Date(`${value}T23:59:59.999-05:00`);
}

export async function listMolds() {
  return requirePrisma().mold.findMany({
    orderBy: [{ status: "asc" }, { code: "asc" }],
    include: { _count: { select: { changes: true } } },
  });
}

export async function createMold(data: { code: string; name: string }) {
  return requirePrisma().mold.create({
    data: { code: data.code.trim().toUpperCase(), name: data.name.trim() },
  });
}

export async function updateMold(id: string, data: { name?: string; status?: MoldStatus }) {
  return requirePrisma().mold.update({ where: { id }, data });
}

export async function listMoldChanges(from: string, to: string) {
  return requirePrisma().moldChange.findMany({
    where: { startedAt: { gte: parseBogotaDate(from), lte: endOfBogotaDay(to) } },
    orderBy: { startedAt: "desc" },
    include: {
      machine: { select: { id: true, code: true, name: true } },
      mold: { select: { id: true, code: true, name: true } },
      changedBy: { select: { fullName: true } },
    },
  });
}

// Un montaje abierto (sin finishedAt) por máquina: montar uno nuevo exige cerrar el anterior.
export async function startMoldChange(input: { machineId: string; moldId: string; notes?: string; userId: string }) {
  const db = requirePrisma();
  return db.$transaction(async (tx) => {
    const open = await tx.moldChange.findFirst({ where: { machineId: input.machineId, finishedAt: null } });
    if (open) throw new Error("MACHINE_BUSY");

    const mold = await tx.mold.findUniqueOrThrow({ where: { id: input.moldId }, select: { status: true } });
    if (mold.status !== "AVAILABLE") throw new Error("MOLD_NOT_AVAILABLE");

    const change = await tx.moldChange.create({
      data: { machineId: input.machineId, moldId: input.moldId, startedAt: new Date(), notes: input.notes?.trim() || null, changedById: input.userId },
    });
    await tx.mold.update({ where: { id: input.moldId }, data: { status: "IN_USE" } });
    return change;
  });
}

export async function finishMoldChange(id: string, notes?: string) {
  const db = requirePrisma();
  return db.$transaction(async (tx) => {
    const current = await tx.moldChange.findUniqueOrThrow({ where: { id } });
    if (current.finishedAt) throw new Error("ALREADY_FINISHED");
    const change = await tx.moldChange.update({
      where: { id },
      data: { finishedAt: new Date(), notes: notes?.trim() || current.notes },
    });
    await tx.mold.update({ where: { id: current.moldId }, data: { status: "AVAILABLE" } });
    return change;
  });
}

export async function getMoldKpis(from: string, to: string) {
  const db = requirePrisma();
  const range = { gte: parseBogotaDate(from), lte: endOfBogotaDay(to) };
  const [changes, openChanges, moldsInUse, moldsTotal] = await Promise.all([
    db.moldChange.findMany({
      where: { startedAt: range, finishedAt: { not: null } },
      select: { startedAt: true, finishedAt: true },
    }),
    db.moldChange.count({ where: { finishedAt: null } }),
    db.mold.count({ where: { status: "IN_USE" } }),
    db.mold.count(),
  ]);

  const durations = changes.map((c) => Math.round((c.finishedAt!.getTime() - c.startedAt.getTime()) / 60000));
  const totalMinutes = durations.reduce((a, b) => a + b, 0);

  return {
    changesCompleted: durations.length,
    avgChangeMinutes: durations.length ? Math.round(totalMinutes / durations.length) : 0,
    totalChangeMinutes: totalMinutes,
    openChanges,
    moldsInUse,
    moldsTotal,
  };
}
