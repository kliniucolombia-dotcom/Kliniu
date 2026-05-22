import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "product-images";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const images = [
  "products/1779397984122-dispensador-decoklin-con-repisa-blanco.png",
  "products/1779397989626-dispensador-decoklin-con-repisa-negro.png",
  "products/1779397994655-dispensador-decoklin-flotante-blanco.png",
  "products/1779397997983-dispensador-decoklin-flotante-negro.png",
  "products/1779398001706-dispensador-racklin-soporte-negro.png",
  "products/1779398005665-dispensador-racklin-soporte-plateado.png",
];

async function compressAndReplace(filePath) {
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filePath}`;
  console.log(`\nDescargando: ${filePath.split("/").pop()}`);

  const res = await fetch(publicUrl);
  if (!res.ok) { console.error(`  Error: ${res.status}`); return; }

  const buffer = Buffer.from(await res.arrayBuffer());
  console.log(`  Original: ${Math.round(buffer.length / 1024)} KB`);

  const compressed = await sharp(buffer)
    .resize(800, 800, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const newPath = filePath.replace(/\.(png|jpg|jpeg)$/, ".webp");
  console.log(`  Comprimido: ${Math.round(compressed.length / 1024)} KB (-${Math.round((1 - compressed.length / buffer.length) * 100)}%)`);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(newPath, compressed, { contentType: "image/webp", upsert: true });

  if (uploadError) {
    console.error(`  Error subiendo: ${uploadError.message}`);
    return;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(newPath);
  const newUrl = data.publicUrl;

  // Actualizar la BD
  const { error: dbError } = await supabase
    .from("Product")
    .update({ image: newUrl })
    .eq("image", publicUrl);

  if (dbError) {
    console.error(`  Error BD: ${dbError.message}`);
  } else {
    console.log(`  ✓ Actualizado en BD → ${newPath.split("/").pop()}`);
  }
}

for (const img of images) {
  await compressAndReplace(img);
}
console.log("\n✓ Proceso completado");
