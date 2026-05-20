import { prisma } from "@/lib/prisma";

const FALLBACK_PHONE = "573125860921";

export async function GET() {
  if (!prisma) return Response.json({ phone: FALLBACK_PHONE, name: "Kliniu" });

  const sellers = await prisma.user.findMany({
    where: { role: "SELLER", whatsappPhone: { not: null } },
    select: {
      id: true,
      fullName: true,
      whatsappPhone: true,
      _count: { select: { assignedOrders: true } },
    },
  });

  if (sellers.length === 0) {
    return Response.json({ phone: FALLBACK_PHONE, name: "Kliniu" });
  }

  // Return the seller with fewest assigned orders (next in rotation)
  const next = sellers.sort((a, b) => a._count.assignedOrders - b._count.assignedOrders)[0];

  return Response.json({
    phone: next.whatsappPhone,
    name: next.fullName.split(" ")[0],
  });
}
