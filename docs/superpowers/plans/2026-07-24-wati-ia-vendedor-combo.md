# Vendedor IA Wati — Combo Total Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bot de WhatsApp (Wati) que vende el Combo Total ($309.900) de forma autónoma: responde dudas, pide cantidad y datos del cliente, crea el `Order` y envía link de pago Wompi.

**Architecture:** Webhook `/api/wati/webhook` recibe mensajes → persiste en `WatiConversation`/`WatiMessage` (Prisma) → llama OpenAI (Responses API, function calling) con prompt fijo del combo → si la IA llama la tool `crear_pedido`, se construye un `Order`+`OrderItem` directo (sin carrito, sin `userId` real — usa un usuario de sistema) y se genera el link Wompi reusando `lib/wompi.ts` → responde por la API de Wati.

**Tech Stack:** Next.js API routes, Prisma/Supabase, OpenAI SDK (`openai` npm package, Responses API), Wati API (fetch directo, sin SDK).

## Global Constraints

- No tocar el checkout web ni `createOrderFromCart` — flujo nuevo, aislado.
- `WATI_API_TOKEN` y `OPENAI_API_KEY` solo en env vars de Vercel, nunca en código/logs.
- Solo vende el Combo Total, precio fijo $309.900, no inventa condiciones.
- RLS deny-all + policy de servicio en las tablas nuevas (patrón fijo del proyecto, ver [[supabase-rls-fix-julio-2026]]).
- No usar `runtime = 'edge'` — Node.js default (Fluid Compute).

---

### Task 1: Schema Prisma — WatiConversation y WatiMessage

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: modelos `WatiConversation { id, phone, status, orderId, createdAt, updatedAt }` y `WatiMessage { id, conversationId, role, content, createdAt }`, enum `WatiConversationStatus { ACTIVE, CLOSED }`, enum `WatiMessageRole { USER, ASSISTANT }`.

- [ ] **Step 1: Agregar modelos al final de `prisma/schema.prisma`**

```prisma
enum WatiConversationStatus {
  ACTIVE
  CLOSED
}

enum WatiMessageRole {
  USER
  ASSISTANT
}

model WatiConversation {
  id        String                 @id @default(cuid())
  phone     String                 @unique
  status    WatiConversationStatus @default(ACTIVE)
  orderId   String?
  createdAt DateTime               @default(now())
  updatedAt DateTime               @updatedAt
  messages  WatiMessage[]
}

model WatiMessage {
  id             String           @id @default(cuid())
  conversationId String
  role           WatiMessageRole
  content        String
  createdAt      DateTime         @default(now())
  conversation   WatiConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 2: Push schema y regenerar client**

Run: `npx prisma db push && npx prisma generate`
Expected: `The database is now in sync with your Prisma schema.` sin errores.

- [ ] **Step 3: Aplicar RLS deny-all + policy de servicio (Supabase SQL)**

Run vía `mcp__supabase-pat__execute_sql` o `npx prisma db execute`:

```sql
ALTER TABLE "WatiConversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WatiMessage" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all_wati_conversation" ON "WatiConversation" FOR ALL USING (false);
CREATE POLICY "deny_all_wati_message" ON "WatiMessage" FOR ALL USING (false);

CREATE POLICY "service_role_wati_conversation" ON "WatiConversation" FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_wati_message" ON "WatiMessage" FOR ALL TO service_role USING (true) WITH CHECK (true);
```

Expected: ejecuta sin error, coherente con el patrón ya aplicado a las demás tablas (ver [[supabase-rls-fix-julio-2026]]).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: schema WatiConversation/WatiMessage para vendedor IA"
```

---

### Task 2: `lib/wati.ts` — envío de mensajes por Wati API

**Files:**
- Create: `lib/wati.ts`

**Interfaces:**
- Produces: `sendWatiMessage(phone: string, message: string): Promise<void>`

- [ ] **Step 1: Implementar cliente Wati**

Wati expone `POST https://live-mt-server.wati.io/{tenantId}/api/v1/sendSessionMessage/{phone}?messageText=...` con header `Authorization: Bearer {token}`. El token pegado por el usuario ya incluye el prefijo `wati_...` como valor completo del header (formato real de Wati: `Authorization` = el token tal cual, sin agregar "Bearer" duplicado — verificar contra la doc de la cuenta antes de producción; dejar como Bearer por ser el estándar Wati documentado).

