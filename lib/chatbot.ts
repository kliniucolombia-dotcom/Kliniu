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

// Levenshtein distance para detectar typos
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

// Umbral: 1 error para palabras cortas, 2 para largas
function fuzzyMatch(token: string, keyword: string): boolean {
  if (token === keyword) return true;
  if (Math.abs(token.length - keyword.length) > 2) return false;
  const maxDist = token.length <= 5 ? 1 : 2;
  return levenshtein(token, keyword) <= maxDist;
}

// Palabras clave del dominio Kliniu para fuzzy matching
const DOMAIN_KEYWORDS = [
  "dispensador","dispensadora","dispensadores","higiene","jabon","papel","toalla",
  "servilleta","dental","cepillo","repuesto","insumo","acero","inoxidable",
  "automatico","sensor","liquid","rollo","institucional","comercial","hotel",
  "restaurante","oficina","clinica","bano","lavamanos","repisa","klinox",
];

const STOP_WORDS = new Set([
  "y","o","de","la","el","los","las","un","una","unos","unas","en","que","es","se",
  "con","por","para","del","al","lo","me","te","mi","tu","su","nos","les","si",
  "no","mas","pero","como","hay","ya","muy","bien","quiero","busco","tengo","necesito",
  "quisiera","podrian","pueden","puedo","tienen","tiene","quiero","dame","dame","ver",
]);

const FUERA_CATALOGO = [
  "cama","colchon","colchones","mueble","muebles","silla","sofa","mesa","escritorio",
  "computador","celular","telefono","televisor","nevera","lavadora","carro","coche",
  "ropa","zapato","comida","medicamento","droga","planta","mascota","juguete","libro",
];

// Sinónimos: palabra del usuario → términos equivalentes del catálogo
const SYNONYMS: Record<string, string[]> = {
  "servilletero":  ["servilleta", "servilletas", "napklin"],
  "servilleteros": ["servilleta", "servilletas", "napklin"],
  "jabonera":      ["jabon", "dispensador"],
  "jaboneras":     ["jabon", "dispensador"],
  "toallero":      ["toalla", "dispensador"],
  "toalleros":     ["toalla", "dispensador"],
  "papelera":      ["papel", "higienico"],
  "papeleras":     ["papel", "higienico"],
  "alcoholero":    ["alcohol", "liquido", "dispensador"],
  "dispensadora":  ["dispensador"],
  "dispensadores": ["dispensador"],
  "inox":          ["inoxidable", "acero", "klinox"],
  "acero":         ["inoxidable", "klinox"],
  "dental":        ["crema dental", "cepillo"],
  "repuesto":      ["insumo", "repuesto"],
  "recarga":       ["insumo", "repuesto"],
  "recargas":      ["insumo", "repuesto"],
  "liquido":       ["liquidos", "jabon"],
  "espuma":        ["espuma", "foam"],
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function tokenize(value: string) {
  const base = normalizeText(value)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));

  const expanded = new Set(base);
  for (const token of base) {
    const synonyms = SYNONYMS[token];
    if (synonyms) synonyms.forEach((s) => expanded.add(s));
  }
  return [...expanded];
}

function scoreProduct(product: StoreProduct, queryTokens: string[]) {
  if (queryTokens.length === 0) return 0;

  const nombre = normalizeText(product.nombre);
  const categoria = normalizeText(product.categoria);
  const marca = normalizeText(product.marca);
  const haystack = normalizeText(
    [product.nombre, product.marca, product.categoria, product.descripcion || "", product.sku || "", product.disponibilidad].join(" "),
  );
  const nombreTokens = nombre.split(/\s+/);
  const haystackTokens = haystack.split(/\s+/);

  return queryTokens.reduce((score, token) => {
    // Exact matches
    if (nombre.includes(token)) return score + 7;
    if (categoria.includes(token)) return score + 5;
    if (marca.includes(token)) return score + 4;
    if (haystack.includes(token)) return score + 2;
    // Fuzzy matches (typos)
    if (nombreTokens.some((w) => fuzzyMatch(token, w))) return score + 5;
    if (haystackTokens.some((w) => fuzzyMatch(token, w))) return score + 1;
    return score;
  }, 0);
}

