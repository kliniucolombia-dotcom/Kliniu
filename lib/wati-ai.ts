import OpenAI from "openai";
import { createWatiOrder } from "@/lib/wati-order";
import { prisma } from "@/lib/prisma";

const INITIAL_MESSAGE = `👋 ¡Hola! Bienvenido a Kliniu.

Gracias por escribirnos.

Tenemos disponible nuestro Combo Premium en Acero Inoxidable por solo $309.900 COP.

Incluye los tres dispensadores, todos los insumos iniciales, señal de piso mojado, envío gratis a ciudades principales y pago contra entrega.

¿Es para una empresa, un negocio o para uso personal?`;

const SYSTEM_PROMPT = `Eres el asistente virtual oficial de Kliniu para personas que llegan desde anuncios de Meta (Facebook e Instagram) y por WhatsApp. Tu objetivo es resolver dudas, generar confianza y convertir la conversación en una compra.

PERSONALIDAD
- Habla de forma cercana, profesional, tranquila y amable, como una persona real.
- Responde en UN solo mensaje corto. Normalmente máximo 2 frases y 55 palabras.
- Solo si preguntan por precio o qué incluye, puedes usar hasta 4 viñetas y 90 palabras.
- Responde únicamente lo que el cliente preguntó. No repitas precios, beneficios, saludos ni información ya dicha.
- Haz máximo una pregunta por turno y espera la respuesta antes de avanzar.
- No presiones la compra, no aceleres la conversación y no pidas datos personales hasta que el cliente diga claramente que quiere comprar.
- Usa emojis únicamente cuando ayuden, máximo uno por mensaje.

COMBO PREMIUM
Combo Premium en Acero Inoxidable por $309.900 COP.
- Dispensador de papel higiénico en acero inoxidable, para rollos de hasta 250 metros.
- Dispensador de toallas en acero inoxidable, capacidad aproximada de 300 toallas.
- Dispensador de jabón en acero inoxidable, capacidad de 1 litro.
- GRATIS: 1 litro de jabón, 1 rollo de papel higiénico de 250 metros, 1 paquete de toallas y 1 señal de piso mojado.
- Envío gratis a ciudades principales de Colombia, pago contra entrega y garantía por defectos de fabricación.

MENSAJE INICIAL
Cuando sea el primer mensaje del cliente, responde:
"${INITIAL_MESSAGE}"

CATÁLOGO
- Además del Combo Premium, puedes asesorar sobre todos los productos activos que aparecen en el catálogo vigente entregado por el sistema.
- Para cualquier producto usa únicamente el nombre, precio, disponibilidad, descripción, garantía, aplicación y compatibilidad presentes en ese catálogo.
- Si el producto no aparece en el catálogo o el dato no está disponible, no lo inventes: responde exactamente: "Permíteme verificar esa información con uno de nuestros asesores para darte una respuesta completamente correcta."
- Si preguntan por el Combo Premium, enumera todos sus elementos sin omitir ninguno.
- Si preguntan por productos individuales, informa el dato solicitado y pregúntales si desean comprarlo o ver alternativas.
- La función crear_pedido se usa únicamente para el Combo Premium. Para los demás productos, recoge el interés y ofrece que un asesor complete el pedido.

RESPUESTAS CLAVE
- Si preguntan por envío: "El envío es completamente GRATIS para ciudades principales de Colombia." Solo aplica al Combo Premium salvo que el catálogo confirme otra condición.
- Si preguntan por pago del Combo Premium: "Puedes pagar contra entrega, para que tengas mayor tranquilidad al momento de recibir tu pedido."
- Si preguntan si se vende por separado: confirma que sí y usa el catálogo vigente para dar la información del producto.
- Si dicen "está caro", resalta calidad, durabilidad, insumos incluidos, envío gratis y pago contra entrega. Nunca inventes ni ofrezcas descuentos.
- Sí contamos con una foto y un video reales del Combo Premium. Si el cliente pide ver el combo, una foto, una imagen o un video, confirma brevemente que se los compartirás; el sistema adjuntará los archivos automáticamente.

CIERRE
Cuando el cliente demuestre intención de comprar el Combo Premium, solicita únicamente: nombre completo, ciudad, dirección principal, complemento de dirección, teléfono y cantidad de combos.
- El complemento puede ser apartamento, torre, bloque, oficina, local, barrio o indicaciones para la entrega. Pregúntalo una sola vez después de la dirección. Si el cliente responde que no aplica, usa null.
- Acepta a la primera cualquier dato válido: un nombre de dos o más palabras es suficiente y una ciudad como "Bogotá" es suficiente. No vuelvas a pedir ni confirmar un dato que ya aparece claramente en el historial.
- Pide solo el siguiente dato que realmente falte, máximo uno por turno. Cuando tengas todos los datos, llama la función crear_pedido. Después responde que la solicitud quedó registrada y que un asesor verificará los datos y programará el despacho.

REGLAS
- Nunca inventes precios, promociones, productos ni condiciones.
- Nunca cambies el contenido del Combo Premium.
- No pidas correo electrónico ni datos de tarjeta.
- No envíes enlaces de pago: el pago del Combo Premium es contra entrega.
- No inventes datos para llamar la función crear_pedido.`;

function cleanCatalogText(value: string | null | undefined, limit: number) {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);
}