```typescript
const WATI_BASE_URL = process.env.WATI_BASE_URL;

export async function sendWatiMessage(phone: string, message: string) {
  const token = process.env.WATI_API_TOKEN;
  if (!token || !WATI_BASE_URL) throw new Error("WATI_NOT_CONFIGURED");

  const url = `${WATI_BASE_URL}/api/v1/sendSessionMessage/${phone}?messageText=${encodeURIComponent(message)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`WATI_SEND_FAILED: ${response.status} ${body}`);
  }
}
```

- [ ] **Step 2: Agregar env vars al `.env.local` (no commitear)**

`WATI_API_TOKEN=...` (el token ya provisto por el usuario), `WATI_BASE_URL=https://live-mt-server.wati.io/{tenantId}` (pedir tenantId real al usuario antes de probar en vivo — sin este dato el endpoint no resuelve).

- [ ] **Step 3: Commit**

```bash
git add lib/wati.ts
git commit -m "feat: cliente de envio de mensajes Wati"
```

---

### Task 3: `lib/wati-order.ts` — creación de pedido + link Wompi

**Files:**
- Create: `lib/wati-order.ts`
- Modify: `lib/shipping-rates.ts` (solo lectura, reusar `getShippingForLocation`)

**Interfaces:**
- Consumes: `getShippingForLocation(department: string, city: string): { price: number }` de `lib/shipping-rates.ts`; `buildWompiCheckoutUrl(params)` de `lib/wompi.ts`.
- Produces: `createWatiOrder(input: { customerName: string; customerPhone: string; city: string; addressLine1: string; quantity: number }): Promise<{ orderId: string; paymentUrl: string }>`

- [ ] **Step 1: Resolver usuario de sistema para pedidos de WhatsApp**

Los `Order.userId` son obligatorios pero acá no hay login. Se usa/crea un único `User` de sistema (`whatsapp-ia@kliniu.com`) reutilizado por todos los pedidos del bot — el pedido real igual queda identificado por `customerName`/`customerPhone`.

```typescript
import { prisma } from "@/lib/prisma";
import { getShippingForLocation } from "@/lib/shipping-rates";
import { buildWompiCheckoutUrl } from "@/lib/wompi";
import crypto from "crypto";

const COMBO_NAME = "Combo Total";
const COMBO_PRICE = 309900;
const COMBO_SKU = "COMBO-TOTAL-WATI";

async function getWatiSystemUserId() {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");

  const existing = await prisma.user.findUnique({ where: { email: "whatsapp-ia@kliniu.com" } });
  if (existing) return existing.id;

  const created = await prisma.user.create({
    data: {
      fullName: "Vendedor IA WhatsApp",
      email: "whatsapp-ia@kliniu.com",
      passwordHash: crypto.randomBytes(32).toString("hex"),
      role: "CUSTOMER",
      status: "ACTIVE",
    },
  });
  return created.id;
}
```

- [ ] **Step 2: Implementar `createWatiOrder`**

```typescript
export async function createWatiOrder(input: {
  customerName: string;
  customerPhone: string;
  city: string;
  addressLine1: string;
  quantity: number;
}) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  if (input.quantity < 1) throw new Error("INVALID_QUANTITY");

  const userId = await getWatiSystemUserId();
  const subtotal = COMBO_PRICE * input.quantity;
  const shippingCost = getShippingForLocation("", input.city).price;
  const totalItems = input.quantity;

  const order = await prisma.order.create({
    data: {
      userId,
      channel: "WHATSAPP",
      customerName: input.customerName,
      customerEmail: "whatsapp-ia@kliniu.com",
      customerPhone: input.customerPhone,
      department: "",
      city: input.city,
      addressLine1: input.addressLine1,
      subtotal,
      shippingCost,
      totalItems,
      items: {
        create: [
          {
            name: COMBO_NAME,
            image: "",
            unitPrice: COMBO_PRICE,
            quantity: input.quantity,
            lineTotal: subtotal,
            sku: COMBO_SKU,
          },
        ],
      },
    },
  });

  const reference = `${order.id}-${Date.now()}`;
  await prisma.order.update({ where: { id: order.id }, data: { wompiReference: reference } });

  const paymentUrl = buildWompiCheckoutUrl({
    reference,
    amountInCents: (subtotal + shippingCost) * 100,
    redirectUrl: "https://kliniu.vercel.app/mi-cuenta",
    customerEmail: input.customerPhone + "@wati.kliniu.com",
  });

  return { orderId: order.id, paymentUrl };
}
```

Nota: `getShippingForLocation` recibe `department` — revisar su firma real en `lib/shipping-rates.ts` antes de este paso; si depende de `department` para tarifas (Bogotá es ciudad de Cundinamarca, ver [[shipping-bogota-module]]), pedir también el departamento en la conversación o inferirlo por ciudad si la función ya lo permite.

