import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "fs/promises";

const SUPABASE_URL = "https://yotsdpjfnsrejtoufkuu.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "product-images";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const FILES = [
  ["/Users/creativo/Downloads/Dispensador Xpert Professional Bolsa Abierto.png", "xpert-bolsa"],
  ["/Users/creativo/Downloads/Dispensador Xpert Professional Contenedor Abierto.png.png", "xpert-frasco-contenedor"],
];

const stamp = Date.now();

for (const [filePath, name] of FILES) {
  const raw = await readFile(filePath);
  const compressed = await sharp(raw)
    .resize(800, 800, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const storagePath = `products/${stamp}-${name}.webp`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, compressed, { contentType: "image/webp", upsert: false });
  if (error) { console.log(`✗ ${name}: ${error.message}`); continue; }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  console.log(`✓ ${name}: ${Math.round(raw.length/1024)}KB → ${Math.round(compressed.length/1024)}KB`);
  console.log(`  ${data.publicUrl}`);
}
