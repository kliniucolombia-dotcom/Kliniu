import {
  categorias,
  formatearMoneda,
  slugCategoria,
  type Categoria,
} from "@/app/data/catalog";
import { getProducts, type StoreProduct } from "@/lib/products";

export type ChatSuggestion = {
  label: string;
  href?: string;
  action?: string;
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
  "codo","elbow","pedal","antiseptico","antibacterial","laboratorio","hospital",
  "secador","brass","espuma","antigoteo","autocorte","palanca","center","pull",
  "napklin","racklin","decoklin","flotante","repisa","luxury","ecotowel",
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
  "metal":         ["acero", "inoxidable", "klinox"],
  "metalico":      ["acero", "inoxidable", "klinox"],
  "metalicos":     ["acero", "inoxidable", "klinox"],
  "metalica":      ["acero", "inoxidable", "klinox"],
  "metalicas":     ["acero", "inoxidable", "klinox"],
  "dental":        ["crema dental", "cepillo"],
  "repuesto":      ["insumo", "repuesto"],
  "repuestos":     ["insumo", "repuesto"],
  "recarga":       ["insumo", "repuesto"],
  "recargas":      ["insumo", "repuesto"],
  "insumos":       ["insumo"],
  "servilletas":   ["servilleta", "napklin"],
  "toallas":       ["toalla"],
  "jabones":       ["jabon"],
  "cepillos":      ["cepillo", "dental"],
  "secadores":     ["secador"],
  "espumas":       ["espuma"],
  "liquidos":      ["liquido", "jabon"],
  "liquido":       ["liquidos", "jabon"],
  "espuma":        ["espuma", "foam"],
  "shampoo":       ["doble", "antigoteo", "liquido"],
  "champu":        ["doble", "antigoteo", "liquido"],
  "champoo":       ["doble", "antigoteo", "liquido"],
  "doble":         ["doble", "dual"],
  "dual":          ["doble", "dual"],
  // Automáticos / sin contacto
  "sensor":        ["automatico", "sensor"],
  "touchless":     ["automatico", "sensor"],
  "touch":         ["automatico", "sensor"],
  // Secador de manos
  "secador":       ["secador", "manos"],
  "secado":        ["secador", "manos"],
  "airblade":      ["secador"],
  "soplador":      ["secador"],
  // Brass / materiales premium
  "brass":         ["brass", "cobre", "zinc"],
  "laton":         ["brass"],
  "bronce":        ["brass"],
  "dorado":        ["brass"],
  "cromado":       ["brass", "acero"],
  // Espuma
  "foam":          ["espuma"],
  // Hotel / decorativo
  "decorativo":    ["decoklin", "hotel", "restaurante"],
  "minimalista":   ["decoklin", "hotel"],
  "flotante":      ["flotante", "decoklin"],
  "repisa":        ["racklin", "repisa"],
  // Paper / toalla
  "rollo":         ["rollo", "toalla", "papel"],
  "autocorte":     ["autocorte", "rollo"],
  "palanca":       ["palanca", "rollo"],
  "interfoleada":  ["toalla", "ecotowel"],
  "center":        ["center", "pull", "toalla"],
  "pull":          ["center", "pull", "toalla"],
  // Higiene dental
  "pasta":         ["crema dental", "cepillo"],
  "cepillo":       ["dental", "cepillo"],
  "dientes":       ["dental", "cepillo"],
  "niños":         ["kids", "dental"],
  "kids":          ["kids", "dental"],
  "codo":          ["codo", "elbow", "jabon"],
  "elbow":         ["codo", "elbow", "jabon"],
  "pedal":         ["codo", "elbow", "jabon"],
  "manos":         ["codo", "jabon"],
  "antiseptico":   ["jabon", "liquido", "dispensador"],
  "antibacterial": ["jabon", "liquido", "dispensador"],
  "laboratorio":   ["codo", "elbow", "clinica"],
  "salud":         ["clinica", "hospital", "codo"],
  "durabilidad":   ["acero", "inoxidable", "klinox"],
  "duradero":      ["acero", "inoxidable", "klinox"],
  "duraderos":     ["acero", "inoxidable", "klinox"],
  "calidad":       ["acero", "inoxidable", "klinox"],
  "resistente":    ["acero", "inoxidable", "klinox"],
  "resistentes":   ["acero", "inoxidable", "klinox"],
  "premium":       ["acero", "inoxidable", "klinox"],
  "clinica":       ["codo", "elbow", "jabon"],
  "hospital":      ["codo", "elbow", "jabon"],
  "consultorio":   ["codo", "elbow", "jabon"],
  "medico":        ["codo", "elbow", "jabon"],
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
    [product.nombre, product.marca, product.categoria, product.descripcion || "", product.sku || "", product.disponibilidad, product.slug].join(" "),
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

const SLUGS_SALUD = ["dispensador-de-jabon-codo-elbow-1000-ml"];
const KEYWORDS_SALUD = ["clinica","hospital","laboratorio","consultorio","medico","salud","codo","elbow","enfermeria","farmacia","veterinaria","odontologia","dentista","optometria","estetica","cosmetologia"];
const SLUGS_DOBLE = ["dispensador-antigoteo-doble-800-ml"];
const KEYWORDS_DOBLE = ["doble","dual","dos productos","jabon y shampoo","shampoo y jabon","jabon y champu","champu y jabon","dos liquidos","dos compartimentos","dos usos","doble uso"];
const KEYWORDS_CALIDAD = ["durabilidad","durable","dura","duradero","duraderos","largo plazo","calidad","higienico","higienicos","mejor","mejores","resistente","resistentes","profesional","premium"];
const KEYWORDS_ALTO_FLUJO = ["hotel","restaurante","oficina","empresa","empresas","fabrica","bodega","gym","gimnasio","salon","colegio","hospital","centro","mall","comercial","plaza","aeropuerto","estadio","universidad","banco","spa","cafeteria","bar","club","alto flujo","alto trafico","mucha gente","muchas personas","concurrido","institucional"];

export async function getCatalogSnapshot(query: string, spaceContext?: string): Promise<CatalogSnapshot> {
  const products = await getProducts();
  const queryTokens = tokenize(query);
  const matchedCategories = getMatchedCategories(query);

  const normalizedQuery = normalizeText(query);
  const contextFull = spaceContext ? `${normalizedQuery} ${normalizeText(spaceContext)}` : normalizedQuery;
  const esSalud = KEYWORDS_SALUD.some((k) => contextFull.includes(k));
  const esCalidad = KEYWORDS_CALIDAD.some((k) => contextFull.includes(k));
  const esAltoFlujo = KEYWORDS_ALTO_FLUJO.some((k) => contextFull.includes(k));
  const esDoble = KEYWORDS_DOBLE.some((k) => contextFull.includes(k));
  // No aplicar boost acero si la consulta también pide plástico (señales contradictorias)
  const esAceroContext = (contextFull.includes("acero") || contextFull.includes("inoxidable") || contextFull.includes("klinox") || contextFull.includes("metalico") || contextFull.includes("metal"))
    && !(contextFull.includes("plastico") || contextFull.includes("abs"));

  const scored = products
    .map((product) => {
      let score = scoreProduct(product, queryTokens) +
        (matchedCategories.includes(product.categoria) ? 6 : 0);
      // Boost para productos de salud (Codo/Elbow)
      if (esSalud && SLUGS_SALUD.includes(product.slug)) score += 50;
      // Boost para dispensador doble cuando buscan dos productos
      if (esDoble && SLUGS_DOBLE.includes(product.slug)) score += 50;
      // Boost para KlinOx cuando preguntan por durabilidad/calidad/lo mejor o alto flujo
      if ((esCalidad || esAltoFlujo) && normalizeText(product.categoria).includes("klinox")) score += 30;
      // Boost para KlinOx cuando el contexto indica acero/inoxidable explícitamente
      if (esAceroContext && normalizeText(product.categoria).includes("klinox")) score += 40;
      // Boost para Hoteles y Restaurantes cuando el espacio es hotel/restaurante/spa
      if (contextFull.match(/hotel|restaurante|spa|bar/) && normalizeText(product.categoria).includes("hoteles")) score += 25;
      return { product, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 6)
    .map((entry) => entry.product);

  return {
    matchedProducts: scored,
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

export function buildProductCards(products: StoreProduct[]): ChatProductCard[] {
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
  suggestions?: ChatSuggestion[];
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

  // Tokens de tipo de producto específico
  const TOKENS_TIPO_ESPECIFICO = new Set([
    "jabon","jabones","jabonera","jaboneras",
    "toalla","toallas",
    "papel","papeles",
    "servilleta","servilletas",
    "dental","cepillo","cepillos",
    "alcohol","gel","liquido","liquidos","espuma","espumas",
    "secador","secadores",
    "automatico","automaticos",
    "doble","dobles","brass","codo","elbow",
    "servilletero","servilleteros",
    "insumo","insumos","repuesto","repuestos","recarga","recargas",
    "napklin","decoklin","racklin",
  ]);
  const tokensQuery = tokenize(normalized);
  const tieneTipoEspecifico = tokensQuery.some((t) => TOKENS_TIPO_ESPECIFICO.has(t));

  // Consulta genérica sin tipo ni espacio → mostrar menú de tipos
  const ESPACIOS_SET = new Set(["hotel","restaurante","oficina","clinica","hospital","colegio","hogar","casa","empresa","gym","gimnasio","salon","bodega","fabrica","centro","mall","comercial","plaza","aeropuerto","estadio","universidad","banco","spa","cafeteria","bar","club"]);
  const tieneEspacioEnQuery = normalized.split(/\s+/).some((t) => ESPACIOS_SET.has(t.normalize("NFD").replace(/[̀-ͯ]/g, "")));
  const esConsultaGenerica = !tieneTipoEspecifico && !tieneEspacioEnQuery;

  if (esConsultaGenerica && normalized.match(/dispensador|producto/)) {
    return {
      message: "¡Claro! ¿Qué tipo de dispensador necesitas? 👇",
      suggestions: [
        { label: "💧 Jabón / Líquidos", action: "dispensador de jabón" },
        { label: "🧻 Papel / Toallas", action: "dispensador de papel y toallas" },
        { label: "🍽️ Servilletas", action: "dispensador de servilletas" },
        { label: "🦷 Crema dental", action: "dispensador de crema dental" },
      ],
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

  // Detectar intención de negocio ANTES del bloque de productos para no quedar atrapado
  // en el "¿Para qué tipo de espacio?" cuando ya está claro que es un negocio
  const BUSINESS_INTENT_PHRASES_EARLY = [
    "voy a hacer","voy a abrir","voy a montar","voy a poner","voy a tener",
    "tengo un","tengo una","abrir un","abrir una","montar un","montar una",
    "para mi negocio","para un negocio","para una empresa","estoy montando",
    "estoy abriendo","quiero abrir","quiero montar","quiero hacer",
    "para el negocio","para la empresa","para mi local","en mi negocio",
    "en mi empresa","en mi local","en el negocio","para mi tienda","para la tienda",
    "quiero vender","voy a vender","vendo","para vender","me dedico a vender",
    "quiero tener un","quiero tener una","voy a tener un","voy a tener una",
    "tengo negocio","mi negocio","mi tienda","mi local","mi empresa",
  ];
  const tieneIntentNegocioEarly = BUSINESS_INTENT_PHRASES_EARLY.some((p) => normalized.includes(p));

  if (tieneIntentNegocioEarly) {
    const ofMatch = normalized.match(/(?:negocio|empresa|local|tienda|establecimiento)\s+de\s+([a-záéíóúñ]+)/);
    const directMatch = normalized.match(/(?:hacer|abrir|montar|poner|tener)\s+(?:un|una)\s+([a-záéíóúñ]+)/);
    const sellMatch = normalized.match(/(?:vender|vendo|vendiendo)\s+([a-záéíóúñ]+)/);
    const businessType = ofMatch?.[1]?.trim() ?? directMatch?.[1]?.trim() ?? sellMatch?.[1]?.trim();

    const SALUD_BIZ = ["clinica","enfermeria","farmacia","veterinaria","odontologia","dentista","optometria","estetica","cosmetologia","medico","salud","hospital","laboratorio","consultorio","morgue","funeraria","tanatologia"];
    const COMIDA_BIZ = ["restaurante","cafeteria","cocina","comida","panaderia","pasteleria","heladeria","pizzeria","sushi","bar","taberna","cantina","fonda","pollo","pollos","carne","carnes","pescado","mariscos","arepas","empanadas","tamales","frutas","verduras","mercado","supermercado","tienda"];
    const HOTEL_BIZ = ["hotel","hostal","posada","alojamiento","residencia","motel"];

    const esNegocioSalud = businessType && SALUD_BIZ.some((k) => businessType.includes(k));
    const esNegocioComida = businessType && COMIDA_BIZ.some((k) => businessType.includes(k));
    const esNegocioHotel = businessType && HOTEL_BIZ.some((k) => businessType.includes(k));

    const intro = businessType
      ? `¡Para una ${businessType}, en Kliniu tenemos exactamente lo que necesitas! 👌`
      : `¡Para tu negocio, en Kliniu tenemos todo en higiene institucional! 👌`;

    if (esNegocioSalud) {
      return {
        message: `${intro}\n\nEn espacios de salud la higiene es crítica. Te recomendamos el Dispensador de Jabón Codo/Elbow (sin contacto de manos) + línea KlinOx Acero Inoxidable. ¿Cuántas unidades necesitas?`,
        suggestions: [
          { label: "💧 Jabón sin contacto", action: "dispensador de jabón codo clínica" },
          { label: "🔩 Línea KlinOx", action: "acero inoxidable clínica" },
          { label: "🧻 Papel / Toallas", action: "dispensador de papel clínica" },
          { label: "💬 Cotizar", action: "quiero cotizar" },
        ],
      };
    }
    if (esNegocioComida) {
      return {
        message: `${intro}\n\nPara negocios de comida lo esencial: jabón en cocina y baños, servilleteros para los clientes y toallas de mano. ¿Qué necesitas primero?`,
        suggestions: [
          { label: "🍽️ Servilleteros", action: "dispensador de servilletas" },
          { label: "💧 Jabón", action: "dispensador de jabón restaurante" },
          { label: "🧻 Toallas de mano", action: "dispensador de toallas restaurante" },
          { label: "🔩 Línea KlinOx", action: "acero inoxidable restaurante" },
        ],
      };
    }
    if (esNegocioHotel) {
      return {
        message: `${intro}\n\nPara hoteles tenemos la línea premium: dispensadores de acero inoxidable, toallas y papel higiénico institucional. ¿Cuántas habitaciones o baños tienes?`,
        suggestions: [
          { label: "🔩 Línea KlinOx", action: "acero inoxidable hotel" },
          { label: "🧻 Papel institucional", action: "dispensador papel higiénico hotel" },
          { label: "🛎️ Ver todo hotel", action: "dispensadores para hotel" },
          { label: "💬 Cotizar", action: "quiero cotizar" },
        ],
      };
    }
    return {
      message: `${intro}\n\nDispensadores de jabón, servilleteros, papel y toallas para cualquier tipo de negocio. ¿Qué necesitas primero?`,
      suggestions: [
        { label: "💧 Jabón / Gel", action: "dispensador de jabón" },
        { label: "🍽️ Servilleteros", action: "dispensador de servilletas" },
        { label: "🧻 Papel / Toallas", action: "dispensador de papel y toallas" },
        { label: "🔩 Línea profesional", action: "acero inoxidable" },
      ],
    };
  }

  // Detectar contexto del cliente
  const ESPACIOS = ["hotel","restaurante","oficina","clinica","hospital","colegio","hogar","casa","empresa","gym","gimnasio","salon","bodega","fabrica","centro","mall","comercial","plaza","parque","aeropuerto","estadio","universidad","colegio","banco","spa","cafeteria","bar","discoteca","club"];
  const ESPACIOS_SALUD = ["clinica","hospital","laboratorio","consultorio","medico","salud","enfermeria","farmacia","veterinaria","odontologia","dentista","morgue","funeraria"];
  const MATERIALES = ["acero","inoxidable","plastico","cromado","abs","metal","metalico","metalicos","metalica","metalicas"];
  const tieneEspacio = ESPACIOS.some((e) => normalized.includes(e));
  const esEspacioSalud = ESPACIOS_SALUD.some((e) => normalized.includes(e));
  const tieneMaterial = MATERIALES.some((m) => normalized.includes(m));

  if (snapshot.matchedProducts.length > 0 || snapshot.matchedCategories.length > 0) {
    // Sin espacio pero CON material → mostrar productos de ese material con mensaje contextual
    if (!tieneEspacio && tieneMaterial && snapshot.matchedProducts.length > 0) {
      const esAcero = normalized.includes("acero") || normalized.includes("inoxidable") || normalized.includes("metalico") || normalized.includes("metalicos") || normalized.includes("metal");
      const mensajeMaterial = esAcero
        ? `¡Excelente elección! 🔩 El acero inoxidable dura 3-5 veces más que el plástico, resiste golpes y humedad constante, y es más higiénico porque no absorbe bacterias ni olores. Aquí los tienes 👇`
        : `¡Perfecto! 🧴 El plástico ABS es liviano, práctico y muy popular para uso moderado. Aquí las opciones disponibles 👇`;

      const productosParaMostrar = esAcero
        ? snapshot.matchedProducts.filter((p) => {
            const n = normalizeText(p.nombre);
            const c = normalizeText(p.categoria);
            return c.includes("klinox") || n.includes("acero") || n.includes("inoxidable") || n.includes("brass");
          })
        : snapshot.matchedProducts.filter((p) => {
            const n = normalizeText(p.nombre);
            const c = normalizeText(p.categoria);
            return !c.includes("klinox") && !n.includes("acero") && !n.includes("inoxidable") && !n.includes("brass");
          });

      if (productosParaMostrar.length === 0 && !esAcero) {
        return {
          message: `Para esa categoría manejamos principalmente la línea en acero inoxidable KlinOx 👌 ¿Te muestro esas opciones?`,
          suggestions: [
            { label: "🔩 Ver en acero inoxidable", action: "acero inoxidable" },
          ],
        };
      }

      const productosFinales = productosParaMostrar.length > 0 ? productosParaMostrar : snapshot.matchedProducts;

      return {
        message: mensajeMaterial,
        products: buildProductCards(productosFinales),
      };
    }

    // Sin espacio pero producto MUY específico → mostrar directo sin pedir espacio
    // Productos tan específicos que no necesitan pregunta de material ni espacio
    const KEYWORDS_DIRECTO = [
      "automatico","automaticos","sensor","secador","doble","dual","brass","laton",
      "espuma","foam","codo","elbow","autocorte","palanca","dental","cepillo","kids",
      "napklin","servilletero","servilleteros","decoklin","racklin","flotante",
      "insumo","repuesto","recarga",
    ];
    // Tipos de producto que sí tienen versión acero y plástico → preguntar material
    const TIPOS_CON_MATERIAL = ["jabon","jabonera","toalla","papel","servilleta","liquido","alcohol","gel","higienico"];
    // Tokens genéricos que no definen el tipo de producto
    const TOKENS_GENERICOS = new Set(["dispensador","dispensadores","dispensadora","higiene","producto","productos"]);
    const queryTokensAll = tokenize(normalized);
    const esMuyEspecifico = KEYWORDS_DIRECTO.some((k) => queryTokensAll.includes(k) || normalized.includes(k));

    // Tipo de producto con versión acero y plástico → preguntar material primero
    const tieneTipoConMaterial = TIPOS_CON_MATERIAL.some((k) => queryTokensAll.includes(k) || normalized.includes(k));
    if (!tieneEspacio && !tieneMaterial && tieneTipoConMaterial && snapshot.matchedProducts.length > 0) {
      const productosAceroPreview = snapshot.matchedProducts.filter((p) => {
        const c = normalizeText(p.categoria);
        const n = normalizeText(p.nombre);
        return c.includes("klinox") || n.includes("acero") || n.includes("inoxidable") || n.includes("brass");
      });
      return {
        message: `Tenemos opciones para eso 👌\n\n🔩 **Acero inoxidable** — más duradero, higiénico y profesional. Ideal para uso intensivo y largo plazo.\n🧴 **Plástico ABS** — más económico, práctico para uso moderado.\n\n¿Cuál prefieres?`,
        suggestions: [
          { label: "🔩 Acero inoxidable", action: "acero inoxidable" },
          { label: "🧴 Plástico ABS", action: "plastico ABS" },
        ],
        products: productosAceroPreview.length > 0 ? buildProductCards(productosAceroPreview) : undefined,
      };
    }

    if (!tieneEspacio && esMuyEspecifico && snapshot.matchedProducts.length > 0) {
      // Filtrar: el producto debe coincidir con el token específico, no solo con tokens genéricos
      const tokensEspecificos = queryTokensAll.filter((t) => !TOKENS_GENERICOS.has(t));
      // Tokens de tipo de producto (jabón, toalla, papel...) deben ALL coincidir para filtrar
      const TIPO_PRODUCTO = new Set(["jabon","jabonera","toalla","papel","servilleta","dental","alcohol","gel","espuma","liquido","liquidos","crema","secador","doble"]);
      const tipoTokens = tokensEspecificos.filter((t) => TIPO_PRODUCTO.has(t));

      const productosEspecificos = tokensEspecificos.length > 0
        ? snapshot.matchedProducts.filter((p) => {
            const n = normalizeText(p.nombre);
            const d = normalizeText(p.descripcion || "");
            const h = `${n} ${d} ${p.slug}`;
            // Si hay tokens de tipo de producto, el producto debe coincidir con AL MENOS UNO
            if (tipoTokens.length > 0) return tipoTokens.some((t) => h.includes(t));
            return tokensEspecificos.some((t) => h.includes(t));
          })
        : snapshot.matchedProducts;

      const productosFinales = productosEspecificos.length > 0 ? productosEspecificos : snapshot.matchedProducts;

      return {
        message: `¡Claro! Aquí los tienes 👇\n\n¿Para qué tipo de espacio los necesitas? Así te doy más detalles sobre la mejor opción.`,
        suggestions: buildProductSuggestions(productosFinales),
        products: buildProductCards(productosFinales),
      };
    }

    // Sin espacio y sin producto específico → preguntar espacio primero
    if (!tieneEspacio) {
      return {
        message: `Perfecto, tenemos opciones para eso 👌 ¿Para qué tipo de espacio lo necesitas?`,
      };
    }

    // Espacio de salud (clínica/hospital) → mostrar directo sin preguntar material
    if (esEspacioSalud && snapshot.matchedProducts.length > 0) {
      return {
        message: `Para clínicas y espacios de salud tenemos estas opciones 👇\n\n🏥 El Dispensador Codo (Elbow) es clave en protocolos de higiene médica: se activa con el codo o antebrazo sin contacto de manos. ¿Te armo una cotización?`,
        suggestions: buildProductSuggestions(snapshot.matchedProducts),
        products: buildProductCards(snapshot.matchedProducts),
      };
    }

    // Tiene espacio pero no material → KlinOx primero; plástico solo para hogar
    if (!tieneMaterial && snapshot.matchedProducts.length > 0) {
      const espacio = normalized.match(new RegExp(ESPACIOS.join("|")))?.[0] ?? "ese espacio";
      const esHogar = normalized.includes("hogar") || normalized.includes("casa");

      const productosAcero = snapshot.matchedProducts.filter((p) => {
        const n = normalizeText(p.nombre);
        const c = normalizeText(p.categoria);
        return c.includes("klinox") || n.includes("acero") || n.includes("inoxidable") || n.includes("brass") || n.includes("codo") || n.includes("elbow");
      });

      const productosParaMostrar = !esHogar && productosAcero.length > 0 ? productosAcero : snapshot.matchedProducts;

      return {
        message: !esHogar && productosAcero.length > 0
          ? `Para ${espacio} te recomiendo estos 👇\n\n💪 Son los más usados en espacios con alto flujo: acero inoxidable, duraderos, fáciles de limpiar y con imagen profesional. También tenemos opciones en plástico ABS si buscas algo más económico.`
          : `Para ${espacio} tenemos estas opciones 👇`,
        suggestions: [
          { label: "Ver todos", href: "/categorias" },
          ...buildProductSuggestions(productosParaMostrar).slice(0, 3),
        ],
        products: buildProductCards(productosParaMostrar),
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