- [ ] **Step 3: Verificar firma real de `getShippingForLocation` y ajustar la llamada**

Run: `grep -n "export function getShippingForLocation" -A 15 lib/shipping-rates.ts`
Ajustar `createWatiOrder` para pasar los parámetros que la función realmente exige (no asumir `department` vacío si la función lo requiere para resolver tarifa).

- [ ] **Step 4: Commit**

```bash
git add lib/wati-order.ts
git commit -m "feat: creacion de pedido y link Wompi para vendedor IA Wati"
```

---

### Task 4: `lib/wati-ai.ts` — prompt y function calling OpenAI

**Files:**
- Create: `lib/wati-ai.ts`

**Interfaces:**
- Consumes: `createWatiOrder` de `lib/wati-order.ts`.
- Produces: `runWatiAssistant(history: { role: "user" | "assistant"; content: string }[], newUserMessage: string): Promise<{ reply: string; orderCreated: { orderId: string; paymentUrl: string } | null }>`

- [ ] **Step 1: Definir el prompt fijo del combo**

```typescript
const SYSTEM_PROMPT = `Eres el vendedor virtual de Kliniu por WhatsApp. Vendes UN SOLO producto: el Combo Total.

Incluye:
1. Dispensador de papel higiénico 250 mts
2. Dispensador de líquidos 1000 ml
3. Dispensador de toalla de papel 300 toallas
4. Señalética piso mojado

Precio: $309.900 (incluye insumos). Dispensadores en acero 304. Ideal para baños.
Oferta válida por tiempo limitado hasta agotar existencias. Aplica términos y condiciones. Envío incluido a ciudades principales.

Reglas:
- No inventes precios, condiciones ni stock fuera de lo indicado.
- No ofrezcas otros productos.
- Pregunta cuántos combos quiere.
- Explica qué incluye el combo si preguntan.
- Antes de crear el pedido necesitas: nombre completo, teléfono, ciudad, dirección y cantidad. Pide lo que falte.
- Cuando tengas todos los datos, llama la función crear_pedido. No inventes datos que el cliente no dio.`;
```

- [ ] **Step 2: Implementar `runWatiAssistant` con function calling**

```typescript
import OpenAI from "openai";
import { createWatiOrder } from "@/lib/wati-order";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const tools = [
  {
    type: "function" as const,
    name: "crear_pedido",
    description: "Crea el pedido del Combo Total cuando ya se tienen todos los datos del cliente.",
    parameters: {
      type: "object",
      properties: {
        customerName: { type: "string" },
        customerPhone: { type: "string" },
        city: { type: "string" },
        addressLine1: { type: "string" },
        quantity: { type: "number" },
      },
      required: ["customerName", "customerPhone", "city", "addressLine1", "quantity"],
      additionalProperties: false,
    },
  },
];

export async function runWatiAssistant(
  history: { role: "user" | "assistant"; content: string }[],
  newUserMessage: string,
) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_NOT_CONFIGURED");

  const input = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    ...history,
    { role: "user" as const, content: newUserMessage },
  ];

  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input,
    tools,
  });

  const toolCall = response.output.find((item) => item.type === "function_call");

  if (toolCall && toolCall.type === "function_call" && toolCall.name === "crear_pedido") {
    const args = JSON.parse(toolCall.arguments) as {
      customerName: string;
      customerPhone: string;
      city: string;
      addressLine1: string;
      quantity: number;
    };

    const { orderId, paymentUrl } = await createWatiOrder(args);

    return {
      reply: `Listo ${args.customerName}, tu pedido de ${args.quantity} Combo(s) Total quedó registrado. Para confirmarlo paga aquí: ${paymentUrl}`,
      orderCreated: { orderId, paymentUrl },
    };
  }

  return { reply: response.output_text, orderCreated: null };
}
```

- [ ] **Step 3: Instalar dependencia si falta**

Run: `grep -q '"openai"' package.json && echo OK || npm install openai`
Expected: `openai` presente en `package.json` (dependencia justificada: es el único SDK oficial para Responses API/function calling).

- [ ] **Step 4: Commit**

```bash
git add lib/wati-ai.ts package.json package-lock.json
git commit -m "feat: motor de IA (OpenAI function calling) para vendedor Wati"
```

---

### Task 5: Webhook `/api/wati/webhook`

**Files:**
- Create: `app/api/wati/webhook/route.ts`

**Interfaces:**
- Consumes: `runWatiAssistant` de `lib/wati-ai.ts`, `sendWatiMessage` de `lib/wati.ts`.

- [ ] **Step 1: Implementar el route handler**

