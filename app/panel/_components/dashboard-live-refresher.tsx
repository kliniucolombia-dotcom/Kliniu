"use client";

import { useRouter } from "next/navigation";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";

/** Refresca el dashboard (Server Component) cuando cambian los datos que lo alimentan. */
export function DashboardLiveRefresher() {
  const router = useRouter();
  useRealtimeRefresh(
    [
      "orders", "combos", "products", "users",
      "campaigns", "quotations", "warehouse", "production",
      "logistics", "maintenance", "assembly", "rrhh",
    ],
    () => router.refresh(),
  );
  return null;
}
