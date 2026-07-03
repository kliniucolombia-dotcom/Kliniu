import { kommoFetch } from "./client";
import { getExistingKommoId } from "./idempotency";
import { mapUserToContact } from "./mappers";
import type { KommoContact } from "./types";
import type { UserInput } from "./mappers";

interface KommoContactsResponse {
  _embedded: { contacts: (KommoContact & { id: number })[] };
}

export async function createContact(contact: KommoContact): Promise<number> {
  const res = await kommoFetch<{ _embedded: { contacts: Array<{ id: number }> } }>(
    "/contacts",
    { method: "POST", body: JSON.stringify([contact]) },
  );
  const id = res._embedded.contacts[0]?.id;
  if (!id) throw new Error("KOMMO_CREATE_CONTACT_ERROR: no id returned");
  return id;
}

export async function findContactByEmail(email: string): Promise<(KommoContact & { id: number }) | null> {
  const res = await kommoFetch<KommoContactsResponse>(
    `/contacts?query=${encodeURIComponent(email)}&limit=1`,
  ).catch(() => null);

  return res?._embedded?.contacts?.[0] ?? null;
}

export async function updateContact(id: number, data: Partial<KommoContact>): Promise<void> {
  await kommoFetch(`/contacts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/**
 * Idempotent: checks sync log → searches Kommo by email → creates if not found.
 * Returns the Kommo contact ID.
 */
export async function findOrCreateContact(user: UserInput): Promise<number> {
  // 1. Check DB idempotency (previous successful sync)
  const cached = await getExistingKommoId(user.id, "create_contact");
  if (cached) return cached;

  // 2. Search Kommo by email (handles duplicates from external sources)
  const existing = await findContactByEmail(user.email);
  if (existing?.id) return existing.id;

  // 3. Create new contact
  const contact = mapUserToContact(user);
  return createContact(contact);
}