Payload real de Wati varía por evento; validar contra un mensaje de prueba real antes de confiar en los nombres de campo — usar `payload.waId` o `payload.senderName`/`payload.text` según lo que Wati realmente envíe (confirmar con un webhook de prueba en el panel de Wati).

```typescript
import { prisma } from "@/lib/prisma";
import { runWatiAssistant } from "@/lib/wati-ai";
import { sendWatiMessage } from "@/lib/wati";

export async function POST(request: Request) {
  const secret = request.headers.get("x-wati-webhook-secret");
  if (secret !== process.env.WATI_WEBHOOK_SECRET) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!prisma) {
    return Response.json({ error: "DB no configurada." }, { status: 500 });
  }

  const payload = await request.json();
  const phone: string = payload.waId ?? payload.phone;
  const text: string = payload.text ?? payload.message;

  if (!phone || !text) {
    return Response.json({ received: true });
  }

  const conversation = await prisma.watiConversation.upsert({
    where: { phone },
    update: {},
    create: { phone },
  });

  await prisma.watiMessage.create({
    data: { conversationId: conversation.id, role: "USER", content: text },
  });

  const previousMessages = await prisma.watiMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  const history = previousMessages
    .slice(0, -1)
    .map((m) => ({ role: m.role === "USER" ? ("user" as const) : ("assistant" as const), content: m.content }));

  const { reply, orderCreated } = await runWatiAssistant(history, text);

  await prisma.watiMessage.create({
    data: { conversationId: conversation.id, role: "ASSISTANT", content: reply },
  });

  if (orderCreated) {
    await prisma.watiConversation.update({
      where: { id: conversation.id },
      data: { status: "CLOSED", orderId: orderCreated.orderId },
    });
  }

  await sendWatiMessage(phone, reply);

  return Response.json({ received: true });
}
```

- [ ] **Step 2: Agregar `WATI_WEBHOOK_SECRET` a env vars**

Generar un secreto propio (no es el token de Wati) y configurarlo tanto en Vercel como en la config de webhook del panel de Wati, si Wati permite mandar headers custom; si no los permite, mover la validación a un query param o al formato que Wati sí soporte — confirmar en su documentación antes de dar por cerrado este paso.

- [ ] **Step 3: Probar con payload simulado**

Run:
```bash
curl -X POST http://localhost:3000/api/wati/webhook \
  -H "Content-Type: application/json" \
  -H "x-wati-webhook-secret: $WATI_WEBHOOK_SECRET" \
  -d '{"waId":"573001234567","text":"Hola quiero el combo"}'
```
Expected: `{"received":true}` y un registro nuevo en `WatiConversation`/`WatiMessage` (verificar con `npx prisma studio` o query directa).

- [ ] **Step 4: Probar flujo completo simulado hasta creación de pedido**

Enviar varios curl seguidos simulando la conversación (cantidad, nombre, teléfono, ciudad, dirección) y verificar que el último genera un `Order` en la tabla con `channel = WHATSAPP` y que `paymentUrl` responde una URL válida de `checkout.wompi.co`.

- [ ] **Step 5: Commit**

```bash
git add app/api/wati/webhook/route.ts
git commit -m "feat: webhook Wati que orquesta el vendedor IA del Combo Total"
```

---

### Task 6: Config final y verificación end-to-end

**Files:**
- Modify: `.env.local` (no commitear), Vercel env vars (vía dashboard o `vercel env add`)

- [ ] **Step 1: Cargar env vars en Vercel producción**

Variables: `OPENAI_API_KEY`, `WATI_API_TOKEN`, `WATI_BASE_URL`, `WATI_WEBHOOK_SECRET`. Usar `vercel env add <NOMBRE> production` por cada una (valores nunca impresos en consola compartida).

- [ ] **Step 2: Configurar webhook en el panel de Wati**

Apuntar el webhook de mensajes entrantes a `https://kliniu.vercel.app/api/wati/webhook`, con el header/secreto definido en Task 5 Step 2.

- [ ] **Step 3: Prueba real con un número de WhatsApp propio**

Escribir "Hola" al número de Wati conectado, seguir la conversación hasta recibir el link de pago, confirmar que el `Order` aparece en `/panel/pedidos` con `channel = WHATSAPP`.

- [ ] **Step 4: Confirmar que el pago de prueba marca la orden como PAID**

Pagar con una transacción de prueba Wompi (o revisar que el webhook `/api/webhooks/wompi` ya existente marca el `Order` como `PAID` sin cambios adicionales, dado que reusa `markOrderPaidByWompiReference`).

- [ ] **Step 5: Commit final si hubo ajustes de config**

```bash
git add -A
git commit -m "chore: ajustes finales de config vendedor IA Wati"
```
