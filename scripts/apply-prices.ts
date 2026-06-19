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
  const projects = await mgmt("/projects") as Array<{ ref: string; name: string }>;
  const project = projects.find((p) => p.name.toLowerCase().includes("kliniu")) ?? projects[0];
  const keys = await mgmt(`/projects/${project.ref}/api-keys`) as Array<{ name: string; api_key: string }>;
  const serviceKey = keys.find((k) => k.name === "service_role")?.api_key;
  if (!serviceKey) throw new Error("No service_role key");

  const BASE = `https://${project.ref}.supabase.co/rest/v1`;
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  };

  const res = await fetch(`${BASE}/Product?select=id,slug,price,previousPrice&limit=1000`, { headers });
  if (!res.ok) throw new Error(`fetch products → ${res.status}: ${await res.text()}`);
  const products = await res.json() as Array<{ id: string; slug: string; price: number; previousPrice: number | null }>;

  let updated = 0;
  let skipped = 0;

  for (const p of products) {
    const price = Number(p.price);
    const prevPrice = p.previousPrice != null ? Number(p.previousPrice) : null;
    const rounded = roundPrice(price);
    const prevRounded = prevPrice != null ? roundPrice(prevPrice) : null;

    if (rounded === price && prevRounded === prevPrice) {
      skipped++;
      continue;
    }

    const patch = await fetch(`${BASE}/Product?id=eq.${p.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ price: rounded, previousPrice: prevRounded }),
    });

    if (!patch.ok) {
      console.error(`ERROR ${p.slug}: ${patch.status} ${await patch.text()}`);
    } else {
      console.log(`✅ ${p.slug}: ${price}→${rounded}${prevPrice != null ? ` | prev ${prevPrice}→${prevRounded}` : ""}`);
      updated++;
    }
  }

  console.log(`\nListo. Actualizados: ${updated} | Sin cambio: ${skipped}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
