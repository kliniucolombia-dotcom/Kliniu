import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "fs/promises";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "product-images";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CACHE_DIR = "/Users/creativo/.claude/image-cache/ead1db4f-dac0-4806-9cea-1e82c2041040";
const GDRIVE_IMAGE = "/Users/creativo/Library/CloudStorage/GoogleDrive-diseno.grupogeu@gmail.com/Mi unidad/KLINIU/FOTOS DISPENSADORES/reducidas/DISPENSADOR-DECOKLIN-ACONDICIONADOR-REPISA.jpg";

// imagen 1 (1.png) es placeholder JPG icon — se omite
const IMAGES = [
  { path: GDRIVE_IMAGE,          name: "deco-klin-antivandalico-single.webp" },
  { path: `${CACHE_DIR}/3.png`,  name: "deco-klin-antivandalico-triple-white.webp" },
  { path: `${CACHE_DIR}/4.png`,  name: "deco-klin-antivandalico-triple-black.webp" },
];

async function uploadImage(filePath, fileName) {
  const raw = await readFile(filePath);
  const compressed = await sharp(raw)
    .resize(800, 800, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const storagePath = `products/${Date.now()}-${fileName}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, compressed, { contentType: "image/webp", upsert: false });

  if (error) throw new Error(`Upload error (${fileName}): ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  console.log(`  Subida: ${data.publicUrl}`);
  return data.publicUrl;
}

// Buscar producto
const { data: products, error: fetchError } = await supabase
  .from("Product")
  .select("id, slug, name, image, colorVariants, galleryImages")
  .ilike("name", "%Deco-Klin%")
  .ilike("name", "%Antivand%");

if (fetchError) {
  console.error("Error buscando producto:", fetchError);
  process.exit(1);
}

// Intentar búsqueda más amplia si no encuentra
let product = products?.[0];
if (!product) {
  const { data: all } = await supabase
    .from("Product")
    .select("id, slug, name, image, colorVariants, galleryImages")
    .ilike("name", "%Deco-Klin%");
  const found = all?.find(p => p.name.toLowerCase().includes("antivand") || p.name.toLowerCase().includes("repisa"));
  product = found || all?.[0];
}

if (!product) {
  // Listar productos con Deco para ayudar
  const { data: decos } = await supabase.from("Product").select("id, slug, name").ilike("name", "%Deco%");
  console.error("Producto no encontrado. Productos con 'Deco':");
  decos?.forEach(p => console.log(`  ${p.slug} — ${p.name}`));
  process.exit(1);
}

console.log(`Producto encontrado: ${product.name} (${product.slug})`);
console.log("Subiendo imágenes...");

const [urlSingle, urlTripleWhite, urlTripleBlack] = await Promise.all(
  IMAGES.map(({ path, name }) => uploadImage(path, name))
);

// Variante Blanco con imagen principal = urlSingle
const blancoVariant = {
  color: "#f0f0f0",
  label: "Blanco",
  image: urlSingle,
};

// Variante Negro con imagen = urlTripleBlack
const negroVariant = {
  color: "#1a1a1a",
  label: "Negro",
  image: urlTripleBlack,
};

const currentVariants = Array.isArray(product.colorVariants) ? product.colorVariants : [];
const hasBlanco = currentVariants.some(v => v.label?.toLowerCase() === "blanco");
const hasNegro = currentVariants.some(v => v.label?.toLowerCase() === "negro");

const newVariants = [
  hasBlanco ? currentVariants.find(v => v.label?.toLowerCase() === "blanco") : blancoVariant,
  hasNegro ? currentVariants.find(v => v.label?.toLowerCase() === "negro") : negroVariant,
  ...currentVariants.filter(v => !["blanco","negro"].includes(v.label?.toLowerCase())),
];

// galleryImages = las 3 imágenes
const galleryImages = [urlSingle, urlTripleWhite, urlTripleBlack];

const { error: updateError } = await supabase
  .from("Product")
  .update({ colorVariants: newVariants, galleryImages, image: urlSingle })
  .eq("id", product.id);

if (updateError) {
  console.error("Error actualizando producto:", updateError);
  process.exit(1);
}

console.log("\nListo:");
console.log(`  Producto: ${product.name}`);
console.log(`  Variantes: Blanco, Negro`);
console.log(`  Gallery: ${galleryImages.length} imágenes`);
console.log(`  Imagen principal: ${urlSingle}`);
