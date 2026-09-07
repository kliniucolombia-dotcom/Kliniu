import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type UserRole } from "../generated/prisma/client.ts";
import { hash } from "bcryptjs";

// Contraseña temporal por env para no versionarla:
//   OPERACIONES_TEMP_PASSWORD='...' npx tsx scripts/create-operaciones-users.ts
const TEMP_PASSWORD = process.env.OPERACIONES_TEMP_PASSWORD;

const USERS: Array<{ fullName: string; email: string; role: UserRole; department: string }> = [
  { fullName: "Maureen Blandon", email: "direcciondeoperaciones@kliniu.com", role: "DIRECTOR_OPERACIONES", department: "Operaciones" },
  { fullName: "Cristian Beltrán", email: "jefeoperaciones@kliniu.com", role: "JEFE_OPERACIONES", department: "Operaciones" },
  { fullName: "Daniela Martínez", email: "logistica@kliniu.com", role: "LOGISTICA", department: "Logística" },
  { fullName: "Helver Díaz", email: "ensamble@kliniu.com", role: "LIDER_ENSAMBLE", department: "Ensamble" },
  { fullName: "Wilmar Pulido", email: "bodegaensamble@kliniu.com", role: "BODEGA", department: "Ensamble" },
  { fullName: "Esteban Arcila", email: "despacho@kliniu.com", role: "BODEGA", department: "Despachos" },
  { fullName: "Julian Pintor", email: "inyeccion@kliniu.com", role: "LIDER_INYECCION", department: "Inyección" },
  { fullName: "Kevin Pedraza", email: "bodegainyeccion@kliniu.com", role: "BODEGA", department: "Inyección" },
  { fullName: "Jairo Aldana", email: "bodegainyeccion.respaldo@kliniu.com", role: "BODEGA", department: "Inyección" },
  { fullName: "Enrique Moreno", email: "mantenimiento@kliniu.com", role: "MANTENIMIENTO", department: "Mantenimiento" },
  { fullName: "Osvaldo", email: "mantenimiento.respaldo@kliniu.com", role: "MANTENIMIENTO", department: "Mantenimiento" },
];

// Andrea ya existe como EMPLOYEE (portal RRHH). Respalda logística vía override, sin tocar su rol.
const ANDREA_EMAIL = "andrea.herrera16@kliniu-test.com";

async function main() {
  if (!TEMP_PASSWORD) {
    console.error("Falta OPERACIONES_TEMP_PASSWORD en el entorno.");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });
  const passwordHash = await hash(TEMP_PASSWORD, 10);

  for (const u of USERS) {
    const existing = await prisma.user.findUnique({ where: { email: u.email }, select: { id: true, role: true } });
    if (existing) {
      console.log(`Ya existe: ${u.email} (${existing.role})`);
      continue;
    }
    const created = await prisma.user.create({
      data: { ...u, passwordHash, status: "ACTIVE" },
      select: { email: true, role: true },
    });
    console.log(`Creado: ${created.email} -> ${created.role}`);
  }

  const andrea = await prisma.user.findUnique({ where: { email: ANDREA_EMAIL }, select: { id: true } });
  if (andrea) {
    for (const [module, perm] of [
      ["MODULE_LOGISTICA", { canView: true, canCreate: true, canEdit: true, canDelete: true }],
      ["MODULE_PEDIDOS", { canView: true, canCreate: false, canEdit: false, canDelete: false }],
    ] as const) {
      await prisma.userPermission.upsert({
        where: { userId_module: { userId: andrea.id, module } },
        update: perm,
        create: { userId: andrea.id, module, ...perm },
      });
    }
    console.log(`Override logística aplicado a ${ANDREA_EMAIL}`);
  } else {
    console.log(`Andrea no encontrada (${ANDREA_EMAIL}), sin override`);
  }

  await prisma.$disconnect();
}

main();
