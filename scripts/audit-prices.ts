const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";

function roundPrice(price: number): number {
  if (!price || price <= 0) return price;
  const last3 = price % 1000;
  if (last3 === 0 || last3 === 999) return price;
  if (last3 < 500) return price - last3;
  return price - last3 + 999;
}

async function mgmt(path: string) {
  const res = await fetch(`https://api.supabase.com/v1${path}`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });
  if (!res.ok) throw new Error(`mgmt ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  // Get projects
  const projects = await mgmt("/projects") as Array<{ id: string; name: string; ref: string }>;
  console.log("Proyectos encontrados:");
  for (const p of projects) console.log(`  - ${p.ref}: ${p.name}`);

  // Use first project (or find kliniu)
  const project = projects.find((p) => p.name.toLowerCase().includes("kliniu")) ?? projects[0];
  console.log(`\nUsando: ${project.ref} (${project.name})`);

  // Get service role key
  const keys = await mgmt(`/projects/${project.ref}/api-keys`) as Array<{ name: string; api_key: string }>;
  const serviceKey = keys.find((k) => k.name === "service_role")?.api_key;
  if (!serviceKey) throw new Error("No service_role key found");

  const SUPABASE_URL = `https://${project.ref}.supabase.co`;

  // Query products
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/Product?select=id,slug,name,price,previousPrice,active&order=price.asc&limit=1000`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    }
  );
  if (!res.ok) throw new Error(`products → ${res.status}: ${await res.text()}`);

  const products = await res.json() as Array<{
    id: string; slug: string; name: string;
    price: number; previousPrice: number | null; active: boolean;
  }>;

  console.log(`\nTotal productos: ${products.length}\n`);

  const toUpdate: { id: string; price: number; previousPrice: number | null }[] = [];
  const weird: { slug: string; razon: string }[] = [];

  for (const p of products) {
    const price = Number(p.price);
    const prevPrice = p.previousPrice != null ? Number(p.previousPrice) : null;
    const rounded = roundPrice(price);
    const prevRounded = prevPrice != null ? roundPrice(prevPrice) : null;
    const changed = rounded !== price || prevRounded !== prevPrice;

    const tag = changed ? "✏️ " : "✅ ";
    const priceStr = changed ? `${price} → ${rounded}` : `${price}`;
    const prevStr = prevPrice != null
      ? ` | prev: ${prevPrice}${prevRounded !== prevPrice ? ` → ${prevRounded}` : ""}`
      : "";

    console.log(`${tag}[${p.active ? "activo" : "inactivo"}] ${p.slug}`);
    console.log(`    ${p.name} | precio: ${priceStr}${prevStr}`);

    if (!price || price <= 0) {
      weird.push({ slug: p.slug, razon: "precio 0 o inválido" });
    } else if (prevPrice != null && prevPrice <= price) {
      weird.push({ slug: p.slug, razon: `precioAnterior (${prevPrice}) ≤ precio (${price})` });
    }

    if (changed) toUpdate.push({ id: p.id, price: rounded, previousPrice: prevRounded });
  }

  console.log(`\n--- RESUMEN ---`);
  console.log(`Sin cambio:       ${products.length - toUpdate.length}`);
  console.log(`Requieren cambio: ${toUpdate.length}`);
  console.log(`Raros/alertas:    ${weird.length}`);

  if (weird.length > 0) {
    console.log("\n⚠️  RAROS:");
    for (const w of weird) console.log(`  - ${w.slug}: ${w.razon}`);
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
