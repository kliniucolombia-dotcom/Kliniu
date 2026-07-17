"use client";

import { useRouter } from "next/navigation";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";

/** Refresca el dashboard (Server Component) cuando cambian pedidos, combos, productos o usuarios. */
export function DashboardLiveRefresher() {
  const router = useRouter();
  useRealtimeRefresh(["orders", "combos", "products", "users"], () => router.refresh());
  return null;
}
