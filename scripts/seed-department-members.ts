import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";
import { DOC_DEPARTMENTS } from "../lib/production-departments.ts";

loadEnv({ path: ".env.local" });
loadEnv();

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  const userIdByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u.id]));

  let linked = 0;
  let unlinked = 0;

  for (const doc of DOC_DEPARTMENTS) {
    const department = await prisma.productionDepartment.upsert({
      where: { code: doc.code },
      update: {},
      create: {
        name: doc.name,
        code: doc.code,
        description: doc.description,
        area: doc.area,
        isActive: true,
      },
    });

    const existing = await prisma.departmentMember.count({ where: { departmentId: department.id } });
    if (existing > 0) {
      console.log(`· ${doc.code}: ya tiene ${existing} miembro(s), se omite`);
      continue;
    }

    for (const [index, member] of doc.members.entries()) {
      const userId = userIdByEmail.get(member.email.toLowerCase()) ?? null;
      if (userId) linked++;
      else unlinked++;
      await prisma.departmentMember.create({
        data: {
          departmentId: department.id,
          userId,
          name: member.name,
          email: member.email.toLowerCase(),
          title: member.title,
          kind: member.kind === "backup" ? "BACKUP" : "HOLDER",
          order: index,
        },
      });
    }
    console.log(`Migrado: ${doc.code} · ${doc.members.length} miembro(s)`);
  }

  console.log(`\nTotal: ${linked} vinculados a cuenta, ${unlinked} sin cuenta (texto libre).`);
  await prisma.$disconnect();
}

main();
