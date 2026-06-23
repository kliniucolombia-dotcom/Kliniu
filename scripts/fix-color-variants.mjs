import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: products, error } = await supabase
  .from("Product")
  .select("id, slug, name, image, colorVariants")
  .eq("active", true);

if (error) {
  console.error("Error fetching products:", error);
  process.exit(1);
}

const withVariants = products.filter(p => {
  const variants = Array.isArray(p.colorVariants) ? p.colorVariants : [];
  return variants.length > 0;
});

console.log(`Productos con variantes de color: ${withVariants.length}`);

let updated = 0;
let skipped = 0;

for (const product of withVariants) {
  const variants = Array.isArray(product.colorVariants) ? product.colorVariants : [];

  // Check if already has a light/white variant
  const hasWhite = variants.some(v => {
    const c = (v.color || "").toLowerCase().replace(/^#/, "");
    if (!c || c.length !== 6) return false;
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    // Brightness > 200 = light/white
    return (r + g + b) / 3 > 200;
  });

  if (hasWhite) {
    console.log(`  SKIP (ya tiene blanco): ${product.slug}`);
    skipped++;
    continue;
  }

  // Check if has dark variant — to know image pair exists
  const darkVariant = variants.find(v => {
    const c = (v.color || "").toLowerCase().replace(/^#/, "");
    if (!c || c.length !== 6) return false;
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    return (r + g + b) / 3 < 100;
  });

  // Use main product image for white variant
  const whiteVariant = {
    color: "#f0f0f0",
    label: "Blanco",
    image: product.image,
  };

  // If dark variant has image that says "negro" in URL, try to get white counterpart
  if (darkVariant?.image) {
    const whiteImageUrl = darkVariant.image
      .replace(/negro/gi, "blanco")
      .replace(/black/gi, "white")
      .replace(/-dark/gi, "-light");

    // Only use derived URL if it's different (i.e., substitution happened)
    if (whiteImageUrl !== darkVariant.image) {
      whiteVariant.image = whiteImageUrl;
    }
  }

  const newVariants = [whiteVariant, ...variants];

  const { error: updateError } = await supabase
    .from("Product")
    .update({ colorVariants: newVariants })
    .eq("id", product.id);

  if (updateError) {
    console.error(`  ERROR updating ${product.slug}:`, updateError.message);
  } else {
    console.log(`  UPDATED: ${product.slug} — variantes: ${newVariants.map(v => v.label).join(", ")}`);
    updated++;
  }
}

console.log(`\nListo. Actualizados: ${updated}, Ya tenían blanco: ${skipped}`);
