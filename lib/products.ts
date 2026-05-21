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
import { prisma } from "@/lib/prisma";

type ProductRecord = {
  id?: string;
  slug: string;
  sku?: string | null;
  oemReference?: string | null;
  alternativeReferences?: string[] | null;
  category: string;
  name: string;
  brand: string;
  price: number;
  previousPrice: number;
  stock: number;
  minimumStock: number;
  image: string;
  galleryImages?: string[] | null;
  availability: string;
  description: string;
  application?: string | null;
  compatibility?: string[] | null;
  warranty?: string | null;
  technicalSpecs?: unknown;
  colorVariants?: unknown;
  featured: boolean;
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

export async function getProducts() {
  if (!prisma) {
    return getFallbackProducts();
  }

  try {
    const products = await prisma.product.findMany({
      where: {
        active: true,
      },
      orderBy: [{ featured: "desc" }, { name: "asc" }],
    });

    return products.map(toStoreProduct);
  } catch {
    return getFallbackProducts();
  }
}

export async function getFeaturedProducts() {
  const products = await getProducts();
  const destacados = products.filter((product) => product.destacado);
  const fallbackProducts = products.filter((product) => !product.destacado);

  return [...destacados, ...fallbackProducts].slice(0, 5);
}

export async function createProduct(input: ProductMutationInput) {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const nombre = input.nombre.trim();
  const marca = input.marca.trim();
  const baseSlug = slugify(nombre) || `producto-${Date.now()}`;
  let slug = baseSlug;
  let suffix = 1;

  while (await prisma.product.findUnique({ where: { slug } })) {
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

  while (await prisma.product.findUnique({ where: { sku } })) {
    sku = `${baseSku}-${skuSuffix}`;
    skuSuffix += 1;
  }

  const created = await prisma.product.create({
    data: {
      slug,
      sku,
      oemReference: input.oemReferencia?.trim() || null,
      alternativeReferences: {
        set: normalizeTextList(input.referenciasAlternas || []),
      },
      category: input.categoria,
      name: nombre,
      brand: marca,
      price: precioValor,
      previousPrice: precioAnteriorValor,
      stock,
      minimumStock: stockMinimo,
      image: imagen,
      galleryImages: {
        set: imagenesExtra,
      },
      availability: normalizeStockAvailability(input.disponibilidad, stock, stockMinimo),
      description:
        input.descripcion?.trim() ||
        descripcionProducto({
          nombre,
          categoria: input.categoria,
          marca,
        }),
      application: input.aplicacion?.trim() || null,
      compatibility: {
        set: normalizeTextList(input.compatibilidad || []),
      },
      warranty: input.garantia?.trim() || "1 año de garantía del fabricante",
      technicalSpecs: normalizeTechnicalSpecs(input.especificacionesTecnicas),
      colorVariants: input.variacionesColor ?? [],
      featured: false,
      active: true,
      inventoryMovements: {
        create: {
          type: "CREATED",
          quantity: stock,
          stockAfter: stock,
          note: "Inventario inicial del producto",
        },
      },
    },
  });

  return toStoreProduct(created);
}

export async function updateProduct(slug: string, input: ProductMutationInput) {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const existing = await prisma.product.findUnique({
    where: { slug },
  });

  if (!existing) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  const nombre = input.nombre.trim();
  const marca = input.marca.trim();
  const precioValor = Math.max(1, Math.round(input.precioValor));
  const precioAnteriorValor = Math.max(
    precioValor,
    Math.round(input.precioAnteriorValor || input.precioValor),
  );
  const stock = Math.max(0, Math.round(input.stock));
  const stockMinimo = Math.max(0, Math.round(input.stockMinimo));
  const imagen = normalizeProductImage(input.imagen) || existing.image;
  const imagenesExtra = normalizeGalleryImages(input.imagenesExtra || []);

  const nextSlugBase = slugify(nombre) || slug;
  let nextSlug = slug;

  if (nextSlugBase !== slug) {
    nextSlug = nextSlugBase;
    let suffix = 1;

    while (
      await prisma.product.findFirst({
        where: {
          slug: nextSlug,
          NOT: { id: existing.id },
        },
      })
    ) {
      nextSlug = `${nextSlugBase}-${suffix}`;
      suffix += 1;
    }
  }

  const nextSkuBase = (input.sku?.trim() || existing.sku || createSkuFromName(nombre)).toUpperCase();
  let nextSku = nextSkuBase;

  if (nextSkuBase !== existing.sku) {
    let skuSuffix = 1;

    while (
      await prisma.product.findFirst({
        where: {
          sku: nextSku,
          NOT: { id: existing.id },
        },
      })
    ) {
      nextSku = `${nextSkuBase}-${skuSuffix}`;
      skuSuffix += 1;
    }
  }

  const stockDelta = stock - existing.stock;

  const updated = await prisma.product.update({
    where: { slug },
    data: {
      slug: nextSlug,
      sku: nextSku,
      oemReference: input.oemReferencia?.trim() || null,
      alternativeReferences: {
        set: normalizeTextList(input.referenciasAlternas || []),
      },
      category: input.categoria,
      name: nombre,
      brand: marca,
      price: precioValor,
      previousPrice: precioAnteriorValor,
      stock,
      minimumStock: stockMinimo,
      image: imagen,
      galleryImages: {
        set: imagenesExtra,
      },
      availability: normalizeStockAvailability(input.disponibilidad, stock, stockMinimo),
      description:
        input.descripcion?.trim() ||
        descripcionProducto({
          nombre,
          categoria: input.categoria,
          marca,
        }),
      application: input.aplicacion?.trim() || null,
      compatibility: {
        set: normalizeTextList(input.compatibilidad || []),
      },
      warranty: input.garantia?.trim() || "1 año de garantía del fabricante",
      technicalSpecs: normalizeTechnicalSpecs(input.especificacionesTecnicas),
      colorVariants: input.variacionesColor ?? [],
      inventoryMovements:
        stockDelta !== 0
          ? {
              create: {
                type: "ADJUSTMENT",
                quantity: stockDelta,
                stockAfter: stock,
                note: "Ajuste manual desde el panel admin",
              },
            }
          : undefined,
    },
  });

  return toStoreProduct(updated);
}

export async function deleteProduct(slug: string) {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  await prisma.product.delete({
    where: { slug },
  });
}

export async function adjustProductInventory(
  slug: string,
  quantity: number,
  note?: string,
) {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const product = await prisma.product.findUnique({
    where: { slug },
  });

  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  const normalizedQuantity = Math.trunc(quantity);

  if (normalizedQuantity === 0) {
    throw new Error("INVALID_QUANTITY");
  }

  const nextStock = product.stock + normalizedQuantity;

  if (nextStock < 0) {
    throw new Error("INSUFFICIENT_STOCK");
  }

  const updated = await prisma.product.update({
    where: { slug },
    data: {
      stock: nextStock,
      availability:
        nextStock <= 0
          ? "Agotado"
          : nextStock <= product.minimumStock
            ? "Disponible por pedido"
            : "Entrega inmediata",
      inventoryMovements: {
        create: {
          type: "ADJUSTMENT",
          quantity: normalizedQuantity,
          stockAfter: nextStock,
          note: note?.trim() || "Ajuste rápido desde inventario",
        },
      },
    },
  });

  return toStoreProduct(updated);
}

export async function getRecentInventoryMovements(limit = 16) {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const movements = await prisma.inventoryMovement.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      product: {
        select: {
          slug: true,
          name: true,
          sku: true,
        },
      },
    },
  });

  return movements.map(
    (movement): InventoryMovementSummary => ({
      id: movement.id,
      productSlug: movement.product.slug,
      productName: movement.product.name,
      productSku: movement.product.sku,
      type: movement.type,
      quantity: movement.quantity,
      stockAfter: movement.stockAfter,
      note: movement.note,
      createdAt: movement.createdAt,
    }),
  );
}
