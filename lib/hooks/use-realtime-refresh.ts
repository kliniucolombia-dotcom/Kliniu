"use client";

import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { RealtimeResource } from "@/lib/realtime";

type Listener = (resource: string) => void;

// supabase-js devuelve la MISMA instancia de canal por topic: cada hook no puede
// suscribirse ni hacer removeChannel por su cuenta sin romper a los demás.
const listeners = new Set<Listener>();
let channel: RealtimeChannel | null = null;

function ensureChannel() {
  if (channel) return;
  channel = supabaseBrowser
    .channel("panel-updates")
    .on("broadcast", { event: "changed" }, (payload) => {
      const resource = (payload.payload as { resource?: string } | undefined)?.resource;
      if (resource) listeners.forEach((l) => l(resource));
    })
    .subscribe();
}

function releaseChannel() {
  if (listeners.size > 0 || !channel) return;
  const c = channel;
  channel = null;
  supabaseBrowser.removeChannel(c);
}

/** Ejecuta `onChange` cuando el servidor emite un cambio para alguno de los `resources` dados. */
export function useRealtimeRefresh(resources: RealtimeResource[], onChange: () => void) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const resourcesKey = resources.join(",");

  useEffect(() => {
    const watched = new Set(resourcesKey.split(","));
    const listener: Listener = (resource) => {
      if (watched.has(resource)) onChangeRef.current();
    };
    listeners.add(listener);
    ensureChannel();

    return () => {
      listeners.delete(listener);
      releaseChannel();
    };
  }, [resourcesKey]);
}
