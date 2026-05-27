import { getSessionFromCookies } from "@/lib/auth";
import {
  getChurnedCustomers,
  getCustomerPurchaseHistory,
  getCustomersByDateRange,
  getOdooProducts,
  getSalesSummary,
  getTopProducts,
} from "@/lib/odoo";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const fmtMoney = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

const fmtNumber = (value: number) =>
  new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(value);

function isoDate(date: Date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function dateRangeFromNaturalLanguage(description: string): { start: string; end: string; label: string } {
  const now = new Date();
  return { start: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), end: isoDate(now), label: description };
}

const TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_sales_summary",
      description: "Obtiene el resumen de ventas (total vendido, pedidos confirmados, ticket promedio, cotizaciones abiertas, pedidos por facturar) para un período específico.",
      parameters: {
        type: "object",
        properties: {
          start_date: { type: "string", description: "Fecha inicio en formato YYYY-MM-DD HH:MM:SS" },
          end_date: { type: "string", description: "Fecha fin en formato YYYY-MM-DD HH:MM:SS" },
          period_label: { type: "string", description: "Etiqueta del período, ej: 'este mes', 'el año 2023'" },
        },
        required: ["start_date", "end_date", "period_label"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_churned_customers",
      description: "Lista los clientes que NO han comprado en los últimos X meses — clientes inactivos o perdidos. Útil para fidelización y retención.",
      parameters: {
        type: "object",
        properties: {
          months_without_purchase: { type: "number", description: "Número de meses sin compra para considerar al cliente como inactivo" },
          limit: { type: "number", description: "Máximo de clientes a listar (default 15)" },
        },
        required: ["months_without_purchase"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_customers_by_date_range",
      description: "Lista los clientes que SÍ compraron en un período específico, ordenados por monto. Útil para saber quién compró hace X tiempo.",
      parameters: {
        type: "object",
        properties: {
          start_date: { type: "string", description: "Fecha inicio en formato YYYY-MM-DD HH:MM:SS" },
          end_date: { type: "string", description: "Fecha fin en formato YYYY-MM-DD HH:MM:SS" },
          period_label: { type: "string", description: "Etiqueta del período" },
          limit: { type: "number", description: "Máximo de clientes (default 15)" },
        },
        required: ["start_date", "end_date", "period_label"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_top_products",
      description: "Lista los productos más vendidos en un período, ordenados por monto total vendido.",
      parameters: {
        type: "object",
        properties: {
          start_date: { type: "string", description: "Fecha inicio en formato YYYY-MM-DD HH:MM:SS" },
          end_date: { type: "string", description: "Fecha fin en formato YYYY-MM-DD HH:MM:SS" },
          period_label: { type: "string", description: "Etiqueta del período" },
          limit: { type: "number", description: "Máximo de productos (default 8)" },
        },
        required: ["start_date", "end_date", "period_label"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_customer_history",
      description: "Obtiene el historial completo de compras de un cliente específico por nombre.",
      parameters: {
        type: "object",
        properties: {
          customer_name: { type: "string", description: "Nombre o parte del nombre del cliente a buscar" },
        },
        required: ["customer_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_low_stock_products",
      description: "Lista los productos con stock bajo (menos de 10 unidades disponibles).",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Máximo de productos (default 10)" },
        },
        required: [],
      },
    },
  },
];

async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  const now = new Date();

  if (name === "get_sales_summary") {
    const result = await getSalesSummary(args.start_date as string, args.end_date as string);
    return JSON.stringify({
      periodo: args.period_label,
      total_vendido: fmtMoney(result.total),
      pedidos_confirmados: result.confirmedOrders,
      ticket_promedio: fmtMoney(result.averageTicket),
      cotizaciones_abiertas: result.quotations,
      pedidos_por_facturar: result.toInvoice,
    });
  }

  if (name === "get_churned_customers") {
    const months = (args.months_without_purchase as number) || 6;
    const limit = (args.limit as number) || 15;
    const customers = await getChurnedCustomers(months, limit);
    if (customers.length === 0) {
      return JSON.stringify({ mensaje: `No se encontraron clientes inactivos hace más de ${months} meses.` });
    }
    return JSON.stringify({
      meses_sin_compra: months,
      total_clientes_inactivos: customers.length,
      clientes: customers.map((c) => ({
        nombre: c.name,
        ultima_compra: c.lastOrderDate ?? "sin registro",
        total_historico: fmtMoney(c.totalSpent),
        pedidos: c.orderCount,
        ticket_promedio: fmtMoney(c.averageTicket),
      })),
    });
  }

  if (name === "get_customers_by_date_range") {
    const limit = (args.limit as number) || 15;
    const customers = await getCustomersByDateRange(args.start_date as string, args.end_date as string, limit);
    if (customers.length === 0) {
      return JSON.stringify({ mensaje: `No se encontraron clientes con compras en ese período.` });
    }
    return JSON.stringify({
      periodo: args.period_label,
      total_clientes: customers.length,
      clientes: customers.map((c) => ({
        nombre: c.name,
        total_comprado: fmtMoney(c.totalSpent),
        pedidos: c.orderCount,
        ticket_promedio: fmtMoney(c.averageTicket),
      })),
    });
  }

  if (name === "get_top_products") {
    const limit = (args.limit as number) || 8;
    const products = await getTopProducts(args.start_date as string, args.end_date as string, limit);
    if (products.length === 0) {
      return JSON.stringify({ mensaje: "No se encontraron productos vendidos en ese período." });
    }
    return JSON.stringify({
      periodo: args.period_label,
      productos: products.map((p) => ({
        nombre: p.name,
        unidades: fmtNumber(p.quantity),
        total_vendido: fmtMoney(p.amount),
      })),
    });
  }

  if (name === "get_customer_history") {
    const result = await getCustomerPurchaseHistory(args.customer_name as string);
    if (!result) {
      return JSON.stringify({ mensaje: `No se encontró el cliente "${args.customer_name}".` });
    }
    return JSON.stringify({
      cliente: result.partner.name,
      total_historico: fmtMoney(result.totalSpent),
      pedidos: result.orders.map((o) => ({
        numero: o.name,
        fecha: o.date_order,
        monto: fmtMoney(o.amount_total ?? 0),
      })),
    });
  }

  if (name === "get_low_stock_products") {
    const limit = (args.limit as number) || 10;
    const products = await getOdooProducts(100);
    const lowStock = products
      .filter((p) => (p.qty_available ?? 0) <= 10)
      .sort((a, b) => (a.qty_available ?? 0) - (b.qty_available ?? 0))
      .slice(0, limit);

    if (lowStock.length === 0) {
      return JSON.stringify({ mensaje: "Todos los productos tienen stock suficiente." });
    }
    return JSON.stringify({
      productos_stock_bajo: lowStock.map((p) => ({
        nombre: p.name,
        stock_disponible: p.qty_available ?? 0,
        codigo: p.default_code || null,
      })),
    });
  }

  return JSON.stringify({ error: "Función no reconocida." });
}

const SYSTEM_PROMPT = `Eres un asistente comercial inteligente conectado a Odoo de la empresa Kliniu (venta de dispensadores de higiene).
Hoy es ${new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.

Tu especialidad es ayudar al equipo comercial con:
- Análisis de ventas por período
- Identificar clientes inactivos (no han comprado hace X meses/años) para estrategias de recuperación
- Ver quién compró en un período específico del pasado
- Estadísticas de productos más vendidos
- Historial de compras por cliente
- Stock bajo

Cuando el usuario mencione períodos de tiempo, calcula las fechas exactas:
- "hace 2 años" → desde hace 2 años hasta hace 1 año
- "hace 1 año 6 meses" → 18 meses atrás
- "el año pasado" → 2025-01-01 a 2025-12-31
- "hace 6 meses" → hace 6 meses hasta hoy (para inactivos)

Usa siempre las herramientas disponibles para obtener datos reales de Odoo antes de responder.
Responde en español de manera clara, con datos concretos y sugerencias de acción cuando sea relevante.
Formatea las listas de clientes o productos de forma legible.`;

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
      return Response.json({ error: "No autorizado." }, { status: 401 });
    }

    const body = (await request.json()) as { message?: string; history?: { role: string; content: string }[] };
    const message = body.message?.trim();
    if (!message) {
      return Response.json({ error: "Escribe una pregunta." }, { status: 400 });
    }

    const history = (body.history ?? []).slice(-8).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
      { role: "user", content: message },
    ];

    let response = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini",
      messages,
      tools: TOOLS,
      tool_choice: "auto",
    });

    let assistantMessage = response.choices[0].message;

    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      messages.push(assistantMessage);

      const toolResults = await Promise.all(
        assistantMessage.tool_calls.map(async (tc) => {
          const fnCall = (tc as { id: string; function: { name: string; arguments: string } }).function;
          const args = JSON.parse(fnCall.arguments) as Record<string, unknown>;
          const result = await executeTool(fnCall.name, args);
          return {
            role: "tool" as const,
            tool_call_id: (tc as { id: string }).id,
            content: result,
          };
        }),
      );

      messages.push(...toolResults);

      response = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini",
        messages,
        tools: TOOLS,
        tool_choice: "auto",
      });

      assistantMessage = response.choices[0].message;
    }

    return Response.json({
      message: assistantMessage.content ?? "No pude generar una respuesta.",
    });
  } catch (error) {
    console.error("[asistente]", error);
    const msg =
      error instanceof Error && error.message.includes("429")
        ? "Demasiadas consultas. Espera unos segundos e intenta de nuevo."
        : "No pude consultar Odoo en este momento. Verifica la conexión.";
    return Response.json({ error: msg }, { status: 500 });
  }
}
