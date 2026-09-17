import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

loadEnv({ path: ".env.local" });
loadEnv();

// Corridas de prueba para previsualizar /panel/produccion. Se identifican por
// su N° de orden dentro de [FIRST_ORDER, FIRST_ORDER + TOTAL), así el script es
// idempotente y `--clean` las puede borrar sin tocar datos reales.
const FIRST_ORDER = 1700;
const TOTAL = 48;
const RUNS_PER_DAY = 3;

const PARTS = [
  { name: "Tapa 500 ml", material: "PP Negro – 25 kg", injection: 35.5, piece: 5.2, temp: 190 },
  { name: "Cuerpo 500 ml", material: "PP Blanco – 25 kg", injection: 48, piece: 12.4, temp: 205 },
  { name: "Válvula", material: "PEAD Natural – 20 kg", injection: 12.3, piece: 2.1, temp: 175 },
  { name: "Tapa 800 ml", material: "PP Azul – 25 kg", injection: 42, piece: 6.8, temp: 198 },
  { name: "Cuerpo 800 ml", material: "PP Blanco – 25 kg", injection: 61, piece: 18.9, temp: 210 },
];

function makeRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function bogotaToday() {
  const now = new Date(Date.now() - 5 * 3600 * 1000);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function dateOnly(base: Date, offsetDays: number) {
  return new Date(base.getTime() - offsetDays * 86400000).toISOString().slice(0, 10);
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const orderNumbers = Array.from({ length: TOTAL }, (_, i) => String(FIRST_ORDER + i));

  const removed = await prisma.productionRun.deleteMany({ where: { orderNumber: { in: orderNumbers } } });
  console.log(`Limpiadas ${removed.count} corridas de prueba previas.`);

  if (process.argv.includes("--clean")) {
    await prisma.$disconnect();
    return;
  }

  const machines = await prisma.machine.findMany({ where: { code: { in: [1, 2, 3] } }, orderBy: { code: "asc" } });
  const operators = await prisma.user.findMany({
    where: { role: { in: ["LIDER_INYECCION", "LIDER_ENSAMBLE"] }, status: "ACTIVE" },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true },
  });

  if (machines.length === 0) throw new Error("No hay máquinas con code 1, 2 o 3. Corre scripts/seed-machines.ts");
  if (operators.length === 0) throw new Error("No hay operarios LIDER_INYECCION/LIDER_ENSAMBLE activos.");

  const random = makeRandom(20260917);
  const base = bogotaToday();

  for (let i = 0; i < TOTAL; i++) {
    const machine = machines[i % machines.length];
    const operator = operators[i % operators.length];
    const part = PARTS[i % PARTS.length];

    const dayOffset = Math.floor(i / RUNS_PER_DAY);
    const date = dateOnly(base, dayOffset);
    const startHour = 6 + (i % RUNS_PER_DAY) * 2;
    const endHour = startHour + 7 + Math.floor(random() * 2);

    // Producidas coherentes con el ciclo y el tiempo transcurrido, para que la
    // eficiencia (producidas / esperadas) quede en un rango realista.
    const cycle = 28 + Math.floor(random() * 20);
    const durationSeconds = (endHour - startHour) * 3600;
    const expectedPieces = Math.floor(durationSeconds / cycle);
    const efficiencyFactor = 0.78 + random() * 0.28; // 78% – 106%
    const produced = Math.max(Math.round(expectedPieces * efficiencyFactor), 1);
    const damaged = Math.floor(produced * random() * 0.02);
    const nonConforming = Math.floor(produced * random() * 0.01);
    const couplingDone = random() > 0.25;
    const couplingTime = couplingDone ? `${String(startHour + 3).padStart(2, "0")}:${random() > 0.5 ? "30" : "00"}` : null;
    const useZones = i % 4 === 0;

    await prisma.productionRun.create({
      data: {
        machineId: machine.id,
        operatorId: operator.id,
        productId: null,
        manualProductName: part.name,
        orderNumber: String(FIRST_ORDER + i),
        productionDate: new Date(`${date}T00:00:00.000Z`),
        startTime: new Date(`${date}T${String(startHour).padStart(2, "0")}:00:00.000Z`),
        endTime: new Date(`${date}T${String(endHour).padStart(2, "0")}:00:00.000Z`),
        material: part.material,
        pigmentQuantity: i % 3 === 0 ? 120 + Math.floor(random() * 60) : null,
        pigmentColor: i % 3 === 0 ? ["Negro", "Blanco", "Azul"][i % 3] : null,
        injectionWeight: part.injection,
        pieceWeight: part.piece,
        cycle,
        cycleUnit: "seconds",
        temperature: useZones ? 0 : part.temp + Math.floor(random() * 6) - 3,
        temperatureType: useZones ? "zones" : "simple",
        temperatureZones: useZones
          ? [
              { label: "A", value: part.temp - 20 },
              { label: "B", value: part.temp - 10 },
              { label: "C", value: part.temp },
            ]
          : [],
        produced,
        damaged,
        nonConforming,
        couplingStatus: couplingDone ? "completed" : "na",
        couplingTime,
        couplingTest: couplingDone ? couplingTime ?? "Realizada" : "N/A",
        observations: i % 7 === 0 ? "Ajuste de molde al inicio del turno. Sin novedades en el resto de la corrida." : null,
      },
    });
  }

  console.log(`Creadas ${TOTAL} corridas de prueba (órdenes ${FIRST_ORDER}–${FIRST_ORDER + TOTAL - 1}).`);
  console.log("Para borrarlas: npx tsx scripts/seed-production-runs.ts --clean");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
