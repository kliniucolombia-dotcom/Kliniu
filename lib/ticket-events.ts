import { prisma } from "@/lib/prisma";

export type TicketEventType =
  | "CREATED"
  | "STATUS"
  | "PRIORITY"
  | "RESPONSIBLE"
  | "COMMENT"
  | "ATTACHMENT"
  | "ATTACHMENT_DELETED"
  | "EDITED";

/** Registra un evento de auditoría del ticket. Best-effort: nunca rompe la operación. */
export async function recordTicketEvent(input: {
  ticketId: string;
  actorId?: string | null;
  type: TicketEventType;
  field?: string | null;
  fromValue?: string | null;
  toValue?: string | null;
}): Promise<void> {
  if (!prisma) return;
  try {
    await prisma.ticketEvent.create({
      data: {
        ticketId: input.ticketId,
        actorId: input.actorId ?? null,
        type: input.type,
        field: input.field ?? null,
        fromValue: input.fromValue ?? null,
        toValue: input.toValue ?? null,
      },
    });
  } catch {
    // Ignorar: el evento es informativo.
  }
}

/** Registra el mismo evento para varios tickets. Best-effort. */
export async function recordTicketEvents(
  inputs: {
    ticketId: string;
    actorId?: string | null;
    type: TicketEventType;
    field?: string | null;
    fromValue?: string | null;
    toValue?: string | null;
  }[],
): Promise<void> {
  if (!prisma || inputs.length === 0) return;
  try {
    await prisma.ticketEvent.createMany({
      data: inputs.map((i) => ({
        ticketId: i.ticketId,
        actorId: i.actorId ?? null,
        type: i.type,
        field: i.field ?? null,
        fromValue: i.fromValue ?? null,
        toValue: i.toValue ?? null,
      })),
    });
  } catch {
    // Ignorar.
  }
}
