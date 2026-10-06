import OpenAI from "openai";
import type { WatiCommercialStage } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { sendWatiMessage } from "@/lib/wati";
import { broadcastPanelUpdate } from "@/lib/realtime";
import { createNotification } from "@/lib/notifications";
import { getProducts, type StoreProduct } from "@/lib/products";

/**
 * Remarketing en 5 etapas (spec "Remarketing automatizado con IA", oct-2026).
 * El backend decide cuándo y con qué datos; la IA solo redacta el mensaje.
 * Todo cae dentro de las 24 h de sesión de WhatsApp desde el último mensaje del
 * cliente: pasada esa ventana no se envía nada (requeriría plantilla).
 */

export type RemarketingPromotion = {
  id: string;
  title: string;
  description: string;
  /** Vacíos = aplica a todo el catálogo. */
  productSlugs: string[];
  categories: string[];
  /** YYYY-MM-DD, hora Colombia, inclusive. */
  startsAt: string;
  endsAt: string;
  gift: boolean;
  shippingIncluded: boolean;
};

export type RemarketingConfig = {
  enabled: boolean;
  /** Minutos desde el último mensaje del cliente para cada etapa 1..5. */
  delaysMin: number[];
  /** Días permitidos (0 = domingo … 6 = sábado), hora Colombia. Sin franja horaria. */
  days: number[];
  /** Días mínimos entre el inicio de una secuencia y la siguiente. */
  cooldownDays: number;
  promotions: RemarketingPromotion[];
  /** Matriz manual: slug -> hasta 2 slugs alternativos. Sin entrada = misma categoría. */
  alternatives: Record<string, string[]>;
  /** Regla de volumen autorizada por categoría ("*" = todas). */
  volumeRules: Record<string, string>;
  /** Texto autorizado de cuándo el envío va incluido; vacío = solo la tarifa estándar. */
  shippingIncludedRule: string;
  cashOnDelivery: boolean;
};

const CONFIG_KEY = "wati_remarketing";
const DEFAULT_CONFIG: RemarketingConfig = {
  enabled: true,
  delaysMin: [270, 540, 810, 1080, 1350],
  days: [1, 2, 3, 4, 5, 6],
  cooldownDays: 7,
  promotions: [],
  alternatives: {},
  volumeRules: {},
  shippingIncludedRule: "",
  cashOnDelivery: true,
};
const WHATSAPP_WINDOW_MS = 24 * 60 * 60 * 1000;
const WINDOW_SAFETY_MS = 10 * 60 * 1000;
const BLOCKED_STAGES: WatiCommercialStage[] = ["CHECKOUT", "CLOSED", "LOST"];
const COMMERCIAL_STAGES: WatiCommercialStage[] = [
  "DISCOVERY", "PRODUCT_SHOWN", "PRICE_SHOWN", "QUANTITY_REQUESTED", "QUOTE_SENT",
  "OBJECTION_PRICE", "OBJECTION_THINKING", "PURCHASE_INTENT", "CHECKOUT", "CLOSED", "LOST",
];

type UsedItems = { benefits: string[]; ctas: string[]; products: string[] };

