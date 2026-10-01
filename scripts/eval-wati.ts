/**
 * Evaluación del asistente de WhatsApp. Corre conversaciones fijas contra el
 * asistente real (OpenAI + catálogo) y verifica reglas del Sistema Maestro.
 * No escribe en la DB ni envía nada: sin conversationId y sin crear pedidos.
 *
 *   node --env-file=.env.local node_modules/.bin/tsx scripts/eval-wati.ts
 */
import assert from "node:assert";
import { runWatiAssistant } from "@/lib/wati-ai";
import { classifyExitIntent, detectCommercialStage } from "@/lib/wati-followup";

type Turn = { role: "user" | "assistant"; content: string };
type Case = { name: string; history?: Turn[]; message: string; checks: Array<[string, (reply: string) => boolean]> };

// Frases que el Sistema Maestro prohíbe en cualquier respuesta.
const FORBIDDEN = /sigues interesad|quedo atent|quedamos atent|avisame cualquier|av[ií]same cualquier|indestructible|no se rompe|nuestra p[aá]gina dice|el cat[aá]logo dice/i;

const cases: Case[] = [
  {
    name: "saludo inicial",
    message: "hola",
    checks: [["se presenta como Gabriel", (r) => /Gabriel/.test(r)], ["pregunta el espacio", (r) => /espacio/i.test(r)]],
  },
  {
    name: "primer mensaje con consulta (responde, no solo saluda)",
    message: "hola, cuánto vale el dispensador de toallas institucional?",
    checks: [["da un precio", (r) => /\$\s?\d/.test(r)], ["se presenta", (r) => /Gabriel/.test(r)]],
  },
  {
    name: "precio directo",
    history: [
      { role: "user", content: "hola" },
      { role: "assistant", content: "¡Hola! Soy Gabriel, de KLINIU®. ¿Qué tipo de espacio estás equipando?" },
    ],
    message: "cuánto vale el dispensador de toallas institucional?",
    checks: [["da un precio", (r) => /\$\s?\d/.test(r)], ["una sola pregunta", (r) => (r.match(/\?/g) ?? []).length <= 1]],
  },
  {
    name: "envío fuera de Bogotá",
    history: [
      { role: "user", content: "quiero 5 dispensadores de jabón" },
      { role: "assistant", content: "¡Claro! ¿A qué ciudad serían?" },
    ],
    message: "a Medellín. el envío es gratis?",
    checks: [["menciona $12.000", (r) => /12\.?000/.test(r)], ["no promete envío gratis a Medellín", (r) => !/gratis[^.]*medell/i.test(r)]],
  },
  {
    name: "volumen sin regla cargada",
    history: [
      { role: "user", content: "hola" },
      { role: "assistant", content: "¡Hola! Soy Gabriel, de KLINIU®. ¿Qué tipo de espacio estás equipando?" },
    ],
    message: "necesito 50 dispensadores de jabón, me hacen descuento?",
    checks: [["no inventa porcentaje", (r) => !/\d+\s?%/.test(r)], ["pide o confirma cantidad/asesor", (r) => /cantidad|unidades|asesor|precio especial/i.test(r)]],
  },
  {
    name: "objeción precio",
    history: [
      { role: "user", content: "precio del dispensador de jabón de acero" },
      { role: "assistant", content: "El dispensador de jabón de acero inoxidable cuesta $99.900. ¿Cuántas unidades necesitas?" },
    ],
    message: "uf está muy caro",
    checks: [["no regala descuento", (r) => !/\d+\s?%|descuento del/i.test(r)], ["ofrece alternativa", (r) => /alternativa|econ[oó]mic|opci[oó]n/i.test(r)]],
  },
  {
    name: "durabilidad",
    history: [
      { role: "user", content: "hola" },
      { role: "assistant", content: "¡Hola! Soy Gabriel, de KLINIU®. ¿Qué tipo de espacio estás equipando?" },
    ],
    message: "y no se rompen? es para un hotel",
    checks: [["nombra ABS o acero", (r) => /ABS|acero/i.test(r)], ["no promete indestructible", (r) => !/no se rompe|indestructible/i.test(r)]],
  },
  {
    name: "garantía",
    history: [
      { role: "user", content: "hola" },
      { role: "assistant", content: "¡Hola! Soy Gabriel, de KLINIU®. ¿Qué tipo de espacio estás equipando?" },
    ],
    message: "cuánta garantía tienen los dispensadores?",
    checks: [["3 meses", (r) => /3 meses|tres meses/i.test(r)], ["no dice 1 año", (r) => !/1 a[nñ]o|un a[nñ]o/i.test(r)]],
  },
  {
    name: "instalación",
    message: "ustedes lo instalan?",
    checks: [["no ofrece instalación gratis", (r) => !/instalaci[oó]n (gratis|incluida)|incluye (la )?instalaci[oó]n/i.test(r)]],
  },
  {
    name: "pregunta si es bot",
    message: "hablo con una persona o con un robot?",
    checks: [["no se hace pasar por humano", (r) => !/soy (una )?persona|soy humano|soy un humano/i.test(r)]],
  },
  {
    name: "lo voy a pensar",
    history: [
      { role: "user", content: "cuánto cuesta el dispensador de papel higiénico institucional" },
      { role: "assistant", content: "Cuesta $59.800. ¿Cuántas unidades necesitas?" },
    ],
    message: "lo voy a pensar",
    checks: [["no usa frase de robot", (r) => !/quedo atent|av[ií]same/i.test(r)]],
  },
];

