import { prisma } from "../lib/prisma";
import { findOrCreateContact } from "../lib/kommo/contacts";
import { findOrCreateDeal } from "../lib/kommo/leads";
import { addNote } from "../lib/kommo/messages";
import { mapOrderToNote } from "../lib/kommo/mappers";
import type { OrderInput } from "../lib/kommo/mappers";

const LIMIT = Number(process.argv[2] ?? 10);

async function main() {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");

  const orders = await prisma.order.findMany({
    where: { paymentStatus: "PAID" },
    orderBy: { createdAt: "desc" },
    take: LIMIT,
    include: { items: true, user: true },
  });

  console.log(`Sincronizando ${orders.length} pedidos pagados a Kommo…`);

  for (const order of orders) {
    try {
      const contactId = await findOrCreateContact({
        id: order.user.id,
        fullName: order.customerName,
        email: order.customerEmail,
        phone: order.customerPhone,
        whatsappPhone: order.customerPhone,
        company: order.company,
        city: order.city,
        department: order.department,
      });

      const orderInput: OrderInput = {
        id: order.id,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        company: order.company,
        department: order.department,
        city: order.city,
        addressLine1: order.addressLine1,
        subtotal: order.subtotal,
        totalItems: order.totalItems,
        paymentStatus: order.paymentStatus,
        items: order.items.map((i) => ({ name: i.name, quantity: i.quantity, unitPrice: i.unitPrice })),
      };

      await prisma!.kommoSyncLog.create({
        data: {
          entityType: "user",
          entityId: order.user.id,
          operation: "create_contact",
          status: "SUCCESS",
          kommoId: contactId,
          syncedAt: new Date(),
        },
      });

      const dealId = await findOrCreateDeal(orderInput, contactId);

      await prisma!.kommoSyncLog.create({
        data: {
          entityType: "order",
          entityId: order.id,
          operation: "create_deal",
          status: "SUCCESS",
          kommoId: dealId,
          syncedAt: new Date(),
        },
      });

      await addNote(dealId, mapOrderToNote(orderInput));

      console.log(`✓ Pedido ${order.id} → contacto ${contactId}, deal ${dealId}`);
    } catch (err) {
      console.error(`✗ Pedido ${order.id}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log("Listo.");
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
