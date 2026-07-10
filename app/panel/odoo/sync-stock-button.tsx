"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SyncStockButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSync = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/odoo/sync-stock", { method: "POST" });
      const payload = (await response.json()) as {
        updated?: number;
        unchanged?: number;
        unmatched?: string[];
        total?: number;
        error?: string;
      };

      if (!response.ok) {
        setMessage(payload.error || "No fue posible sincronizar el stock.");
        return;
      }

      setMessage(
        `Actualizados: ${payload.updated ?? 0} · Sin cambios: ${payload.unchanged ?? 0} · Sin match en Odoo: ${payload.unmatched?.length ?? 0}`,
      );
      router.refresh();
    } catch {
      setMessage("No fue posible sincronizar el stock.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleSync}
        disabled={loading}
        className="rounded-xl border border-[#27B1B8] bg-[#EAF8F7] px-4 py-2.5 text-sm font-bold text-[#0C535B] transition-colors hover:bg-[#27B1B8] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Sincronizando..." : "Sincronizar stock desde Odoo"}
      </button>
      {message && <p className="max-w-xs text-right text-[11px] text-[#64748B]">{message}</p>}
    </div>
  );
}