export async function getRemarketingConfig(): Promise<RemarketingConfig> {
  const row = await prisma!.appConfig.findUnique({ where: { key: CONFIG_KEY } });
  if (!row) return DEFAULT_CONFIG;
  try {
    return { ...DEFAULT_CONFIG, ...(JSON.parse(row.value) as Partial<RemarketingConfig>) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveRemarketingConfig(config: RemarketingConfig) {
  const value = JSON.stringify(config);
  await prisma!.appConfig.upsert({ where: { key: CONFIG_KEY }, update: { value }, create: { key: CONFIG_KEY, value } });
}

function bogotaDate(date: Date) {
  return new Date(date.getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function activePromotions(config: RemarketingConfig, product: StoreProduct | null, now: Date) {
  const today = bogotaDate(now);
  return config.promotions.filter(
    (p) =>
      p.startsAt <= today &&
      today <= p.endsAt &&
      ((p.productSlugs.length === 0 && p.categories.length === 0) ||
        (product && (p.productSlugs.includes(product.slug) || p.categories.includes(product.categoria)))),
  );
}

/**
 * Condiciones comerciales autorizadas en texto para el asistente normal (capa 3
 * del Sistema Maestro). Misma fuente que usa el remarketing: el panel
 * /panel/whatsapp/remarketing.
 */
export async function buildCommercialConditionsPrompt(now = new Date()) {
  const config = await getRemarketingConfig();
  const today = bogotaDate(now);
  const promos = config.promotions.filter((p) => p.startsAt <= today && today <= p.endsAt);
  const volume = Object.entries(config.volumeRules);
  return [
    "CONDICIONES COMERCIALES AUTORIZADAS (única fuente para envío, pago, descuentos, regalos y promociones; lo que no esté aquí NO existe):",
    "- Envío: Bogotá D.C. gratis; resto de Colombia $12.000 COP." +
      (config.shippingIncludedRule ? ` Envío incluido autorizado: ${config.shippingIncludedRule}.` : " No hay otra regla de envío incluido."),
    `- Pago contra entrega: ${config.cashOnDelivery ? "disponible para pedidos por WhatsApp" : "NO disponible; no lo ofrezcas"}.`,
    volume.length
      ? "- Reglas por volumen: " + volume.map(([cat, rule]) => `${cat === "*" ? "todas las categorías" : cat}: ${rule}`).join(" | ")
      : "- Reglas por volumen: ninguna cargada (no ofrezcas descuento; toma la cantidad y un asesor confirma el precio especial).",
    promos.length
      ? "- Promociones vigentes: " +
        promos
          .map((p) => {
            const scope = [...p.categories, ...p.productSlugs].join(", ") || "todo el catálogo";
            return `${p.title} (${scope}, hasta ${p.endsAt}): ${p.description}${p.gift ? " [incluye regalo]" : ""}${p.shippingIncluded ? " [envío incluido]" : ""}`;
          })
          .join(" | ")
      : "- Promociones vigentes: ninguna (no ofrezcas regalos ni descuentos).",
  ].join("\n");
}

const STATE_PROMPT = `Extrae el estado comercial de esta conversación de WhatsApp de KLINIU. Usa SOLO lo que el cliente dijo explícitamente; si un dato no aparece, devuelve null (no lo deduzcas).
Devuelve SOLO JSON: {"city": string|null, "business_type": string|null (restaurante, hotel, oficina, empresa, hogar, clínica…), "chosen_product_slug": string|null (slug del enlace /producto/<slug> del producto que el cliente eligió), "quantity": number|null, "objection": string|null (precio, lo voy a pensar, durabilidad…; null si ya se resolvió), "dispatch_data_complete": boolean (true SOLO si el cliente escribió su nombre completo Y una dirección exacta con calle/carrera y número Y la ciudad), "conversation_stage": uno de ${COMMERCIAL_STAGES.join("|")} (etapa actual de la venta)}`;

/**
 * Actualiza el estado estructurado de la conversación con lo último hablado.
 * Solo sobrescribe un campo cuando la IA trae un valor nuevo (null = sin cambio).
 */
export async function updateConversationState(conversationId: string) {
  if (!prisma || !process.env.OPENAI_API_KEY) return;
  const conversation = await prisma.watiConversation.findUnique({
    where: { id: conversationId },
    select: {
      customerCity: true, businessType: true, chosenProductSlug: true, quantityRequested: true,
      lastObjection: true, dispatchDataComplete: true, memorySummary: true,
      messages: { orderBy: { createdAt: "desc" }, take: 12, select: { role: true, content: true } },
    },
  });
  if (!conversation) return;
  const transcript = [...conversation.messages].reverse().map((m) => `${m.role}: ${m.content}`).join("\n");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_WATI_MODEL ?? "gpt-4.1-mini",
    temperature: 0,
    max_tokens: 200,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: STATE_PROMPT },
      {
        role: "user",
        content: JSON.stringify({
          previous_state: {
            city: conversation.customerCity, business_type: conversation.businessType,
            chosen_product_slug: conversation.chosenProductSlug, quantity: conversation.quantityRequested,
            objection: conversation.lastObjection,
          },
          memory_summary: conversation.memorySummary,
          conversation: transcript,
        }),
      },
    ],
  });
  const out = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as {
    city?: string | null; business_type?: string | null; chosen_product_slug?: string | null;
    quantity?: number | null; objection?: string | null; dispatch_data_complete?: boolean;
    conversation_stage?: string;
  };
  const stage = COMMERCIAL_STAGES.find((value) => value === out.conversation_stage);
  const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 120) : undefined);
  await prisma.watiConversation.update({
    where: { id: conversationId },
    data: {
      customerCity: text(out.city),
      businessType: text(out.business_type),
      chosenProductSlug: text(out.chosen_product_slug),
      quantityRequested: Number.isInteger(out.quantity) && out.quantity! > 0 ? out.quantity : undefined,
      // La objeción sí se limpia cuando ya no aplica.
      lastObjection: out.objection === undefined ? undefined : text(out.objection) ?? null,
      dispatchDataComplete: typeof out.dispatch_data_complete === "boolean" ? out.dispatch_data_complete : undefined,
    },
  });
  // CHECKOUT/CLOSED solo los fija el sistema (pedido creado); la IA no los revierte ni los otorga.
  if (stage && !BLOCKED_STAGES.includes(stage)) {
    await prisma.watiConversation.updateMany({
      where: { id: conversationId, commercialStage: { notIn: ["CHECKOUT", "CLOSED"] } },
      data: { commercialStage: stage },
    });
  }
}

