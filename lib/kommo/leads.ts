import { kommoFetch } from "./client";
import { getExistingKommoId } from "./idempotency";
import { mapOrderToLead } from "./mappers";
import type { KommoDeal } from "./types";
import type { OrderInput } from "./mappers";

interface KommoLeadsResponse {
  _embedded: { leads: (KommoDeal & { id: number })[] };
}

export async function createDeal(deal: KommoDeal): Promise<number> {
  const res = await kommoFetch<{ _embedded: { leads: Array<{ id: number }> } }>(
    "/leads",
    { method: "POST", body: JSON.stringify([deal]) },
  );
  const id = res._embedded.leads[0]?.id;
  if (!id) throw new Error("KOMMO_CREATE_DEAL_ERROR: no id returned");
  return id;
}

export async function getDeal(id: number): Promise<KommoDeal & { id: number }> {
  return kommoFetch<KommoDeal & { id: number }>(`/leads/${id}`);
}

export async function updateDeal(id: number, data: Partial<KommoDeal>): Promise<void> {
  await kommoFetch(`/leads/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// NOTA: Kommo ignora filter[tags][name] en /leads (siempre devuelve el primer lead
// de la cuenta sin filtrar). No usar búsqueda por tag — la idempotencia depende
// solo del registro local (KommoSyncLog) vía getExistingKommoId.
export async function findDealsByTag(tag: string): Promise<(KommoDeal & { id: number })[]> {
  const res = await kommoFetch<KommoLeadsResponse>(
    `/leads?filter[tags][name]=${encodeURIComponent(tag)}&limit=50`,
  ).catch(() => null);
  return res?._embedded?.leads ?? [];
}

/**
 * Idempotent: checks local sync log → creates if not found.
 * Returns the Kommo deal ID.
 */
export async function findOrCreateDeal(order: OrderInput, contactId: number): Promise<number> {
  // 1. Check DB idempotency (previous successful sync for this order)
  const cached = await getExistingKommoId(order.id, "create_deal");
  if (cached) return cached;

  // 2. Create new deal (no reliable server-side dedupe available — see note above)
  const deal = mapOrderToLead(order, contactId);
  return createDeal(deal);
}
