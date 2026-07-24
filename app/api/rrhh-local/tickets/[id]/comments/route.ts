import { requireActiveUser } from "@/lib/permissions";
import { isRRHH } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { broadcastPanelUpdate } from "@/lib/realtime";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return Response.json({ error: "Ticket no encontrado" }, { status: 404 });

  if (!isRRHH(access.user) && ticket.responsibleId !== access.user.id) {
    const employee = await prisma.employee.findUnique({ where: { userId: access.user.id } });
    if (!employee || ticket.employeeId !== employee.id) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }
  }

  const body = await request.json();
  const { message } = body as { message?: string };
  if (!message?.trim()) return Response.json({ error: "message es obligatorio" }, { status: 400 });

  const comment = await prisma.ticketComment.create({
    data: { ticketId: id, userId: access.user.id, message: message.trim() },
    include: { user: { select: { fullName: true } } },
  });
  await broadcastPanelUpdate("tickets");
  return Response.json(comment, { status: 201 });
}
