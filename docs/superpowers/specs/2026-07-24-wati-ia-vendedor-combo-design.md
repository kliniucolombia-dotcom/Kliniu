# Vendedor IA por Wati — Combo Total $309.900

## Objetivo
Bot de ventas vía WhatsApp (Wati) que vende un único producto — Combo Total ($309.900: dispensador papel higiénico, dispensador líquidos, dispensador toalla, señalética piso mojado) — de forma autónoma: explica el combo, pregunta cantidad, pide datos del cliente, crea el pedido y envía link de pago Wompi. Sin intervención humana en el flujo de venta.

## Alcance
- Solo este combo (no catálogo completo).
- Wati es el único canal (no Kommo, no chat web).
- Wati ya está en producción recibiendo mensajes reales — el bot debe convivir sin romper atención actual (número/flujo separado o filtro por intención).
- Pago: Wompi automático, mismo flujo que checkout web.
- Notificación: ninguna extra, el pedido aparece en `/panel/pedidos` (ya tiene realtime).

## Datos / Schema (Prisma)
Nuevas tablas:
- `WatiConversation`: id, phone (unique), status (ACTIVE/CLOSED), orderId (nullable, FK a Order), createdAt, updatedAt
- `WatiMessage`: id, conversationId (FK), role (user/assistant), content, createdAt

Reusa:
- `Order` / `OrderItem` existentes. Campo `channel = "whatsapp_ia"` (mismo patrón que dashboard-redesign-module).
- Lógica de generación de link Wompi ya existente (wompi-payment-gateway-module).

RLS: aplicar deny-all + política de servicio a las 2 tablas nuevas, igual que el resto de tablas RRHH/comerciales (patrón fijo del proyecto).

## Flujo
1. Wati envía POST a `/api/wati/webhook` por cada mensaje entrante. Validar token de Wati en el header.
2. Buscar/crear `WatiConversation` por phone. Guardar mensaje entrante en `WatiMessage`.
3. Armar historial (últimos N mensajes) + system prompt fijo del combo → llamar OpenAI (Responses API, function calling).
4. OpenAI puede:
   - Responder texto normal (dudas sobre el combo, precio, envío) → se guarda y se envía por Wati API.
   - Llamar tool `crear_pedido({nombre, telefono, direccion, ciudad, cantidad})`:
     - Valida que todos los datos estén presentes (si falta algo, la IA debe seguir preguntando en vez de llamar la tool).
     - Crea `Order` (status PENDING, channel="whatsapp_ia") + `OrderItem` (combo x cantidad, total = 309900 × cantidad + shipping según ciudad, mismo cálculo de shipping-bogota-module).
     - Genera link de pago Wompi (reusa función existente).
     - Marca `WatiConversation.orderId` y status CLOSED.
     - Responde al cliente con el link por Wati API.
5. Webhook de Wompi existente confirma el pago (PAID) — sin cambios, ya funciona igual que checkout web.

## Prompt del sistema (fijo)
Contiene: los 4 ítems del combo, precio $309.900, condiciones (oferta por tiempo limitado, aplica en ciudades principales, incluye insumos), instrucción de preguntar cantidad, pedir datos uno por uno o en bloque, no inventar precios/stock/condiciones fuera del texto dado, no ofrecer otros productos.

## Seguridad
- `WATI_API_TOKEN` y `OPENAI_API_KEY` en env vars de Vercel (nunca en código ni logs).
- Webhook valida token de Wati antes de procesar.
- No exponer datos de otras conversaciones entre teléfonos distintos.

## Fuera de alcance (explícito)
- No conoce el resto del catálogo.
- No negocia descuentos ni cambia precio.
- No notifica a vendedor humano al cerrar pedido (se ve en panel).
- No gestiona devoluciones/postventa.

## Testing
- Simular conversación completa vía POST directo al webhook (mock payload Wati) antes de conectar número real.
- Verificar Order se crea igual que uno de checkout web (mismos campos obligatorios).
- Verificar link Wompi funciona y el webhook de pago marca PAID correctamente.