/** Estado estructurado en texto para el asistente: evita repreguntar datos ya dados. */
export async function buildConversationStatePrompt(conversationId: string) {
  const c = await prisma!.watiConversation.findUnique({
    where: { id: conversationId },
    select: {
      commercialStage: true, customerCity: true, businessType: true, chosenProductSlug: true,
      quantityRequested: true, lastObjection: true, dispatchDataComplete: true,
    },
  });
  if (!c) return null;
  const rows = [
    `etapa comercial: ${c.commercialStage}`,
    c.customerCity && `ciudad: ${c.customerCity}`,
    c.businessType && `tipo de negocio/espacio: ${c.businessType}`,
    c.chosenProductSlug && `producto elegido (slug): ${c.chosenProductSlug}`,
    c.quantityRequested && `cantidad pedida: ${c.quantityRequested}`,
    c.lastObjection && `objeción abierta: ${c.lastObjection}`,
    c.dispatchDataComplete && "datos de despacho: completos",
  ].filter(Boolean);
  return `ESTADO DE LA CONVERSACIÓN (datos ya confirmados por el cliente; no los vuelvas a preguntar y úsalos para avanzar al siguiente paso):\n- ${rows.join("\n- ")}`;
}

function bogotaWeekday(date: Date) {
  // Colombia es UTC-5 fijo (sin horario de verano).
  return new Date(date.getTime() - 5 * 60 * 60 * 1000).getUTCDay();
}

function readUsed(value: unknown): UsedItems {
  const v = (value ?? {}) as Partial<UsedItems>;
  return { benefits: v.benefits ?? [], ctas: v.ctas ?? [], products: v.products ?? [] };
}

// "No me contacten" explícito: vale en cualquier momento.
const OPT_OUT_PATTERN =
  /\b(no me (escriban|escribas|contacten|contactes|interesa|molesten|molestes|llamen|llames)|no (me )?(vuelvan|vuelvas) a (escribir|contactar|llamar)|no (me )?(envien|manden|envies|mandes) mas|dejen de (escribir|molestar|contactar)|deja de (escribir|molestar|contactar)|(eliminen|borren|quiten) mi (numero|contacto)|quitenme|darme de baja|no estoy interesad[oa]|no (quiero|deseo) (recibir|mas mensajes|que me)|stop|basta)\b/;

// Rechazo suave: solo cuenta como tal si responde a un remarketing ("no gracias" a
// otra pregunta del bot no significa que no quiera ser contactado).
const DECLINE_PATTERN =
  /\b(no,? (senora?,? |sra?\.?,? )?gracias|solo (estaba )?pregunta[bv]a|ya (me|nos) l[oa]s? regalaron|ya (compre|compramos|adquiri|adquirimos|tengo|tenemos|lo resolvi|conseguimos|consegui)|(compre|compramos) en otro|ya no (necesito|necesitamos|requiero|me interesa|lo necesito)|no (necesito|necesitamos|requiero|me hace falta))\b/;

/** Intención de salida del cliente en su mensaje. */
export function classifyExitIntent(text: string, afterRemarketing: boolean): "OPT_OUT" | "DECLINED" | null {
  const normalized = normalizeText(text);
  if (OPT_OUT_PATTERN.test(normalized)) return "OPT_OUT";
  if (afterRemarketing && DECLINE_PATTERN.test(normalized)) return "DECLINED";
  return null;
}

/**
 * Se llama con cada mensaje entrante del cliente: cancela la secuencia
 * pendiente, marca el último envío como respondido y registra la exclusión
 * si el cliente pide no ser contactado.
 */
