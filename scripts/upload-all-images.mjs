import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "fs/promises";
import { join } from "path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "product-images";
const PHOTOS_DIR = "/Users/pc-udc1/Library/CloudStorage/GoogleDrive-diseno.grupogeu@gmail.com/Mi unidad/KLINIU/Fotos/1";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Mapeo archivo → slug del producto en BD
const MAPPING = [
  ["Dispensador Decoklin con repisa blanco.jpg",                       "dispensador-deco-klin-con-repisa-blanco"],
  ["Dispensador Decoklin con repisa negro.jpg",                        "dispensador-deco-klin-con-repisa-negro"],
  ["Dispensador Decoklin flotante blanco.jpg",                         "dispensador-deco-klin-flotante-blanco"],
  ["Dispensador Decoklin flotante negro.jpg",                          "dispensador-deco-klin-flotante-negro"],
  ["Dispensador Racklin soporte negro.jpg",                            "dispensador-racklin-soporte-negro"],
  ["Dispensador Racklin soporte plateado.jpg",                         "dispensador-racklin-soporte-plateado"],
  ["Dispensador antigoteo de liquidos 1000ml.jpg",                     "dispensador-antigoteo-de-liquidos-1000-ml"],
  ["Dispensador antigoteo de liquidos 500ml BLACK.jpg",                "dispensador-antigoteo-de-liquidos-500-ml-negro"],
  ["Dispensador antigoteo de liquidos doble 800ml.jpg",                "dispensador-antigoteo-doble-800-ml"],
  ["Dispensador de crema dental kids para 2 cepillos.jpg",             "dispensador-de-crema-dental-kids-2-cepillos"],
  ["Dispensador de crema dental para 4 cepillos.jpg",                  "dispensador-de-crema-dental-4-cepillos"],
  ["Dispensador de crema dental para 5 cepillos.jpg",                  "dispensador-de-crema-dental-5-cepillos"],
  ["Dispensador de crema dental plus para 2 cepillos.jpg",             "dispensador-de-crema-dental-plus-2-cepillos"],
  ["Dispensador de espuma en acero inoxidable 1200ml.jpg",             "dispensador-de-espuma-en-acero-inoxidable-1200-ml"],
  ["Dispensador de jabon en acero inoxidable 1000ml.jpg",              "dispensador-de-jabon-en-acero-inoxidable-1000-ml"],
  ["Dispensador de jabon en acero inoxidable 1300ml.jpg",              "dispensador-de-jabon-en-acero-inoxidable-1300-ml"],
  ["Dispensador de jabon en acero inoxidable 500ml.jpg",               "dispensador-de-jabon-en-acero-inoxidable-500-ml"],
  ["Dispensador de jabon en acero inoxidable de codo elbow 1000ml.jpg","dispensador-de-jabon-codo-elbow-1000-ml"],
  ["Dispensador de jabon en brass 500ml.jpg",                          "dispensador-de-jabon-en-brass-500-ml"],
  ["Dispensador de liquidos 1000ml ABS.jpg",                           "dispensador-de-liquidos-1000-ml-abs"],
  ["Dispensador de liquidos 1000ml automatico.jpg",                    "dispensador-de-liquidos-1000-ml-automatico"],
  ["Dispensador de papel en acero inoxidable.jpg",                     "dispensador-de-papel-en-acero-inoxidable"],
  ["Dispensador de papel higienico hogar.jpg",                         "dispensador-de-papel-higienico-hogar"],
  ["Dispensador de papel higienico institucional.jpg",                 "dispensador-de-papel-higienico-institucional"],
  ["Dispensador de servilletas NAPKLIN blanco.jpg",                    "dispensador-de-servilletas-napklin-blanco"],
  ["Dispensador de servilletas NAPKLIN gris.jpg",                      "dispensador-de-servilletas-napklin-gris"],
  ["Dispensador de servilletas NAPKLIN humo.jpg",                      "dispensador-de-servilletas-napklin-humo"],
  ["Dispensador de servilletas NAPKLIN verde.jpg",                     "dispensador-de-servilletas-napklin-verde"],
  ["Dispensador de toalla enacero inoxidable.jpg",                     "dispensador-de-toalla-en-acero-inoxidable"],
  ["Dispensador de toalla institucional BLACK.jpg",                    "dispensador-de-toalla-institucional-negro"],
  ["Dispensador de toalla institucional.jpg",                          "dispensador-de-toalla-institucional"],
  ["Dispensador de toallas LUXURY.jpg",                                "dispensador-de-toallas-luxury"],
  ["Dispensador de toallas center pull.jpg",                           "dispensador-de-toallas-center-pull"],
  ["Dispensador de toallas de papel en rollo automatico con sensor.jpg","dispensador-de-toallas-en-rollo-automatico-con-sensor"],
  ["Dispensador de toallas ecotowel.jpg",                              "dispensador-de-toallas-ecotowel"],
  ["Dispensador de toallas en rollo autocorte.jpg",                    "dispensador-de-toallas-en-rollo-autocorte"],
  ["Dispensador de toallas en rollo de palanca.jpg",                   "dispensador-de-toallas-en-rollo-de-palanca"],
];

const SKIPPED = [
  "Dispensador antigoteo de liquidos 500ml.jpg",       // versión blanca no está en BD
  "Dispensador antigoteo de liquidos 600ml.jpg",       // 600ml no está en BD
  "Dispensador antigoteo de liquidos 600ml BLACK.jpg", // 600ml no está en BD
  "Dispensador antigoteo de liquidos doble 800ml BLACK.jpg", // se usa la blanca para el doble-800ml
  "Dispensador de papel higienico institucional BLACK.jpg",  // no existe variante negro en BD
];

let ok = 0, errors = 0;

for (const [fileName, slug] of MAPPING) {
  const filePath = join(PHOTOS_DIR, fileName);

  process.stdout.write(`[${ok + errors + 1}/${MAPPING.length}] ${fileName.substring(0, 50).padEnd(50)} → `);

  try {
    const raw = await readFile(filePath);
    const compressed = await sharp(raw)
      .resize(800, 800, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const storagePath = `products/${Date.now()}-${slug}.webp`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, compressed, { contentType: "image/webp", upsert: false });

    if (uploadError) throw new Error(uploadError.message);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    const { error: dbError } = await supabase
      .from("Product")
      .update({ image: data.publicUrl })
      .eq("slug", slug);

    if (dbError) throw new Error(dbError.message);

    const kb = Math.round(raw.length / 1024);
    const kbOut = Math.round(compressed.length / 1024);
    console.log(`✓  ${kb}KB → ${kbOut}KB`);
    ok++;
  } catch (err) {
    console.log(`✗  ${err.message}`);
    errors++;
  }
}

console.log(`\n─────────────────────────────`);
console.log(`✓ Subidos:   ${ok}`);
if (errors) console.log(`✗ Errores:   ${errors}`);
console.log(`─ Omitidos:  ${SKIPPED.length} (sin producto en BD)`);
SKIPPED.forEach(f => console.log(`   · ${f}`));
