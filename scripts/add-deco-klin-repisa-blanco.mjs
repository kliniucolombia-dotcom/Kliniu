import "dotenv/config";
import sharp from "sharp";
import { readFile } from "fs/promises";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const ENV = await readFile(".env.local", "utf8");
const get = (k) => ENV.match(new RegExp(`^${k}="?([^"\\n]+)`, "m"))?.[1];

const DB_URL = get("DIRECT_URL") || get("DATABASE_URL");
const SERVICE_ROLE_KEY = get("SUPABASE_SERVICE_ROLE_KEY");
const SUPABASE_URL = "https://yotsdpjfnsrejtoufkuu.supabase.co";
const BUCKET = "product-images";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PRODUCT_ID = "f20a805b-f52c-4d43-bd92-a7cb148bc58d";

const IMAGES = [
  { path: "/Users/creativo/Desktop/Fotomontajes de productos/Dispensador Decoklin con repisa blanco.jpg", name: "dispensador-deco-klin-con-repisa-blanco-1.webp" },
  { path: "/Users/creativo/Downloads/Dispensador Decoklin soporte blanco en uso.png", name: "dispensador-deco-klin-con-repisa-blanco-2.webp" },
  { path: "/Users/creativo/Library/CloudStorage/GoogleDrive-diseno.grupogeu@gmail.com/Mi unidad/KLINIU/FOTOS DISPENSADORES/DISPENSADOR-DECOKLIN-ACONDICIONADOR-REPISA PARED BAÑO/Fotomontaje Decoklin flotante 2.jpg", name: "dispensador-deco-klin-con-repisa-blanco-3.webp" },
];

async function upload({ path, name }) {
  const raw = await readFile(path);
  const buf = await sharp(raw).resize(800, 800, { fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  const storagePath = `products/${Date.now()}-${name}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: SERVICE_ROLE_KEY, "Content-Type": "image/webp", "x-upsert": "false" },
    body: buf,
  });
  if (!res.ok) throw new Error(`Upload ${name}: ${res.status} ${await res.text()}`);
  console.log(`  subida: ${name}`);
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

console.log("Subiendo imágenes...");
const urls = [];
for (const img of IMAGES) urls.push(await upload(img));

const c = new pg.Client({ connectionString: DB_URL });
await c.connect();
const { rows } = await c.query(`SELECT "colorVariants","galleryImages" FROM "Product" WHERE id=$1`, [PRODUCT_ID]);
const cur = rows[0];
const variants = Array.isArray(cur.colorVariants) ? cur.colorVariants : [];
const gallery = Array.isArray(cur.galleryImages) ? cur.galleryImages : [];

const blancoVariant = { color: "#f0f0f0", label: "Blanco", image: urls[0] };
const newVariants = variants.some((v) => v.label?.toLowerCase() === "blanco") ? variants : [...variants, blancoVariant];
const newGallery = [...gallery, ...urls];

await c.query(`UPDATE "Product" SET "colorVariants"=$1::jsonb,"galleryImages"=$2 WHERE id=$3`, [JSON.stringify(newVariants), newGallery, PRODUCT_ID]);
await c.end();

console.log("\nListo:");
console.log(`  Variante: Blanco -> ${urls[0]}`);
console.log(`  Gallery: ${newGallery.length} imágenes (+3)`);
