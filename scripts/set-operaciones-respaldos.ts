import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

// Respaldos tal cual el organigrama de Operaciones: [titular, quién lo cubre]
const BACKUPS: Array<[string, string]> = [
  ["logistica@kliniu.com", "andrea.herrera16@kliniu-test.com"],
  ["ensamble@kliniu.com", "jefeoperaciones@kliniu.com"],
  ["jefeoperaciones@kliniu.com", "despacho@kliniu.com"],
  ["inyeccion@kliniu.com", "bodegainyeccion@kliniu.com"],
  ["mantenimiento@kliniu.com", "mantenimiento.respaldo@kliniu.com"],
  ["bodegainyeccion@kliniu.com", "bodegainyeccion.respaldo@kliniu.com"],
  ["bodegaensamble@kliniu.com", "despacho@kliniu.com"],
  ["despacho@kliniu.com", "bodegaensamble@kliniu.com"],
];

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  for (const [holderEmail, backupEmail] of BACKUPS) {
    const [holder, backup] = await Promise.all([
      prisma.user.findUnique({ where: { email: holderEmail }, select: { id: true, fullName: true } }),
      prisma.user.findUnique({ where: { email: backupEmail }, select: { id: true, fullName: true } }),
    ]);
    if (!holder || !backup) {
      console.log(`Falta cuenta: ${holderEmail} <- ${backupEmail}`);
      continue;
    }
    await prisma.user.update({ where: { id: holder.id }, data: { backupUserId: backup.id } });
    console.log(`${holder.fullName} <- respaldo: ${backup.fullName}`);
  }

  await prisma.$disconnect();
}

main();