function getMatchedCategories(query: string) {
  const normalized = normalizeText(query);
  const queryTokens = tokenize(query);

  return categorias.filter((category) => {
    const categoryValue = normalizeText(category);
    const catWords = categoryValue.split(/\s+/).filter((w) => w.length > 3);
    return (
      normalized.includes(categoryValue) ||
      normalized.includes(slugCategoria(category)) ||
      catWords.some((word) => normalized.includes(word)) ||
      queryTokens.some((token) => catWords.some((word) => fuzzyMatch(token, word)))
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
    .slice(0, 6)
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
  return products.slice(0, 4).map((product) => ({
    label: product.nombre,
    href: `/producto/${product.slug}`,
  }));
}

function buildProductCards(products: StoreProduct[]): ChatProductCard[] {
  return products.slice(0, 4).map((product) => ({
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

  // Producto fuera del catálogo (con fuzzy matching para typos)
  // Primero verificar que el mensaje no sea un tipo de espacio conocido (casa, hogar, etc.)
  const ESPACIOS_CHECK = ["hotel","restaurante","oficina","clinica","hospital","colegio","hogar","casa","empresa","gym","gimnasio","salon","bodega","fabrica"];
  const esEspacio = ESPACIOS_CHECK.some((e) => normalized.includes(e));
  const queryTokens2 = tokenize(normalized);
  const fueraItem = !esEspacio && FUERA_CATALOGO.find((word) =>
    normalized.includes(word) || queryTokens2.some((t) => fuzzyMatch(t, word))
  );
  if (fueraItem) {
    const item = fueraItem;
    return {
      message: `Eso no lo manejamos 😅 En Kliniu nos especializamos en dispensadores y productos de higiene institucional, no en ${item}s. ¿Tienes un espacio como oficina, hotel o clínica donde necesites dispensadores? Con gusto te asesoro 👌`,
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

  // Detectar contexto del cliente
  const ESPACIOS = ["hotel","restaurante","oficina","clinica","hospital","colegio","hogar","casa","empresa","gym","gimnasio","salon","bodega","fabrica"];
  const MATERIALES = ["acero","inoxidable","plastico","cromado","abs"];
  const tieneEspacio = ESPACIOS.some((e) => normalized.includes(e));
  const tieneMaterial = MATERIALES.some((m) => normalized.includes(m));

  if (snapshot.matchedProducts.length > 0 || snapshot.matchedCategories.length > 0) {
    // Sin espacio pero CON material → mostrar productos de ese material y pedir espacio
    if (!tieneEspacio && tieneMaterial && snapshot.matchedProducts.length > 0) {
      const label = normalized.includes("acero") || normalized.includes("inoxidable") ? "acero inoxidable" : "plástico ABS";
      return {
        message: `¡Aquí los dispensadores en ${label} 👇\n\n¿Para qué tipo de espacio los necesitas? Así te completo la recomendación.`,
        suggestions: buildCategorySuggestions(snapshot.allCategories),
        products: buildProductCards(snapshot.matchedProducts),
      };
    }

    // Sin espacio y sin material → preguntar espacio primero
    if (!tieneEspacio) {
      return {
        message: `Perfecto, tenemos opciones para eso 👌 Para recomendarte lo ideal, ¿para qué tipo de espacio lo necesitas?\n\n🏨 Hotel · 🍽️ Restaurante · 🏢 Oficina · 🏥 Clínica · 🏠 Hogar · 🏭 Empresa`,
        suggestions: buildCategorySuggestions(snapshot.allCategories),
      };
    }

    // Tiene espacio pero no material → mostrar hasta 4 productos + preguntar material
    if (!tieneMaterial && snapshot.matchedProducts.length > 0) {
      const espacio = normalized.match(new RegExp(ESPACIOS.join("|")))?.[0] ?? "ese espacio";
      return {
        message: `Para ${espacio} tenemos estas opciones 👇\n\n¿Prefieres en acero inoxidable (más duradero) o plástico ABS (más económico)?`,
        suggestions: [
          { label: "Ver todos", href: "/categorias" },
          ...buildProductSuggestions(snapshot.matchedProducts).slice(0, 3),
        ],
        products: buildProductCards(snapshot.matchedProducts),
      };
    }

    // Tiene espacio + material → mostrar todas las opciones relevantes + sugerir combo
    const hasCombo = snapshot.matchedProducts.length > 1;
    return {
      message: `Aquí tienes las opciones para ese espacio 👇${hasCombo ? `\n\n💡 Si llevas el set completo te sale más económico. ¿Te armo una cotización?` : ""}`,
      suggestions: buildProductSuggestions(snapshot.matchedProducts),
      products: buildProductCards(snapshot.matchedProducts),
    };
  }

  if (snapshot.matchedCategories.length > 0) {
    return {
      message: `Tenemos justo esa línea: **${snapshot.matchedCategories.join(", ")}** ✨\n\n¿Para qué tipo de espacio lo necesitas? Así te recomiendo el modelo correcto.`,
      suggestions: buildCategorySuggestions(snapshot.matchedCategories),
    };
  }

  return {
    message: `Hmm, no encontré una coincidencia exacta. Lo que más manejamos en Kliniu es: ${snapshot.allCategories.join(", ")}. ¿Alguna de esas líneas te interesa? 👌`,
    suggestions: buildCategorySuggestions(snapshot.allCategories),
  };
}
