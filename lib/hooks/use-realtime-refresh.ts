"use client";

import { useEffect, useRef } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { RealtimeResource } from "@/lib/realtime";

/** Ejecuta `onChange` cuando el servidor emite un cambio para alguno de los `resources` dados. */
export function useRealtimeRefresh(resources: RealtimeResource[], onChange: () => void) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const resourcesKey = resources.join(",");

  useEffect(() => {
    const watched = new Set(resourcesKey.split(","));
    const channel = supabaseBrowser
      .channel("panel-updates")
      .on("broadcast", { event: "changed" }, (payload) => {
        const resource = (payload.payload as { resource?: string } | undefined)?.resource;
        if (resource && watched.has(resource)) {
          onChangeRef.current();
        }
      })
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourcesKey]);
}
