import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { readFile } from "fs/promises";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "product-images";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Subir imagen nueva
const imgPath = "/Users/pc-udc1/Library/CloudStorage/GoogleDrive-diseno.grupogeu@gmail.com/Mi unidad/KLINIU/Fotos/1/Dispensador de espuma en acero inoxidable 1200ml.jpg";
const raw = await readFile(imgPath);
const compressed = await sharp(raw).resize(800, 800, { fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
const storagePath = `products/${Date.now()}-dispensador-de-espuma-en-acero-inoxidable-1200-ml.webp`;

const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, compressed, { contentType: "image/webp", upsert: false });
if (uploadError) { console.error("Error imagen:", uploadError.message); process.exit(1); }
const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
console.log("Imagen subida:", publicUrl);

// Recrear producto
const { error } = await supabase.from("Product").insert({
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  slug: "dispensador-de-espuma-en-acero-inoxidable-1200-ml",
  sku: "D-EM-1200ML-256",
  category: "KlinOx Acero Inoxidable",
  name: "Dispensador de Espuma en Acero Inoxidable 1200 ml",
  brand: "KLINIU",
  price: 89900,
  previousPrice: 109000,
  stock: 20,
  minimumStock: 3,
  image: publicUrl,
  galleryImages: [],
  availability: "Entrega inmediata",
  description: "Combina la durabilidad del acero inoxidable 304 con un diseño que aporta limpieza visual y máxima resistencia. Capacidad: 1.200 ml.",
  application: "13 cm ancho × 20 cm alto × prof. 13,5 cm · 585 grs · REF D.EM.1.200ML-256",
  compatibility: [],
  warranty: "1 año de garantía del fabricante",
  technicalSpecs: [
    { etiqueta: "Observaciones", valor: "La imagen de este producto es de referencia visual y puede variar levemente frente a la versión final entregada." },
    { etiqueta: "Categoría", valor: "KlinOx Acero Inoxidable" },
    { etiqueta: "Marca", valor: "KLINIU" },
    { etiqueta: "Disponibilidad", valor: "Entrega inmediata" },
    { etiqueta: "Garantía", valor: "1 año de garantía del fabricante" },
    { etiqueta: "Aplicación", valor: "13 cm ancho × 20 cm alto × prof. 13,5 cm · 585 grs · REF D.EM.1.200ML-256" },
  ],
  colorVariants: [],
  featured: true,
  active: true,
});

if (error) {
  console.error("Error recreando producto:", error.message);
} else {
  console.log("✓ Producto restaurado correctamente");
}
