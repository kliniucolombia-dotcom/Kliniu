import {
  categorias,
  formatearMoneda,
  slugCategoria,
  type Categoria,
} from "@/app/data/catalog";
import { getProducts, type StoreProduct } from "@/lib/products";

export type ChatSuggestion = {
  label: string;
  href: string;
};

export type ChatProductCard = {
  slug: string;
  nombre: string;
  precio: string;
  imagen: string;
  href: string;
};

export type CatalogSnapshot = {
  matchedProducts: StoreProduct[];
  matchedCategories: Categoria[];
  allCategories: Categoria[];
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function scoreProduct(product: StoreProduct, queryTokens: string[]) {
  if (queryTokens.length === 0) return 0;

  const haystack = normalizeText(
    [
      product.nombre,
      product.marca,
      product.categoria,
      product.descripcion || "",
      product.sku || "",
      product.disponibilidad,
    ].join(" "),
  );

  return queryTokens.reduce((score, token) => {
    if (normalizeText(product.nombre).includes(token)) return score + 7;
    if (normalizeText(product.categoria).includes(token)) return score + 5;
    if (normalizeText(product.marca).includes(token)) return score + 4;
    if (haystack.includes(token)) return score + 2;
    return score;
  }, 0);
}

function getMatchedCategories(query: string) {
  const normalized = normalizeText(query);

  return categorias.filter((category) => {
    const categoryValue = normalizeText(category);
    return (
      normalized.includes(categoryValue) ||
      normalized.includes(slugCategoria(category)) ||
      categoryValue.split(" ").some((word) => normalized.includes(word))
    );
  });
}

export async function getCatalogSnapshot(query: string): Promise<CatalogSnapshot> {
  const products = await getProducts();
  const queryTokens = tokenize(query);
  const matchedCategories = getMatchedCategories(query);

  const matchedProducts = products
    .map((product) => ({
      product,
      score:
        scoreProduct(product, queryTokens) +
        (matchedCategories.includes(product.categoria) ? 6 : 0),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 5)
    .map((entry) => entry.product);

  return {
    matchedProducts,
    matchedCategories,
    allCategories: categorias,
  };
}

export function buildCatalogContext(snapshot: CatalogSnapshot) {
  const productLines =
    snapshot.matchedProducts.length > 0
      ? snapshot.matchedProducts
          .map((product) => {
            return `- ${product.nombre} | categoria: ${product.categoria} | marca: ${product.marca} | precio: ${formatearMoneda(product.precioValor)} | disponibilidad: ${product.disponibilidad} | stock: ${product.stock ?? 0} | link: /producto/${product.slug}`;
          })
          .join("\n")
      : "- No hubo coincidencias directas en el catálogo para esta consulta.";

  return [
    `Categorias disponibles: ${snapshot.allCategories.join(", ")}.`,
    snapshot.matchedCategories.length > 0
      ? `Categorias relacionadas con la consulta: ${snapshot.matchedCategories.join(", ")}.`
      : "No hubo una categoría exacta identificada en la consulta.",
    "Productos más relevantes del catálogo:",
    productLines,
  ].join("\n");
}

function buildProductSuggestions(products: StoreProduct[]): ChatSuggestion[] {
  return products.slice(0, 3).map((product) => ({
    label: product.nombre,
    href: `/producto/${product.slug}`,
  }));
}

function buildProductCards(products: StoreProduct[]): ChatProductCard[] {
  return products.slice(0, 3).map((product) => ({
    slug: product.slug,
    nombre: product.nombre,
    precio: product.precio,
    imagen: product.imagen,
    href: `/producto/${product.slug}`,
  }));
}

function buildCategorySuggestions(categoriesToSuggest: Categoria[]): ChatSuggestion[] {
  return categoriesToSuggest.slice(0, 3).map((category) => ({
    label: category,
    href: `/categorias?categoria=${slugCategoria(category)}`,
  }));
}

export function buildLocalAssistantReply(
  query: string,
  snapshot: CatalogSnapshot,
): {
  message: string;
  suggestions: ChatSuggestion[];
  products?: ChatProductCard[];
} {
  const normalized = normalizeText(query);

  if (!normalized) {
    return {
      message:
        "¡Hola! Soy KLINIU AI 👋 Tu asesor comercial. ¿Para qué tipo de espacio estás buscando soluciones de higiene? (hotel, oficina, clínica, hogar...)",
      suggestions: buildCategorySuggestions(snapshot.allCategories),
    };
  }

  // Saludo sin pregunta específica
  if (
    (normalized === "hola" ||
      normalized === "buenas" ||
      normalized === "buenos dias" ||
      normalized === "buenas tardes" ||
      normalized === "buenas noches") &&
    !normalized.includes("product") &&
    !normalized.includes("vend") &&
    !normalized.includes("catalo")
  ) {
    return {
      message:
        "¡Hola! Soy KLINIU AI 👋 Me especializo en dispensadores institucionales y soluciones de higiene para empresas, hoteles, clínicas y hogares en Colombia. ¿Para qué tipo de espacio estás buscando?",
      suggestions: buildCategorySuggestions(snapshot.allCategories),
    };
  }

  // Pregunta genérica sobre qué venden / catálogo
  if (
    normalized.includes("que vend") ||
    normalized.includes("que tienen") ||
    normalized.includes("que product") ||
    normalized.includes("que catalo") ||
    normalized.includes("que ofrecen") ||
    normalized.includes("que manejan") ||
    normalized.includes("que comercializ") ||
    (normalized.includes("product") &&
      (normalized.includes("tienen") ||
        normalized.includes("venden") ||
        normalized.includes("manejan")))
  ) {
    const cats = snapshot.allCategories.join(", ");
    return {
      message: `¡Claro! 🔥 En Kliniu manejamos: ${cats}. Nos enfocamos en soluciones para empresas, hoteles, restaurantes, clínicas y hogares. ¿Para qué tipo de espacio lo necesitas? Así te recomiendo lo ideal.`,
      suggestions: buildCategorySuggestions(snapshot.allCategories),
    };
  }

  // Preguntas de precio sin contexto
  if (
    normalized.includes("precio") ||
    normalized.includes("cuanto cuesta") ||
    normalized.includes("cuanto vale") ||
    normalized.includes("cotiza")
  ) {
    return {
      message:
        "¡Con gusto! 👌 Para cotizarte correctamente, ¿cuántas unidades necesitas y para qué tipo de espacio sería? (hotel, oficina, clínica, hogar...)",
      suggestions: buildCategorySuggestions(snapshot.allCategories),
    };
  }

  if (
    normalized.includes("envio") ||
    normalized.includes("domicilio") ||
    normalized.includes("transportadora") ||
    normalized.includes("despacho")
  ) {
    return {
      message:
        "Los envíos los rastreás desde tu cuenta paso a paso 👌 ¿Necesitas ayuda para encontrar algún producto primero?",
      suggestions: [
        { label: "Ver categorías", href: "/categorias" },
        { label: "Mi cuenta", href: "/mi-cuenta" },
      ],
    };
  }

  if (
    normalized.includes("pago") ||
    normalized.includes("wompi") ||
    normalized.includes("tarjeta")
  ) {
    return {
      message:
        "El pago se hace directo desde el carrito, es rápido y seguro 👌 ¿Te ayudo a encontrar el producto que buscas?",
      suggestions: [{ label: "Ir al carrito", href: "/carrito" }],
    };
  }

  if (
    normalized.includes("pedido") ||
    normalized.includes("orden") ||
    normalized.includes("seguimiento")
  ) {
    return {
      message:
        "Para ver tu pedido entra a tu cuenta — ahí está la guía, transportadora y estado del despacho en tiempo real 👌",
      suggestions: [{ label: "Mi cuenta", href: "/mi-cuenta" }],
    };
  }

  if (
    normalized.includes("mayorista") ||
    normalized.includes("distribuidor") ||
    normalized.includes("por mayor") ||
    normalized.includes("volumen")
  ) {
    return {
      message:
        "Perfecto 👌 Manejamos atención especial para distribuidores y compras empresariales. ¿Qué líneas de productos te interesan comercializar? Te conecto con el equipo comercial.",
      suggestions: buildCategorySuggestions(snapshot.allCategories),
    };
  }

  if (snapshot.matchedProducts.length > 0) {
    return {
      message: `Mira, tengo justo lo que buscas 🔥 ¿Para qué tipo de espacio es? Así te recomiendo la combinación ideal.`,
      suggestions: buildProductSuggestions(snapshot.matchedProducts),
      products: buildProductCards(snapshot.matchedProducts),
    };
  }

  if (snapshot.matchedCategories.length > 0) {
    return {
      message: `Para eso tenemos la línea de ${snapshot.matchedCategories.join(", ")} ✨ ¿La abrimos para ver las opciones disponibles?`,
      suggestions: buildCategorySuggestions(snapshot.matchedCategories),
    };
  }

  return {
    message: `Hmm, no encontré una coincidencia exacta. Lo que más manejamos en Kliniu es: ${snapshot.allCategories.join(", ")}. ¿Alguna de esas líneas te interesa? 👌`,
    suggestions: buildCategorySuggestions(snapshot.allCategories),
  };
}
