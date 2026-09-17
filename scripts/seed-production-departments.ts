import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";
import { DOC_DEPARTMENTS } from "../lib/production-departments.ts";

loadEnv({ path: ".env.local" });
loadEnv();

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  for (const dept of DOC_DEPARTMENTS) {
    const existing = await prisma.productionDepartment.findFirst({
      where: { OR: [{ code: dept.code }, { name: dept.name }] },
    });

    if (existing) {
      await prisma.productionDepartment.update({
        where: { id: existing.id },
        data: {
          name: dept.name,
          code: dept.code,
          description: dept.description || null,
          area: dept.area,
          isActive: true,
        },
      });
      console.log(`Actualizado: ${dept.code} · ${dept.name}`);
      continue;
    }

    await prisma.productionDepartment.create({
      data: {
        name: dept.name,
        code: dept.code,
        description: dept.description || null,
        area: dept.area,
        isActive: true,
      },
    });
    console.log(`Creado: ${dept.code} · ${dept.name}`);
  }

  await prisma.$disconnect();
}

main();