export async function cancelRemarketingOnReply(conversationId: string, text: string) {
  if (!prisma) return;
  const now = new Date();

  // La respuesta se atribuye al último envío; los anteriores quedan sin respuesta.
  const last = await prisma.watiRemarketingEvent.findFirst({
    where: { conversationId, outcome: "PENDING" },
    orderBy: { sentAt: "desc" },
    select: { id: true, stage: true },
  });
  const exit = classifyExitIntent(text, Boolean(last));

  if (last) {
    await prisma.watiRemarketingEvent.update({
      where: { id: last.id },
      data: { outcome: exit === "OPT_OUT" ? "OPTED_OUT" : exit === "DECLINED" ? "DECLINED" : "REPLIED", repliedAt: now },
    });
    await prisma.watiRemarketingEvent.updateMany({
      where: { conversationId, outcome: "PENDING" },
      data: { outcome: "NO_REPLY" },
    });
  }
  await prisma.watiConversation.update({
    where: { id: conversationId },
    data: {
      remarketingStage: 0,
      remarketingNextAt: null,
      remarketingUsed: {},
      ...(exit === "OPT_OUT" ? { remarketingOptOut: true, commercialStage: "LOST" } : {}),
      ...(exit === "DECLINED" ? { commercialStage: "LOST" } : {}),
    },
  });

  // Cliente recuperado: avisa al vendedor asignado para que no se pierda el lead.
  if (last && !exit) {
    const conversation = await prisma.watiConversation.findUnique({
      where: { id: conversationId },
      select: { phone: true, contactName: true, assignedSellerId: true },
    });
    if (conversation) {
      await createNotification({
        eventKey: "wati.remarketing_reply",
        title: `WhatsApp: ${conversation.contactName ?? conversation.phone} respondió al remarketing`,
        detail: `Respondió tras el seguimiento de la etapa ${last.stage}: "${text.slice(0, 120)}". El bot continúa la atención; revisa el chat para cerrar la venta.`,
        href: "/panel/whatsapp",
        targetUserId: conversation.assignedSellerId ?? undefined,
        metadata: { conversationId, phone: conversation.phone, stage: last.stage },
      }).catch((error) => console.error("WATI_REMARKETING_NOTIFY_FAILED", conversationId, error));
    }
  }
}

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Etapa comercial tras cada intercambio normal del bot (heurística barata, sin
 * llamada extra a la IA). El generador de remarketing la afina al enviar.
 */
export function detectCommercialStage(
  current: WatiCommercialStage,
  customerText: string,
  botReply: string,
  orderCreated: boolean,
): WatiCommercialStage {
  if (orderCreated) return "CHECKOUT";
  if (current === "CLOSED" || current === "CHECKOUT") return current;
  const user = normalizeText(customerText);
  const bot = normalizeText(botReply);
  if (OPT_OUT_PATTERN.test(user)) return "LOST";
  if (/\b(lo quiero|los quiero|quiero comprar|como (pago|compro)|hagamos el pedido|me lo (envian|mandan)|confirmo|listo,? (lo|los) (compro|pido))\b/.test(user)) return "PURCHASE_INTENT";
  if (/\b(cotiza|cotizacion)\b/.test(user) || /\bcotizacion\b/.test(bot)) return "QUOTE_SENT";
  if (/\b(caro|costoso|muy alto|mas barato|descuento)\b/.test(user)) return "OBJECTION_PRICE";
  if (/\b(lo pienso|lo voy a pensar|te aviso|le aviso|despues te|mas tarde|lo consulto)\b/.test(user)) return "OBJECTION_THINKING";
  if (/\b\d+\s*(unidades|und|uds|piezas|dispensadores)\b/.test(user)) return "QUANTITY_REQUESTED";
  const ranked: WatiCommercialStage[] = ["DISCOVERY", "PRODUCT_SHOWN", "PRICE_SHOWN"];
  const next = /\$\s?\d/.test(botReply) ? "PRICE_SHOWN" : /\/producto\//.test(bot) ? "PRODUCT_SHOWN" : "DISCOVERY";
  // Nunca retroceder por un mensaje neutro.
  return ranked.includes(current) && ranked.indexOf(next) > ranked.indexOf(current) ? next : current;
}

function findDiscussedProduct(products: StoreProduct[], transcript: string) {
  const text = transcript.toLowerCase();
  let best: { product: StoreProduct; pos: number } | null = null;
  for (const product of products) {
    const pos = Math.max(
      text.lastIndexOf(`/producto/${product.slug}`),
      text.lastIndexOf(product.nombre.toLowerCase()),
    );
    if (pos >= 0 && (!best || pos > best.pos)) best = { product, pos };
  }
  return best?.product ?? null;
}

const HOME_BUSINESS = /\b(hogar|casa|apartamento|apto|familia)\b/;

function summarizeProduct(product: StoreProduct) {
  return {
    slug: product.slug,
    name: product.nombre,
    reference: product.sku ?? null,
    category: product.categoria,
    price: product.precioValor,
    stock_status: product.estadoInventario ?? null,
    description: product.descripcion?.slice(0, 400) ?? null,
    recommended_use: product.aplicacion ?? null,
    warranty: product.garantia ?? null,
    specs: (product.especificacionesTecnicas ?? []).slice(0, 8),
    packs: product.paquetes ?? [],
  };
}

/** Señal mínima de que el cliente habló de un producto o categoría. */
const PRODUCT_INTEREST =
  /\b(jabon|gel|liquido|papel|higienico|toalla|servilleta|crema dental|dentifric|cepillo|combo|dispensador|secador|insumo|repuesto|espuma|acero)/;

