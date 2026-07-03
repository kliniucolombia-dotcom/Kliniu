import { kommoFetch } from "./client";
import type { KommoNote } from "./types";

export async function addNote(entityId: number, text: string, entityType: "leads" | "contacts" = "leads"): Promise<void> {
  const note: KommoNote = {
    entity_id: entityId,
    note_type: "common",
    params: { text },
  };

  await kommoFetch(`/${entityType}/notes`, {
    method: "POST",
    body: JSON.stringify([note]),
  });
}

export async function addServiceMessage(entityId: number, text: string): Promise<void> {
  await kommoFetch("/leads/notes", {
    method: "POST",
    body: JSON.stringify([
      {
        entity_id: entityId,
        note_type: "service_message",
        params: { text },
      },
    ]),
  });
}
