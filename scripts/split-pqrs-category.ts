import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

loadEnv({ path: ".env.local" });
loadEnv();

const OLD_NAME = "PQRS Diseño y Venta";
const TARGETS = [
  { name: "PQRS Diseño", department: "Diseño" },
  { name: "PQRS Venta", department: "Ventas" },
];

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const old = await prisma.requestCategory.findUnique({ where: { name: OLD_NAME } });
  if (!old) {
    console.log(`Categoría "${OLD_NAME}" no encontrada. Nada que hacer.`);
    await prisma.$disconnect();
    return;
  }

  const departments = await prisma.department.findMany({ select: { id: true, name: true } });
  const deptByName = new Map(departments.map((d) => [d.name, d.id]));

  for (const target of TARGETS) {
    const deptId = deptByName.get(target.department);
    const allowedDepartmentIds = old.allowedDepartmentIds.filter((id) => id === deptId);

    const result = await prisma.requestCategory.upsert({
      where: { name: target.name },
      update: {
        allowedDepartmentIds,
        defaultResponsibleId: old.defaultResponsibleId,
        active: true,
      },
      create: {
        name: target.name,
        icon: old.icon,
        allowedDepartmentIds,
        defaultResponsibleId: old.defaultResponsibleId,
        active: true,
      },
    });
    console.log(`OK: ${result.name} -> departamentos [${allowedDepartmentIds.join(", ") || "todos"}]`);
  }

  await prisma.requestCategory.update({ where: { id: old.id }, data: { active: false } });
  console.log(`Categoría "${OLD_NAME}" desactivada (los tickets históricos se conservan).`);

  await prisma.$disconnect();
}

main();