async function main() {
  let failed = 0;

  // Reglas puras (sin IA).
  assert.equal(classifyExitIntent("ya no me escriban más", false), "OPT_OUT");
  assert.equal(classifyExitIntent("por favor no me vuelvan a escribir", true), "OPT_OUT");
  assert.equal(classifyExitIntent("eliminen mi número", false), "OPT_OUT");
  assert.equal(classifyExitIntent("no gracias", true), "DECLINED");
  assert.equal(classifyExitIntent("no gracias", false), null);
  assert.equal(classifyExitIntent("ya compré en otro lado", true), "DECLINED");
  assert.equal(classifyExitIntent("necesito 12 unidades", true), null);
  assert.equal(detectCommercialStage("DISCOVERY", "hola", "cuesta $56.800", false), "PRICE_SHOWN");
  assert.equal(detectCommercialStage("PRICE_SHOWN", "está muy caro", "", false), "OBJECTION_PRICE");
  assert.equal(detectCommercialStage("PRICE_SHOWN", "necesito 20 unidades", "", false), "QUANTITY_REQUESTED");
  assert.equal(detectCommercialStage("PRICE_SHOWN", "lo quiero, cómo pago?", "", false), "PURCHASE_INTENT");
  assert.equal(detectCommercialStage("PRICE_SHOWN", "x", "", true), "CHECKOUT");
  console.log("PASS reglas puras (salida del cliente, etapa comercial)");

  for (const c of cases) {
    const { reply } = await runWatiAssistant(c.history ?? [], c.message, {
      allowOrderCreation: false,
      customerName: "Carlos",
    });
    const results = [...c.checks, ["sin frases prohibidas", (r: string) => !FORBIDDEN.test(r)] as [string, (r: string) => boolean]].map(
      ([label, check]) => ({ label, ok: check(reply) }),
    );
    const bad = results.filter((r) => !r.ok);
    failed += bad.length;
    console.log(`${bad.length === 0 ? "PASS" : "FAIL"} ${c.name}${bad.length ? ` -> ${bad.map((b) => b.label).join("; ")}` : ""}`);
    if (bad.length) console.log(`  respuesta: ${reply.replace(/\s+/g, " ").slice(0, 300)}`);
  }

  console.log(failed === 0 ? "\nTodo OK" : `\n${failed} verificación(es) fallida(s)`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
