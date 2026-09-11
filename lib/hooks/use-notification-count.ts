"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";

export function useNotificationCount() {
  const [count, setCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

    // Poll cada 30s
    intervalRef.current = setInterval(fetchCount, 30000);

    // Refetch al hacer focus
    const onFocus = () => fetchCount();
    window.addEventListener("focus", onFocus);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchCount]);

  useRealtimeRefresh(["notifications"], fetchCount);

  return { count, refresh: fetchCount };
}