export function hasProductInterest(text: string) {
  return PRODUCT_INTEREST.test(normalizeText(text));
}

const STAGE_GOALS: Record<number, string> = {
  1: "VALOR: explica un beneficio real del producto consultado. No ofrezcas descuento. Cierra con una sola pregunta relacionada con el uso.",
  2: "CONFIANZA + ALTERNATIVAS: recuerda que Kliniu es fabricante colombiano si es pertinente y muestra máximo 1-2 alternativas reales de la lista 'alternatives'.",
  3: "ASESORÍA: reduce opciones. Compara por capacidad, tráfico, material, apariencia o aplicación. Haz una pregunta que permita recomendar una referencia.",
  4: "CONDICIÓN COMERCIAL: busca la cantidad. Si hay 'packs' o regla de volumen, menciónalos sin inventar porcentaje ni precio.",
  5: "CIERRE: si 'commercial' trae promoción o envío incluido válidos, úsalos. Si no, cierra sin inventar incentivo.",
};

// Con intención de compra el seguimiento no vuelve a vender: pide lo que falta para despachar.
const CLOSING_GOAL =
  "CIERRE DIRECTO: el cliente ya mostró intención de compra. No presentes otros productos, packs ni beneficios nuevos y no preguntes por el uso: retoma el producto que eligió y pide el dato de despacho que falte (nombre completo, ciudad o dirección) para dejar el pedido listo.";

const REMARKETING_PROMPT = `Eres el Asesor Digital Comercial de Kliniu.
Tu tarea en este módulo es recuperar una conversación comercial detenida.
Lee el contexto JSON entregado por el backend y genera SOLO el mensaje de remarketing de la etapa actual.
REGLAS:
- Responde como continuación natural de la conversación.
- No repitas beneficios, preguntas, CTA ni productos presentes en "already_used" salvo que sea imprescindible para la claridad.
- Usa únicamente información del contexto. Nunca inventes precio, stock, promoción, regalo, descuento, envío, garantía ni tiempo de entrega.
- No afirmes stock si stock_status es null. No digas "envío gratis" salvo que la regla de envío lo indique para la ciudad del cliente.
- Mensaje breve (máximo 3 frases), humano, profesional, comercial y consultivo. Español natural de Colombia, "tú" por defecto. Sin emojis.
- Una sola llamada a la acción.
- Prohibido: "¿Sigues interesado?", "Quedo atento", "Avísame cualquier cosa".
- No inventes urgencia ni escasez.
- Si conversation_stage indica intención de compra, prioriza el cierre.
- Si customer.is_home es true (cliente de hogar): no ofrezcas packs ni compra por volumen, no hables de "alto tráfico", "institucional" ni de negocios, y no pidas cantidad más allá de las unidades para su casa. Habla de tamaño, facilidad de uso y diseño.
- No preguntes datos que ya están en "customer" (tipo de espacio, ciudad, cantidad) ni que el cliente ya dijo en la conversación.
- Regla maestra: no persigas al cliente, dale una razón nueva para responder.
- Si en la conversación el cliente nunca preguntó por un producto o categoría, o pidió no ser contactado, o ya cerró la compra, devuelve skip=true.
Devuelve SOLO un JSON con esta forma:
{"skip": boolean, "conversation_stage": "<uno de ${COMMERCIAL_STAGES.join("|")}>", "message": "texto final para el cliente", "goal": "benefit|trust|recommendation|quantity|closing", "used_benefit": "string o null", "used_cta": "la pregunta/CTA usada", "shown_products": ["slugs mostrados en este mensaje"]}`;

type GeneratorOutput = {
  skip?: boolean;
  conversation_stage?: string;
  message?: string;
  goal?: string;
  used_benefit?: string | null;
  used_cta?: string | null;
  shown_products?: string[];
};

async function generateRemarketingMessage(context: unknown): Promise<GeneratorOutput> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_WATI_MODEL ?? "gpt-4.1-mini",
    temperature: 0.5,
    max_tokens: 400,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: REMARKETING_PROMPT },
      { role: "user", content: JSON.stringify(context) },
    ],
  });
  return JSON.parse(completion.choices[0]?.message?.content ?? "{}") as GeneratorOutput;
}