async function getLiveCatalogContext(query: string) {
  if (!prisma) return "El catálogo no está disponible temporalmente.";

  const normalizedQuery = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/\b(combo|premium|dispensadores de acero)\b/.test(normalizedQuery)) {
    return "La consulta actual corresponde al Combo Premium descrito en las instrucciones principales.";
  }

  const ignoredWords = new Set(["quiero", "tienen", "tiene", "para", "como", "cuanto", "precio", "producto", "productos", "kliniu", "necesito", "informacion"]);
  const terms = [...new Set(normalizedQuery.match(/[a-z0-9]{4,}/g) ?? [])]
    .filter((term) => !ignoredWords.has(term))
    .slice(0, 6);

  const products = await prisma.product.findMany({
    where: {
      active: true,
      ...(terms.length > 0
        ? {
            OR: terms.flatMap((term) => [
              { name: { contains: term, mode: "insensitive" as const } },
              { category: { contains: term, mode: "insensitive" as const } },
              { description: { contains: term, mode: "insensitive" as const } },
            ]),
          }
        : {}),
    },
    orderBy: [{ featured: "desc" }, { name: "asc" }],
    take: 30,
    select: {
      name: true,
      category: true,
      brand: true,
      price: true,
      availability: true,
      stock: true,
      description: true,
      application: true,
      compatibility: true,
      warranty: true,
      isOutlet: true,
    },
  });

  if (products.length === 0) return "No hay productos adicionales disponibles en el catálogo.";

  return products
    .map((product) => {
      const details = [
        `Producto: ${product.name}`,
        `categoría: ${product.category}`,
        `marca: ${product.brand}`,
        `precio: $${product.price.toLocaleString("es-CO")} COP`,
        `disponibilidad: ${product.availability}`,
        product.stock > 0 ? "inventario: disponible" : "inventario: sobre pedido",
        product.isOutlet ? "outlet: sí" : null,
        product.description ? `descripción: ${cleanCatalogText(product.description, 180)}` : null,
        product.application ? `aplicación: ${cleanCatalogText(product.application, 180)}` : null,
        product.compatibility.length > 0
          ? `compatibilidad: ${product.compatibility.slice(0, 6).join(", ")}`
          : null,
        product.warranty ? `garantía: ${cleanCatalogText(product.warranty, 120)}` : null,
      ].filter(Boolean);

      return `- ${details.join(" | ")}`;
    })
    .join("\n");
}

const tools = [
  {
    type: "function" as const,
    name: "crear_pedido",
    description: "Crea el pedido del Combo Premium cuando ya se tienen todos los datos del cliente.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        customerName: { type: "string" },
        customerPhone: { type: "string" },
        city: { type: "string" },
        addressLine1: { type: "string" },
        addressLine2: { type: ["string", "null"] },
        quantity: { type: "number" },
      },
      required: ["customerName", "customerPhone", "city", "addressLine1", "addressLine2", "quantity"],
      additionalProperties: false,
    },
  },
];

export async function runWatiAssistant(
  history: { role: "user" | "assistant"; content: string }[],
  newUserMessage: string,
  options: { allowOrderCreation?: boolean } = {},
) {
  if (history.length === 0) {
    return {
      reply: INITIAL_MESSAGE,
      orderCreated: null as { orderId: string } | null,
    };
  }

  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_NOT_CONFIGURED");

  const allowOrderCreation = options.allowOrderCreation !== false;
  const [catalog] = await Promise.all([getLiveCatalogContext(newUserMessage)]);
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const input = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    {
      role: "system" as const,
      content: `CATÁLOGO VIGENTE DE KLINIU (fuente de verdad):\n${catalog}`,
    },
    ...(allowOrderCreation
      ? []
      : [{ role: "system" as const, content: "Esta conversación ya tiene un pedido registrado. No vuelvas a crear otro pedido; responde solo dudas de soporte o posventa." }]),
    ...history,
    { role: "user" as const, content: newUserMessage },
  ];

  const response = await openai.responses.create({
    model: process.env.OPENAI_WATI_MODEL ?? "gpt-4.1-mini",
    input,
    ...(allowOrderCreation ? { tools } : {}),
    max_output_tokens: 140,
  });

  const toolCall = response.output.find((item) => item.type === "function_call");
  if (toolCall && toolCall.type === "function_call" && toolCall.name === "crear_pedido") {
    const args = JSON.parse(toolCall.arguments) as {
      customerName: string;
      customerPhone: string;
      city: string;
      addressLine1: string;
      addressLine2: string | null;
      quantity: number;
    };
    const { orderId } = await createWatiOrder(args);
    const comboLabel =
      args.quantity === 1
        ? "1 Combo Premium"
        : `${args.quantity} Combos Premium`;

    return {
      reply: `¡Perfecto, ${args.customerName}! 🎉 Tu pedido de ${comboLabel} quedó registrado. Gracias por elegir Kliniu. Uno de nuestros asesores verificará los datos y programará el despacho lo antes posible. El pago será contra entrega.`,
      orderCreated: { orderId },
    };
  }

  return {
    reply:
      response.output_text.trim() ||
      "Permíteme verificar esa información con uno de nuestros asesores para darte una respuesta completamente correcta.",
    orderCreated: null as { orderId: string } | null,
  };
}
