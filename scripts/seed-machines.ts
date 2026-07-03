import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

loadEnv({ path: ".env.local" });
loadEnv();

const MACHINES = [
  { code: 1, name: "Inyectora 1", brand: "WELLTEC" },
  { code: 2, name: "Inyectora 2", brand: "APEM" },
  { code: 3, name: "Inyectora 3", brand: "GREENST" },
  { code: 4, name: "Inyectora 4", brand: "HENGDA" },
  { code: 5, name: "Inyectora 5", brand: "HAIJING" },
  { code: 6, name: "Prensa (cauchos)", brand: "PRENSA (CAUCHOS)" },
];

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  for (const m of MACHINES) {
    const machine = await prisma.machine.upsert({
      where: { code: m.code },
      update: { name: m.name, brand: m.brand },
      create: m,
    });
    console.log("OK:", machine.code, machine.name, machine.brand);
  }

  await prisma.$disconnect();
}

main();
