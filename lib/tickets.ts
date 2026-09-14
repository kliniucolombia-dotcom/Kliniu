export const TICKET_SLA_HOURS: Record<string, number> = {
  URGENTE: 12,
  ALTA: 24,
  MEDIA: 72,
  BAJA: 120,
};

export const TICKET_SLA_LABELS: Record<string, string> = {
  URGENTE: "Medio día",
  ALTA: "1 día",
  MEDIA: "3 días",
  BAJA: "5 días",
};

export function computeTicketDueDate(priority: string, from: Date = new Date()) {
  const hours = TICKET_SLA_HOURS[priority] ?? TICKET_SLA_HOURS.MEDIA;
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}
