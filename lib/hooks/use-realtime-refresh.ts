"use client";

import { useCallback, useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { RealtimeResource } from "@/lib/realtime";

type Listener = (resource: string) => void;

// supabase-js devuelve la MISMA instancia de canal por topic: cada hook no puede
// suscribirse ni hacer removeChannel por su cuenta sin romper a los demás.
const listeners = new Set<Listener>();
let channel: RealtimeChannel | null = null;

// El cliente que origina un cambio recibe su propio broadcast. Cada instancia
// del hook puede marcar su escritura local para ignorar ese eco y no recargar
// dos veces (una por la acción y otra por realtime).
const LOCAL_WRITE_TTL_MS = 1500;

// Los guardados por celda (ej. matriz diaria de campañas) emiten ráfagas de
// broadcasts. Coalescemos por ventana corta para que cada cliente recargue una
// sola vez ante varios cambios seguidos, con trailing garantizado.
const COALESCE_MS = 250;
let pendingResources = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function enqueue(resource: string) {
  pendingResources.add(resource);
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    const resources = Array.from(pendingResources);
    pendingResources = new Set();
    flushTimer = null;
    listeners.forEach((l) => resources.forEach((r) => l(r)));
  }, COALESCE_MS);
}

function ensureChannel() {
  if (channel) return;
  channel = supabaseBrowser
    .channel("panel-updates")
    .on("broadcast", { event: "changed" }, (payload) => {
      const resource = (payload.payload as { resource?: string } | undefined)?.resource;
      if (resource) enqueue(resource);
    })
    .subscribe();
}

function releaseChannel() {
  if (listeners.size > 0 || !channel) return;
  const c = channel;
  channel = null;
  supabaseBrowser.removeChannel(c);
}

/**
 * Ejecuta `onChange` cuando el servidor emite un cambio para alguno de los `resources` dados.
 * Devuelve `markLocalWrite` para ignorar el eco del broadcast que originó este mismo componente.
 */
export function useRealtimeRefresh(resources: RealtimeResource[], onChange: () => void) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const localWriteRef = useRef(0);

  const markLocalWrite = useCallback(() => {
    localWriteRef.current = Date.now();
  }, []);

  const resourcesKey = resources.join(",");

  useEffect(() => {
    const watched = new Set(resourcesKey.split(","));
    const listener: Listener = (resource) => {
      if (!watched.has(resource)) return;
      if (Date.now() - localWriteRef.current < LOCAL_WRITE_TTL_MS) return;
      onChangeRef.current();
    };
    listeners.add(listener);
    ensureChannel();

    return () => {
      listeners.delete(listener);
      releaseChannel();
    };
  }, [resourcesKey]);

  return { markLocalWrite };
}