export async function sendPendingWatiFollowUps(now = new Date(), onlyConversationId?: string) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_NOT_CONFIGURED");

  // Envíos que ya salieron de la ventana de 24 h sin respuesta: se cierran para que las métricas no queden en PENDING.
  await prisma.watiRemarketingEvent.updateMany({
    where: { outcome: "PENDING", sentAt: { lt: new Date(now.getTime() - WHATSAPP_WINDOW_MS) } },
    data: { outcome: "NO_REPLY" },
  });

  const config = await getRemarketingConfig();
  if (!config.enabled) return { scanned: 0, sent: 0, skipped: 0, failed: 0, disabled: true };
  if (!config.days.includes(bogotaWeekday(now))) {
    return { scanned: 0, sent: 0, skipped: 0, failed: 0, offDay: true };
  }

  const conversations = await prisma.watiConversation.findMany({
    where: {
      ...(onlyConversationId ? { id: onlyConversationId } : {}),
      status: "ACTIVE",
      orderId: null,
      botPaused: false,
      remarketingOptOut: false,
      salesStage: { not: "SOLD" },
      commercialStage: { notIn: BLOCKED_STAGES },
      remarketingStage: { lt: config.delaysMin.length },
      updatedAt: { gte: new Date(now.getTime() - WHATSAPP_WINDOW_MS) },
    },
    select: {
      id: true,
      phone: true,
      contactName: true,
      commercialStage: true,
      customerCity: true,
      businessType: true,
      quantityRequested: true,
      lastObjection: true,
      chosenProductSlug: true,
      remarketingStage: true,
      remarketingStartedAt: true,
      remarketingUsed: true,
      memorySummary: true,
      aiContextStartedAt: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { role: true, content: true, createdAt: true },
      },
    },
    take: 50,
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const products = conversations.length > 0 ? await getProducts() : [];

  for (const conversation of conversations) {
    const messages = conversation.messages.filter(
      (m) => !conversation.aiContextStartedAt || m.createdAt >= conversation.aiContextStartedAt,
    );
    const lastUser = messages.find((m) => m.role === "USER");
    const last = messages[0];
    // Solo si el cliente escribió y lo último fue una respuesta nuestra.
    if (!lastUser || !last || last.role === "USER") continue;

    const anchor = lastUser.createdAt.getTime();
    if (now.getTime() > anchor + WHATSAPP_WINDOW_MS - WINDOW_SAFETY_MS) continue;

    // Etapa más alta ya vencida; si se saltaron etapas (domingo, caída del cron) se envía solo la última.
    const elapsedMin = (now.getTime() - anchor) / 60000;
    const dueStage = config.delaysMin.filter((d) => elapsedMin >= d).length;
    if (dueStage <= conversation.remarketingStage) continue;

    const startingSequence = conversation.remarketingStage === 0;
    if (
      startingSequence &&
      conversation.remarketingStartedAt &&
      now.getTime() - conversation.remarketingStartedAt.getTime() < config.cooldownDays * 86400000
    ) {
      continue;
    }

    const claimed = await prisma.watiConversation.updateMany({
      where: { id: conversation.id, remarketingStage: conversation.remarketingStage },
      data: {
        remarketingStage: dueStage,
        remarketingNextAt:
          dueStage < config.delaysMin.length
            ? new Date(anchor + config.delaysMin[dueStage] * 60000)
            : null,
        ...(startingSequence ? { remarketingStartedAt: now } : {}),
      },
    });
    if (claimed.count === 0) continue;

    try {
      const chronological = [...messages].reverse();
      const transcript = chronological.map((m) => `${m.role}: ${m.content}`).join("\n");
      const product =
        products.find((p) => p.slug === conversation.chosenProductSlug) ?? findDiscussedProduct(products, transcript);
      // Spec §6: solo se activa si el cliente preguntó por un producto o categoría.
      const userText = normalizeText(chronological.filter((m) => m.role === "USER").map((m) => m.content).join(" "));
      if (!product && !PRODUCT_INTEREST.test(userText)) {
        skipped += 1;
        await prisma.watiConversation.update({
          where: { id: conversation.id },
          data: { remarketingStage: config.delaysMin.length, remarketingNextAt: null },
        });
        continue;
      }
      const manual = product ? config.alternatives[product.slug] ?? [] : [];
      const alternatives = product
        ? (manual.length > 0
            ? manual.map((slug) => products.find((p) => p.slug === slug)).filter((p): p is StoreProduct => Boolean(p))
            : products.filter((p) => p.categoria === product.categoria && p.slug !== product.slug && p.puedeComprar !== false)
          )
            .slice(0, 2)
            .map(summarizeProduct)
        : [];
      const promotions = activePromotions(config, product, now);
      const used = readUsed(conversation.remarketingUsed);
      const outlet = Boolean(product?.esOutlet && product.descuento);
      // Cliente de hogar: los packs y reglas de volumen no se le entregan al generador.
      const isHome = HOME_BUSINESS.test(normalizeText(conversation.businessType ?? ""));

      const output = await generateRemarketingMessage({
        remarketing_stage: dueStage,
        stage_goal: conversation.commercialStage === "PURCHASE_INTENT" ? CLOSING_GOAL : STAGE_GOALS[dueStage],
        conversation_stage: conversation.commercialStage,
        customer: {
          name: conversation.contactName?.split(/\s+/)[0] ?? null,
          city: conversation.customerCity,
          business_type: conversation.businessType,
          is_home: isHome,
          quantity_requested: conversation.quantityRequested,
          objection: conversation.lastObjection,
        },
        product: product ? { ...summarizeProduct(product), ...(isHome ? { packs: [] } : {}) } : null,
        alternatives: isHome ? alternatives.map((a) => ({ ...a, packs: [] })) : alternatives,
        commercial: {
          promotion_active: outlet || promotions.length > 0,
          promotion_description:
            [
              ...(outlet ? [`Outlet: ${product!.descuento} (antes ${product!.precioAnterior})`] : []),
              ...promotions.map((p) => `${p.title}: ${p.description} (vigente hasta ${p.endsAt})`),
            ].join(" | ") || null,
          gift_active: promotions.some((p) => p.gift),
          shipping_included: promotions.some((p) => p.shippingIncluded),
          shipping_rule:
            "Bogotá D.C.: envío gratis. Resto de Colombia: $12.000 COP." +
            (config.shippingIncludedRule ? ` Envío incluido autorizado: ${config.shippingIncludedRule}` : ""),
          volume_discount_rule: isHome
            ? null
            : (product && config.volumeRules[product.categoria]) || config.volumeRules["*"] || null,
          payment_methods: config.cashOnDelivery ? ["contra entrega"] : [],
        },
        memory_summary: conversation.memorySummary,
        conversation: transcript,
        already_used: used,
      });

      const stage = COMMERCIAL_STAGES.find((s) => s === output.conversation_stage);
      const message = output.message?.trim();
      if (output.skip || !message || (stage && BLOCKED_STAGES.includes(stage))) {
        skipped += 1;
        // Conversación no apta: se cierra la secuencia sin enviar.
        await prisma.watiConversation.update({
          where: { id: conversation.id },
          data: { remarketingStage: config.delaysMin.length, remarketingNextAt: null, ...(stage ? { commercialStage: stage } : {}) },
        });
        continue;
      }

      await sendWatiMessage(conversation.phone, message);
      await prisma.$transaction([
        prisma.watiMessage.create({
          data: { conversationId: conversation.id, role: "ASSISTANT", content: message },
        }),
        prisma.watiRemarketingEvent.create({
          data: {
            conversationId: conversation.id,
            stage: dueStage,
            productSlug: product?.slug ?? null,
            message,
            goal: output.goal ?? null,
            usedBenefit: output.used_benefit ?? null,
            usedCta: output.used_cta ?? null,
          },
        }),
        prisma.watiConversation.update({
          where: { id: conversation.id },
          data: {
            ...(stage ? { commercialStage: stage } : {}),
            remarketingUsed: {
              benefits: [...used.benefits, ...(output.used_benefit ? [output.used_benefit] : [])],
              ctas: [...used.ctas, ...(output.used_cta ? [output.used_cta] : [])],
              products: [...new Set([...used.products, ...(output.shown_products ?? [])])],
            },
          },
        }),
      ]);
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error("WATI_REMARKETING_FAILED", conversation.id, error);
      await prisma.watiConversation.update({
        where: { id: conversation.id },
        data: {
          remarketingStage: conversation.remarketingStage,
          ...(startingSequence ? { remarketingStartedAt: conversation.remarketingStartedAt } : {}),
        },
      });
    }
  }

  if (sent > 0) await broadcastPanelUpdate("wati");
  return { scanned: conversations.length, sent, skipped, failed };
}

