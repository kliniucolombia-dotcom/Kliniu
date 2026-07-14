import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";
import { hash } from "bcryptjs";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const passwordHash = await hash("RrhhKliniu2026!", 10);

  try {
    const user = await prisma.user.create({
      data: { fullName: "RRHH Test", email: "rrhh.test@kliniu.com", passwordHash, role: "RRHH" },
      select: { id: true, email: true, role: true, fullName: true }
    });
    console.log("Creado:", JSON.stringify(user, null, 2));
  } catch (e: any) {
    if (e.code === "P2002") {
      const user = await prisma.user.findUnique({ where: { email: "rrhh.test@kliniu.com" }, select: { id: true, email: true, role: true } });
      console.log("Ya existe:", JSON.stringify(user, null, 2));
    } else {
      console.error(e.message);
    }
  }

  await prisma.$disconnect();
}

main();
