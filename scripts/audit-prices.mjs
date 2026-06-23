import { PrismaClient } from "../generated/prisma/client.ts";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

function roundPrice(price) {
  if (!price || price <= 0) return price;
  const last3 = price % 1000;
  if (last3 === 0 || last3 === 999) return price;
  if (last3 < 500) return price - last3;
  return price - last3 + 999;
}

const products = await prisma.product.findMany({
  select: { id: true, slug: true, name: true, price: true, previousPrice: true, active: true },
  orderBy: { price: "asc" },
});

console.log(`Total productos: ${products.length}\n`);

const toUpdate = [];
const weird = [];

for (const p of products) {
  const rounded = roundPrice(p.price);
  const prevRounded = p.previousPrice ? roundPrice(p.previousPrice) : null;
  const changed = rounded !== p.price || prevRounded !== p.previousPrice;

  const tag = changed ? "✏️ " : "✅ ";
  const priceStr = changed ? `${p.price} → ${rounded}` : `${p.price}`;
  const prevStr = p.previousPrice ? ` | prev: ${p.previousPrice}${prevRounded !== p.previousPrice ? ` → ${prevRounded}` : ""}` : "";

  console.log(`${tag}[${p.active ? "activo" : "inactivo"}] ${p.slug}`);
  console.log(`    ${p.name} | precio: ${priceStr}${prevStr}`);

  if (!p.price || p.price <= 0) {
    weird.push({ slug: p.slug, razon: "precio 0 o inválido" });
  } else if (p.previousPrice && p.previousPrice <= p.price) {
    weird.push({ slug: p.slug, razon: `precioAnterior (${p.previousPrice}) ≤ precio (${p.price})` });
  }

  if (changed) {
    toUpdate.push({ id: p.id, price: rounded, previousPrice: prevRounded });
  }
}

console.log(`\n--- RESUMEN ---`);
console.log(`Sin cambio:       ${products.length - toUpdate.length}`);
console.log(`Requieren cambio: ${toUpdate.length}`);
console.log(`Raros/alertas:    ${weird.length}`);

if (weird.length > 0) {
  console.log("\n⚠️  RAROS:");
  for (const w of weird) console.log(`  - ${w.slug}: ${w.razon}`);
}

await prisma.$disconnect();