/** Métricas de la sección 15 de la spec, sobre los envíos de los últimos `days` días. */
export async function getRemarketingMetrics(days = 30) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  const since = new Date(Date.now() - days * 86400000);
  const events = await prisma.watiRemarketingEvent.findMany({
    where: { sentAt: { gte: since } },
    select: {
      stage: true, outcome: true, sentAt: true, repliedAt: true, usedBenefit: true, conversationId: true,
      conversation: { select: { orderId: true, commercialStage: true } },
    },
  });
  const orderIds = [...new Set(events.map((e) => e.conversation.orderId).filter((id): id is string => Boolean(id)))];
  const orders = orderIds.length
    ? await prisma.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, createdAt: true, subtotal: true } })
    : [];
  const orderById = new Map(orders.map((o) => [o.id, o]));

  const stages = [1, 2, 3, 4, 5].map((stage) => {
    const rows = events.filter((e) => e.stage === stage);
    const replied = rows.filter((e) => e.outcome === "REPLIED" && e.repliedAt);
    const avgMin = replied.length
      ? Math.round(replied.reduce((sum, e) => sum + (e.repliedAt!.getTime() - e.sentAt.getTime()), 0) / replied.length / 60000)
      : null;
    return {
      stage,
      sent: rows.length,
      replied: replied.length,
      optedOut: rows.filter((e) => e.outcome === "OPTED_OUT").length,
      replyRate: rows.length ? replied.length / rows.length : null,
      avgMinutesToReply: avgMin,
    };
  });

  const repliedEvents = events.filter((e) => e.outcome === "REPLIED");
  const recovered = new Set(repliedEvents.map((e) => e.conversationId));
  const quoted = new Set(
    repliedEvents
      .filter((e) => ["QUANTITY_REQUESTED", "QUOTE_SENT", "PURCHASE_INTENT", "CHECKOUT", "CLOSED"].includes(e.conversation.commercialStage))
      .map((e) => e.conversationId),
  );
  // Venta atribuida: el pedido de la conversación se creó después de un remarketing respondido.
  const attributed = new Map<string, number>();
  for (const e of repliedEvents) {
    const order = e.conversation.orderId ? orderById.get(e.conversation.orderId) : undefined;
    if (order && order.createdAt > e.sentAt) attributed.set(order.id, order.subtotal);
  }

  const byBenefit = new Map<string, { sent: number; replied: number }>();
  for (const e of events) {
    if (!e.usedBenefit) continue;
    const row = byBenefit.get(e.usedBenefit) ?? { sent: 0, replied: 0 };
    row.sent += 1;
    if (e.outcome === "REPLIED") row.replied += 1;
    byBenefit.set(e.usedBenefit, row);
  }
  const topArguments = [...byBenefit.entries()]
    .map(([benefit, row]) => ({ benefit, ...row, replyRate: row.replied / row.sent }))
    .filter((row) => row.sent >= 3)
    .sort((a, b) => b.replyRate - a.replyRate)
    .slice(0, 5);

  const best = stages.filter((s) => s.sent > 0).sort((a, b) => (b.replyRate ?? 0) - (a.replyRate ?? 0))[0] ?? null;
  return {
    days,
    sent: events.length,
    stages,
    recoveredConversations: recovered.size,
    quotesAfterRemarketing: quoted.size,
    attributedSales: attributed.size,
    attributedRevenue: [...attributed.values()].reduce((a, b) => a + b, 0),
    bestStage: best?.stage ?? null,
    optOutRate: events.length ? events.filter((e) => e.outcome === "OPTED_OUT").length / events.length : null,
    topArguments,
  };
}

