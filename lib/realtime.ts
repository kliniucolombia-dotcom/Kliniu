import { supabaseDb } from "@/lib/supabase-db";

export type RealtimeResource =
  | "users"
  | "permissions"
  | "combos"
  | "products"
  | "orders"
  | "timeoff";

/** Notifica a los clientes suscritos al canal "panel-updates" que un recurso cambió. */
export async function broadcastPanelUpdate(resource: RealtimeResource) {
  if (!supabaseDb) return;
  const channel = supabaseDb.channel("panel-updates");
  await channel.send({
    type: "broadcast",
    event: "changed",
    payload: { resource },
  });
  await supabaseDb.removeChannel(channel);
}
