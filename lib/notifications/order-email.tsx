import { Resend } from "resend";
import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Text,
  render,
} from "@react-email/components";
import type { Order, OrderItem } from "@/generated/prisma/client";
import { SITE_URL } from "@/lib/site";
import { formatPrice } from "@/lib/volume-discounts";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const DESTINATARIO = "david.avila@kliniu.com";
const BASE_URL = SITE_URL.startsWith("http") ? SITE_URL : `https://${SITE_URL}`;

type OrderWithItems = Order & { items: OrderItem[] };

const c = { teal: "#27B1B8", dark: "#0C535B", ink: "#1A1A1A", muted: "#64748B", soft: "#94A3B8", line: "#E2E8F0", bg: "#F4F6F8" };

export function OrderPaidEmail({ order }: { order: OrderWithItems }) {
  const orderNumber = order.id.slice(-8).toUpperCase();
  const total = order.subtotal + order.shippingCost;
  const fecha = order.createdAt.toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "long", timeStyle: "short" });
  const direccion = [order.addressLine1, order.addressLine2, order.city, order.department].filter(Boolean).join(", ");

  return (
    <Html lang="es">
      <Head />
      <Preview>{`Nuevo pedido #${orderNumber} de ${order.customerName} por ${formatPrice(total)}`}</Preview>
      <Body style={{ margin: 0, backgroundColor: c.bg, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" }}>
        <Container style={{ maxWidth: 560, margin: "32px auto", backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", border: `1px solid ${c.line}` }}>
          <Section style={{ backgroundColor: c.dark, padding: "32px 24px", textAlign: "center" }}>
            <Img src={`${BASE_URL}/logo-white.png`} height="28" alt="Kliniu" style={{ margin: "0 auto 20px" }} />
            <Text style={{ display: "inline-block", margin: 0, padding: "4px 12px", borderRadius: 999, backgroundColor: c.teal, color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
              Pago confirmado
            </Text>
            <Heading as="h1" style={{ margin: "14px 0 4px", color: "#fff", fontSize: 22, fontWeight: 800 }}>
              ¡Nuevo pedido!
            </Heading>
            <Text style={{ margin: 0, color: "#A9E3E6", fontSize: 13 }}>
              Pedido #{orderNumber} · {fecha}
            </Text>
          </Section>

          <Section style={{ padding: "24px 24px 0", textAlign: "center" }}>
            <Text style={{ margin: 0, color: c.soft, fontSize: 12 }}>Total pagado</Text>
            <Text style={{ margin: "2px 0 0", color: c.teal, fontSize: 30, fontWeight: 800 }}>{formatPrice(total)}</Text>
          </Section>

          <Section style={{ padding: 24 }}>
            <Section style={{ backgroundColor: c.bg, borderRadius: 12, padding: 16 }}>
              <Text style={{ margin: 0, color: c.soft, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Cliente</Text>
              <Text style={{ margin: "6px 0 0", color: c.ink, fontSize: 15, fontWeight: 700 }}>{order.customerName}</Text>
              <Text style={{ margin: "2px 0 0", color: c.muted, fontSize: 13 }}>
                {order.customerEmail} · {order.customerPhone}
              </Text>
              <Text style={{ margin: "2px 0 0", color: c.muted, fontSize: 13 }}>{direccion}</Text>
              {order.notes ? (
                <Text style={{ margin: "8px 0 0", color: c.ink, fontSize: 13, fontStyle: "italic" }}>Nota: {order.notes}</Text>
              ) : null}
            </Section>

            <Text style={{ margin: "24px 0 8px", color: c.soft, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Productos ({order.items.reduce((n, i) => n + i.quantity, 0)})
            </Text>
            {order.items.map((item) => (
              <Row key={item.id} style={{ borderBottom: `1px solid ${c.line}` }}>
                <Column style={{ width: 60, padding: "10px 0" }}>
                  <Img src={item.image} width="48" height="48" alt="" style={{ borderRadius: 8, objectFit: "cover", backgroundColor: c.bg }} />
                </Column>
                <Column style={{ padding: "10px 0" }}>
                  <Text style={{ margin: 0, color: c.ink, fontSize: 13, fontWeight: 600 }}>{item.name}</Text>
                  <Text style={{ margin: "2px 0 0", color: c.soft, fontSize: 12 }}>Cantidad: {item.quantity}</Text>
                </Column>
                <Column style={{ padding: "10px 0", textAlign: "right", whiteSpace: "nowrap" }}>
                  <Text style={{ margin: 0, color: c.ink, fontSize: 13, fontWeight: 600 }}>{formatPrice(item.lineTotal)}</Text>
                </Column>
              </Row>
            ))}

            <Row style={{ marginTop: 12 }}>
              <Column><Text style={{ margin: "4px 0", color: c.muted, fontSize: 13 }}>Subtotal</Text></Column>
              <Column style={{ textAlign: "right" }}><Text style={{ margin: "4px 0", color: c.ink, fontSize: 13 }}>{formatPrice(order.subtotal)}</Text></Column>
            </Row>
            <Row>
              <Column><Text style={{ margin: "4px 0", color: c.muted, fontSize: 13 }}>Envío</Text></Column>
              <Column style={{ textAlign: "right" }}>
                <Text style={{ margin: "4px 0", color: c.ink, fontSize: 13 }}>{order.shippingCost > 0 ? formatPrice(order.shippingCost) : "Gratis"}</Text>
              </Column>
            </Row>
            <Hr style={{ borderColor: c.line, margin: "8px 0" }} />
            <Row>
              <Column><Text style={{ margin: "4px 0", color: c.ink, fontSize: 15, fontWeight: 800 }}>Total</Text></Column>
              <Column style={{ textAlign: "right" }}><Text style={{ margin: "4px 0", color: c.teal, fontSize: 15, fontWeight: 800 }}>{formatPrice(total)}</Text></Column>
            </Row>

            <Button
              href={`${BASE_URL}/panel/pedidos`}
              style={{ display: "block", marginTop: 24, backgroundColor: c.teal, color: "#fff", padding: "14px 24px", borderRadius: 10, fontSize: 14, fontWeight: 700, textAlign: "center", textDecoration: "none" }}
            >
              Ver pedido en el panel
            </Button>
          </Section>

          <Section style={{ padding: "16px 24px", borderTop: `1px solid ${c.line}` }}>
            <Text style={{ margin: 0, color: c.soft, fontSize: 11, textAlign: "center" }}>
              Pago confirmado por Wompi · Correo automático de Kliniu
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/** Envía a David el resumen del pedido cuando Wompi confirma el pago. */
export async function sendOrderPaidEmail(order: OrderWithItems) {
  if (!resend) return;

  const from = process.env.NOTIFICATION_EMAIL_FROM ?? "Kliniu <notificaciones@kliniu.com>";

  await resend.emails.send({
    from,
    to: DESTINATARIO,
    subject: `[Kliniu] Nuevo pedido pagado #${order.id.slice(-8).toUpperCase()}`,
    html: await render(<OrderPaidEmail order={order} />),
  });
}
