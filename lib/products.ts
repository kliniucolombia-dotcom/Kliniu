import { cache } from "react";
import {
  categorias,
  descripcionProducto,
  disponibilidades,
  formatearDescuento,
  formatearMoneda,
  productosCatalogo,
  slugify,
  type Categoria,
  type Disponibilidad,
  type ProductoEspecificacion,
  type ProductoCatalogo,
  type VariacionColor,
} from "@/app/data/catalog";
import { supabaseDb } from "@/lib/supabase-db";
import { setWarehouseStockAbsolute, WAREHOUSE_KEYS } from "@/lib/warehouses";

type ProductRecord = {
  id: string;
  slug: string;
  sku?: string | null;
  oemReference?: string | null;
  alternativeReferences: string[];
  category: string;
  name: string;
  brand: string;
  price: number;
  previousPrice: number;
  stock: number;
  minimumStock: number;
  image: string;
  galleryImages: string[];
  availability: string;
  description: string;
  application?: string | null;
  compatibility: string[];
  warranty?: string | null;
  technicalSpecs?: unknown;
  colorVariants?: unknown;
  videoUrl?: string | null;
  featured: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StoreProduct = ProductoCatalogo & {
  descripcion: string;
  destacado: boolean;
};

export type InventoryMovementSummary = {
  id: string;
  productSlug: string;
  productName: string;
  productSku: string | null;
  type: "CREATED" | "ADJUSTMENT" | "ORDER_DEDUCTION";
  quantity: number;
  stockAfter: number;
  note: string | null;
  createdAt: Date;
};

export type ProductMutationInput = {
  sku?: string;
  oemReferencia?: string;
  referenciasAlternas?: string[];
  categoria: Categoria;
  nombre: string;
  marca: string;
  precioValor: number;
  precioAnteriorValor: number;
  stock: number;
  stockMinimo: number;
  imagen: string;
  imagenesExtra?: string[];
  disponibilidad: Disponibilidad;
  descripcion?: string;
  aplicacion?: string;
  compatibilidad?: string[];
  garantia?: string;
  especificacionesTecnicas?: ProductoEspecificacion[];
  variacionesColor?: VariacionColor[];
  videoUrl?: string;
};

function createSkuFromName(name: string) {
  return (
    slugify(name)
      .replace(/-/g, "")
      .toUpperCase()
      .slice(0, 10) || `SKU${Date.now()}`
  );
}

function normalizeStockAvailability(
  availability: string,
  stock: number,
  minimumStock: number,
): Disponibilidad {
  if (stock <= 0) {
    return "Disponible por pedido";
  }

  if (availability === "Agotado") {
    return stock <= minimumStock ? "Disponible por pedido" : "Entrega inmediata";
  }

  return normalizeDisponibilidad(availability);
}

function getInventoryState(stock: number, minimumStock: number) {
  if (stock <= 0) return "out-of-stock" as const;
  if (stock <= minimumStock) return "low-stock" as const;
  return "in-stock" as const;
}

const BROKEN_PLACEHOLDER_IMAGES = new Set([
  "/motor-ventilador-axis-compact.png",
  "/hero-kliniu.jpg",
]);

function normalizeProductImage(value: string | null | undefined) {
  const image = (value || "").trim();

  if (BROKEN_PLACEHOLDER_IMAGES.has(image)) return "";

  if (
    image.startsWith("/") ||
    image.startsWith("http://") ||
    image.startsWith("https://")
  ) {
    return image;
  }

  return "";
}

function normalizeGalleryImages(images: Array<string | null | undefined>) {
  return images
    .map(normalizeProductImage)
    .filter(Boolean)
    .slice(0, 3);
}

function normalizeTextList(values: Array<string | null | undefined>) {
  return values
    .map((value) => (value || "").trim())
    .filter(Boolean);
}

function normalizeTechnicalSpecs(
  specs: unknown,
  fallback?: {
    categoria?: string;
    marca?: string;
    disponibilidad?: string;
    garantia?: string | null;
    aplicacion?: string | null;
  },
): ProductoEspecificacion[] {
  const normalized = Array.isArray(specs)
    ? specs
        .map((item) => {
          if (!item || typeof item !== "object") return null;

          const etiqueta =
            "etiqueta" in item && typeof item.etiqueta === "string"
              ? item.etiqueta.trim()
              : "";
          const valor =
            "valor" in item && typeof item.valor === "string"
              ? item.valor.trim()
              : "";

          if (!etiqueta || !valor) return null;
          return { etiqueta, valor };
        })
        .filter((item): item is ProductoEspecificacion => Boolean(item))
    : [];

  if (normalized.length > 0) {
    return normalized;
  }

  return [
    {
      etiqueta: "Observaciones",
      valor:
        "La imagen de este producto es de referencia visual y puede variar levemente frente a la versión final entregada.",
    },
    ...(fallback?.categoria
      ? [{ etiqueta: "Categoría", valor: fallback.categoria }]
      : []),
    ...(fallback?.marca ? [{ etiqueta: "Marca", valor: fallback.marca }] : []),
    ...(fallback?.disponibilidad
      ? [{ etiqueta: "Disponibilidad", valor: fallback.disponibilidad }]
      : []),
    ...(fallback?.garantia
      ? [{ etiqueta: "Garantía", valor: fallback.garantia }]
      : []),
    ...(fallback?.aplicacion
      ? [{ etiqueta: "Aplicación", valor: fallback.aplicacion }]
      : []),
  ];
}

function normalizeCategoria(value: string): Categoria {
  return categorias.includes(value as Categoria)
    ? (value as Categoria)
    : categorias[0];
}

function normalizeDisponibilidad(value: string): Disponibilidad {
  return disponibilidades.includes(value as Disponibilidad)
    ? (value as Disponibilidad)
    : disponibilidades[0];
}

function toStoreProduct(product: ProductRecord): StoreProduct {
  const categoria = normalizeCategoria(product.category);
  const disponibilidad = normalizeStockAvailability(
    product.availability,
    product.stock,
    product.minimumStock,
  );
  const estadoInventario = getInventoryState(product.stock, product.minimumStock);

  return {
    slug: product.slug,
    sku: product.sku || undefined,
    oemReferencia: product.oemReference || undefined,
    referenciasAlternas: normalizeTextList(product.alternativeReferences || []),
    categoria,
    nombre: product.name,
    marca: product.brand,
    precio: formatearMoneda(product.price),
    precioAnterior: formatearMoneda(product.previousPrice),
    precioValor: product.price,
    stock: product.stock,
    stockMinimo: product.minimumStock,
    estadoInventario,
    // Aunque no haya stock disponible, la empresa fabrica/consigue el
    // producto sobre pedido, así que la compra nunca se bloquea por stock.
    puedeComprar: true,
    descuento: formatearDescuento(product.price, product.previousPrice),
    imagen: normalizeProductImage(product.image) || "/product-placeholder.png",
    imagenesExtra: normalizeGalleryImages(product.galleryImages || []),
    disponibilidad,
    descripcion:
      product.description ||
      descripcionProducto({
        nombre: product.name,
        categoria,
        marca: product.brand,
      }),
    aplicacion:
      product.application?.trim() ||
      `Aplicación recomendada para la línea ${categoria}.`,
    compatibilidad: normalizeTextList(product.compatibility || []),
    garantia: product.warranty?.trim() || "1 año de garantía del fabricante",
    especificacionesTecnicas: normalizeTechnicalSpecs(product.technicalSpecs, {
      categoria,
      marca: product.brand,
      disponibilidad,
      garantia: product.warranty?.trim() || "1 año de garantía del fabricante",
      aplicacion:
        product.application?.trim() ||
        `Aplicación recomendada para la línea ${categoria}.`,
    }),
    variacionesColor: Array.isArray(product.colorVariants) ? (product.colorVariants as VariacionColor[]) : [],
    videoUrl: product.videoUrl?.trim() || undefined,
    destacado: product.featured,
  };
}

function getFallbackProducts(): StoreProduct[] {
  return productosCatalogo.map((producto, index) => ({
    ...producto,
    sku: producto.sku || createSkuFromName(producto.nombre),
    stock: producto.stock ?? 12,
    stockMinimo: producto.stockMinimo ?? 3,
    estadoInventario:
      producto.stock !== undefined && (producto.stock ?? 0) <= 0
        ? "out-of-stock"
        : (producto.stock ?? 12) <= (producto.stockMinimo ?? 3)
          ? "low-stock"
          : "in-stock",
    disponibilidad: normalizeStockAvailability(
      producto.disponibilidad,
      producto.stock ?? 12,
      producto.stockMinimo ?? 3,
    ),
    puedeComprar: true,
    descripcion:
      producto.descripcion ||
      descripcionProducto({
        nombre: producto.nombre,
        categoria: producto.categoria,
        marca: producto.marca,
      }),
    oemReferencia:
      producto.oemReferencia ||
      (producto.sku ? `OEM-${producto.sku}` : undefined),
    referenciasAlternas: producto.referenciasAlternas || [],
    aplicacion:
      producto.aplicacion ||
      `Aplicación comercial para ${producto.categoria.toLowerCase()}.`,
    compatibilidad:
      producto.compatibilidad || [producto.marca, producto.categoria],
    garantia: producto.garantia || "1 año de garantía del fabricante",
    especificacionesTecnicas: normalizeTechnicalSpecs(
      producto.especificacionesTecnicas,
      {
        categoria: producto.categoria,
        marca: producto.marca,
        disponibilidad: producto.disponibilidad,
        garantia: producto.garantia || "1 año de garantía del fabricante",
        aplicacion:
          producto.aplicacion ||
          `Aplicación comercial para ${producto.categoria.toLowerCase()}.`,
      },
    ),
    destacado: producto.destacado ?? index < 5,
  }));
}

export const getProducts = cache(async function getProducts() {
  if (!supabaseDb) {
    return getFallbackProducts();
  }

  const { data: products, error } = await supabaseDb
    .from("Product")
    .select("*")
    .eq("active", true)
    .order("featured", { ascending: false })
    .order("name", { ascending: true });

  if (error || !products) {
    return getFallbackProducts();
  }

  return (products as ProductRecord[]).map(toStoreProduct);
});

export async function getFeaturedProducts() {
  const products = await getProducts();

  // Más vendidos de Odoo (últimos 90 días), sin bloquear si falla
  let topOdooNames: string[] = [];
  try {
    const { getTopProducts } = await import("@/lib/odoo");
    const end = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const top = await getTopProducts(start, end, 10);
    topOdooNames = top.map((p) => p.name.toLowerCase());
  } catch {
    // Odoo no disponible o no configurado
  }

  const normalize = (name: string) => name.toLowerCase();

  const isBestseller = (product: StoreProduct) =>
    topOdooNames.some(
      (odooName) =>
        odooName.includes(normalize(product.nombre)) ||
        normalize(product.nombre).includes(odooName.split(" ").slice(0, 3).join(" ")),
    );

  const bestsellers = products.filter(isBestseller);
  const onlyFeatured = products.filter((p) => p.destacado && !isBestseller(p));
  const rest = products.filter((p) => !p.destacado && !isBestseller(p));

  return [...bestsellers, ...onlyFeatured, ...rest].slice(0, 5);
}

export async function createProduct(input: ProductMutationInput, actorUserId: string) {
  if (!supabaseDb) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const nombre = input.nombre.trim();
  const marca = input.marca.trim();
  const baseSlug = slugify(nombre) || `producto-${Date.now()}`;
  let slug = baseSlug;
  let suffix = 1;

  while (true) {
    const { data: existing } = await supabaseDb
      .from("Product")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) break;
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const precioValor = Math.max(1, Math.round(input.precioValor));
  const precioAnteriorValor = Math.max(
    precioValor,
    Math.round(input.precioAnteriorValor || input.precioValor),
  );
  const stock = Math.max(0, Math.round(input.stock));
  const stockMinimo = Math.max(0, Math.round(input.stockMinimo));
  const imagen = normalizeProductImage(input.imagen) || "/product-placeholder.png";
  const imagenesExtra = normalizeGalleryImages(input.imagenesExtra || []);
  const baseSku = (input.sku?.trim() || createSkuFromName(nombre)).toUpperCase();
  let sku = baseSku;
  let skuSuffix = 1;

  while (true) {
    const { data: existing } = await supabaseDb
      .from("Product")
      .select("id")
      .eq("sku", sku)
      .maybeSingle();
    if (!existing) break;
    sku = `${baseSku}-${skuSuffix}`;
    skuSuffix += 1;
  }

  const { data: created, error } = await supabaseDb
    .from("Product")
    .insert({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      slug,
      sku,
      oemReference: input.oemReferencia?.trim() || null,
      alternativeReferences: normalizeTextList(input.referenciasAlternas || []),
      category: input.categoria,
      name: nombre,
      brand: marca,
      price: precioValor,
      previousPrice: precioAnteriorValor,
      stock,
      minimumStock: stockMinimo,
      image: imagen,
      galleryImages: imagenesExtra,
      availability: normalizeStockAvailability(input.disponibilidad, stock, stockMinimo),
      description:
        input.descripcion?.trim() ||
        descripcionProducto({ nombre, categoria: input.categoria, marca }),
      application: input.aplicacion?.trim() || null,
      compatibility: normalizeTextList(input.compatibilidad || []),
      warranty: input.garantia?.trim() || "1 año de garantía del fabricante",
      technicalSpecs: normalizeTechnicalSpecs(input.especificacionesTecnicas),
      colorVariants: input.variacionesColor ?? [],
      videoUrl: input.videoUrl?.trim() || null,
      featured: false,
      active: true,
    })
    .select()
    .single();

  if (error || !created) {
    throw new Error(error?.message || "Error al crear producto");
  }

  await supabaseDb.from("InventoryMovement").insert({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    productId: created.id,
    type: "CREATED",
    quantity: stock,
    stockAfter: stock,
    note: "Inventario inicial del producto",
  });

  await setWarehouseStockAbsolute({
    productId: created.id,
    warehouseKey: WAREHOUSE_KEYS.PRODUCTO_TERMINADO,
    quantity: stock,
    source: "USER",
    userId: actorUserId,
    note: "Inventario inicial del producto",
  });

  return toStoreProduct(created as ProductRecord);
}

export async function updateProduct(slug: string, input: ProductMutationInput, actorUserId: string) {
  if (!supabaseDb) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const { data: existing, error: findError } = await supabaseDb
    .from("Product")
    .select("*")
    .eq("slug", slug)
    .single();

  if (findError || !existing) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  const existingRecord = existing as ProductRecord;

  const nombre = input.nombre.trim();
  const marca = input.marca.trim();
  const precioValor = Math.max(1, Math.round(input.precioValor));
  const precioAnteriorValor = Math.max(
    precioValor,
    Math.round(input.precioAnteriorValor || input.precioValor),
  );
  const stock = Math.max(0, Math.round(input.stock));
  const stockMinimo = Math.max(0, Math.round(input.stockMinimo));
  const imagen = normalizeProductImage(input.imagen) || existingRecord.image;
  const imagenesExtra = normalizeGalleryImages(input.imagenesExtra || []);

  const nextSlugBase = slugify(nombre) || slug;
  let nextSlug = slug;

  if (nextSlugBase !== slug) {
    nextSlug = nextSlugBase;
    let suffix = 1;

    while (true) {
      const { data: conflict } = await supabaseDb
        .from("Product")
        .select("id")
        .eq("slug", nextSlug)
        .neq("id", existingRecord.id)
        .maybeSingle();
      if (!conflict) break;
      nextSlug = `${nextSlugBase}-${suffix}`;
      suffix += 1;
    }
  }

  const nextSkuBase = (input.sku?.trim() || existingRecord.sku || createSkuFromName(nombre)).toUpperCase();
  let nextSku = nextSkuBase;

  if (nextSkuBase !== existingRecord.sku) {
    let skuSuffix = 1;

    while (true) {
      const { data: conflict } = await supabaseDb
        .from("Product")
        .select("id")
        .eq("sku", nextSku)
        .neq("id", existingRecord.id)
        .maybeSingle();
      if (!conflict) break;
      nextSku = `${nextSkuBase}-${skuSuffix}`;
      skuSuffix += 1;
    }
  }

  const stockDelta = stock - existingRecord.stock;

  const { data: updated, error: updateError } = await supabaseDb
    .from("Product")
    .update({
      slug: nextSlug,
      sku: nextSku,
      oemReference: input.oemReferencia?.trim() || null,
      alternativeReferences: normalizeTextList(input.referenciasAlternas || []),
      category: input.categoria,
      name: nombre,
      brand: marca,
      price: precioValor,
      previousPrice: precioAnteriorValor,
      stock,
      minimumStock: stockMinimo,
      image: imagen,
      galleryImages: imagenesExtra,
      availability: normalizeStockAvailability(input.disponibilidad, stock, stockMinimo),
      description:
        input.descripcion?.trim() ||
        descripcionProducto({ nombre, categoria: input.categoria, marca }),
      application: input.aplicacion?.trim() || null,
      compatibility: normalizeTextList(input.compatibilidad || []),
      warranty: input.garantia?.trim() || "1 año de garantía del fabricante",
      technicalSpecs: normalizeTechnicalSpecs(input.especificacionesTecnicas),
      colorVariants: input.variacionesColor ?? [],
      videoUrl: input.videoUrl?.trim() || null,
      updatedAt: new Date().toISOString(),
    })
    .eq("slug", slug)
    .select()
    .single();

  if (updateError || !updated) {
    throw new Error(updateError?.message || "Error al actualizar producto");
  }

  if (stockDelta !== 0) {
    await supabaseDb.from("InventoryMovement").insert({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      productId: existingRecord.id,
      type: "ADJUSTMENT",
      quantity: stockDelta,
      stockAfter: stock,
      note: "Ajuste manual desde el panel admin",
    });
  }

  await setWarehouseStockAbsolute({
    productId: existingRecord.id,
    warehouseKey: WAREHOUSE_KEYS.PRODUCTO_TERMINADO,
    quantity: stock,
    source: "USER",
    userId: actorUserId,
    note: "Ajuste manual desde el panel admin",
  });

  return toStoreProduct(updated as ProductRecord);
}

export async function deleteProduct(slug: string) {
  if (!supabaseDb) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const { error } = await supabaseDb
    .from("Product")
    .delete()
    .eq("slug", slug);

  if (error) {
    throw new Error(error.message);
  }
}

export async function adjustProductInventory(
  slug: string,
  quantity: number,
  note?: string,
) {
  if (!supabaseDb) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const { data: product, error: findError } = await supabaseDb
    .from("Product")
    .select("*")
    .eq("slug", slug)
    .single();

  if (findError || !product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  const productRecord = product as ProductRecord;
  const normalizedQuantity = Math.trunc(quantity);

  if (normalizedQuantity === 0) {
    throw new Error("INVALID_QUANTITY");
  }

  const nextStock = productRecord.stock + normalizedQuantity;

  if (nextStock < 0) {
    throw new Error("INSUFFICIENT_STOCK");
  }

  const { data: updated, error: updateError } = await supabaseDb
    .from("Product")
    .update({
      stock: nextStock,
      availability:
        nextStock <= 0
          ? "Agotado"
          : nextStock <= productRecord.minimumStock
            ? "Disponible por pedido"
            : "Entrega inmediata",
      updatedAt: new Date().toISOString(),
    })
    .eq("slug", slug)
    .select()
    .single();

  if (updateError || !updated) {
    throw new Error(updateError?.message || "Error al ajustar inventario");
  }

  await supabaseDb.from("InventoryMovement").insert({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    productId: productRecord.id,
    type: "ADJUSTMENT",
    quantity: normalizedQuantity,
    stockAfter: nextStock,
    note: note?.trim() || "Ajuste rápido desde inventario",
  });

  return toStoreProduct(updated as ProductRecord);
}

export async function getRecentInventoryMovements(limit = 16) {
  if (!supabaseDb) {
    return [];
  }

  const { data: movements, error } = await supabaseDb
    .from("InventoryMovement")
    .select("*, product:productId(slug, name, sku)")
    .order("createdAt", { ascending: false })
    .limit(limit);

  if (error || !movements) {
    return [];
  }

  return movements.map(
    (movement: Record<string, unknown> & { product: { slug: string; name: string; sku: string | null } }): InventoryMovementSummary => ({
      id: movement.id as string,
      productSlug: movement.product.slug,
      productName: movement.product.name,
      productSku: movement.product.sku,
      type: movement.type as "CREATED" | "ADJUSTMENT" | "ORDER_DEDUCTION",
      quantity: movement.quantity as number,
      stockAfter: movement.stockAfter as number,
      note: (movement.note as string | null) || null,
      createdAt: new Date(movement.createdAt as string),
    }),
  );
}

export type StockSyncResult = {
  updated: number;
  unchanged: number;
  unmatched: string[];
  total: number;
};

// Trae qty_available de Odoo (por SKU) y lo refleja en Product.stock. No
// bloquea la compra si no hay match o si Odoo marca 0 — solo informa.
export async function syncStockFromOdoo(): Promise<StockSyncResult> {
  if (!supabaseDb) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const { getOdooStockBySku, normalizeCode } = await import("@/lib/odoo");
  const stockBySku = await getOdooStockBySku();

  const { data: products, error } = await supabaseDb
    .from("Product")
    .select("id, slug, sku, stock, minimumStock")
    .not("sku", "is", null);

  if (error) {
    throw new Error(error.message);
  }

  const result: StockSyncResult = { updated: 0, unchanged: 0, unmatched: [], total: (products ?? []).length };

  for (const product of (products ?? []) as { id: string; slug: string; sku: string | null; stock: number; minimumStock: number }[]) {
    if (!product.sku) continue;

    const odooQty = stockBySku.get(normalizeCode(product.sku));
    if (odooQty === undefined) {
      result.unmatched.push(product.sku);
      continue;
    }

    const nextStock = Math.max(Math.trunc(odooQty), 0);
    if (nextStock === product.stock) {
      result.unchanged++;
      continue;
    }

    try {
      await setWarehouseStockAbsolute({
        productId: product.id,
        warehouseKey: WAREHOUSE_KEYS.PRODUCTO_TERMINADO,
        quantity: nextStock,
        source: "ODOO",
        note: "Sincronización automática de stock desde Odoo",
      });
    } catch (writeError) {
      // Un producto con error puntual (ej. bodega mal configurada) no debe
      // abortar la sync del resto del batch — se marca como no sincronizado
      // y se continúa, igual que el código legado con `if (updateError) continue`.
      console.error(`syncStockFromOdoo: fallo al escribir stock de ${product.sku}`, writeError);
      result.unmatched.push(product.sku);
      continue;
    }

    // No se repite el update de `availability` vía supabaseDb: setWarehouseStockAbsolute
    // ya deja `Product.stock` y `Product.availability` correctos vía recalculateProductStock
    // (Prisma), dentro de la misma transacción — repetirlo aquí sería redundante.

    result.updated++;
  }

  return result;
}