/**
 * Postventa (Sistema Maestro §38): al marcar un pedido de WhatsApp como
 * despachado con guía, se la envía al cliente por el mismo chat. Fuera de la
 * ventana de 24 h WhatsApp no permite texto libre: se avisa al vendedor para
 * que la envíe con plantilla.
 */
export async function sendShippedMessage(orderId: string, now = new Date()) {
  if (!prisma) return;
  const conversation = await prisma.watiConversation.findFirst({
    where: { orderId },
    select: {
      id: true, phone: true, contactName: true, assignedSellerId: true,
      messages: { where: { role: "USER" }, orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
    },
  });
  if (!conversation) return;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { carrier: true, trackingNumber: true },
  });
  if (!order?.trackingNumber) return;

  const firstName = conversation.contactName?.trim().split(/\s+/)[0];
  const message =
    `¡Muchas gracias por tu compra${firstName ? `, ${firstName}` : ""}! 😊🇨🇴 Nos alegra mucho que hayas elegido KLINIU®.\n\n` +
    `Tu pedido ya fue despachado 📦🚚${order.carrier ? ` con ${order.carrier}` : ""}. Número de guía: ${order.trackingNumber}. Con ella puedes hacer seguimiento a tu envío.\n\n` +
    "¡Gracias por confiar en KLINIU®! 🙌";

  const lastUser = conversation.messages[0]?.createdAt;
  if (!lastUser || now.getTime() - lastUser.getTime() > WHATSAPP_WINDOW_MS - WINDOW_SAFETY_MS) {
    await createNotification({
      eventKey: "wati.shipped_outside_window",
      title: `WhatsApp: enviar guía ${order.trackingNumber} (${conversation.phone})`,
      detail: "El pedido se despachó pero el chat está fuera de la ventana de 24 h de WhatsApp. Envía la guía con una plantilla.",
      href: "/panel/whatsapp",
      targetUserId: conversation.assignedSellerId ?? undefined,
      metadata: { conversationId: conversation.id, orderId },
    });
    return;
  }

  await sendWatiMessage(conversation.phone, message);
  await prisma.watiMessage.create({ data: { conversationId: conversation.id, role: "ASSISTANT", content: message } });
  await broadcastPanelUpdate("wati");
}
