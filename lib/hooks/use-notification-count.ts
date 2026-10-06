"use client";

import { useEffect, useState, useCallback } from "react";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";

export function useNotificationCount() {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/panel/notifications/unread-count");
      if (res.ok) {
        const data = await res.json();
        setCount(data.count ?? 0);
      }
    } catch {
      // non-blocking
    }
  }, []);

  useEffect(() => {
    fetchCount();

    // Sin sondeo periódico: el contador se actualiza por realtime (abajo) y al
    // volver a la pestaña. El poll de 30s era ~20% del CPU de Vercel.
    const onFocus = () => fetchCount();
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchCount]);

  useRealtimeRefresh(["notifications"], fetchCount);

  return { count, refresh: fetchCount };
}
