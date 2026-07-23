import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { getUserById } from "@/lib/users";
import { isSuperAdmin } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kommo — Panel Comercial" };

const fmt = (date: Date) =>
  new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(date);

const STATUS_LABEL: Record<string, string> = {
  SUCCESS: "Exitoso",
  PENDING: "Pendiente",
  FAILED: "Fallido",
};

const STATUS_STYLE: Record<string, string> = {
  SUCCESS: "bg-emerald-50 text-emerald-700",
  PENDING: "bg-amber-50 text-amber-700",
  FAILED: "bg-red-50 text-red-700",
};

export default async function KommoPanelPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");

  const user = await getUserById(session.userId);
  if (!user || user.status !== "ACTIVE" || !isSuperAdmin(user)) {
    redirect("/panel");
  }

  const logs = prisma
    ? await prisma.kommoSyncLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 })
    : [];

  const total = logs.length;
  const success = logs.filter((l) => l.status === "SUCCESS").length;
  const failed = logs.filter((l) => l.status === "FAILED").length;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1A1A1A]">Integración Kommo</h1>
          <p className="text-sm text-[#64748B]">
            Sync de pedidos/contactos hacia Kommo CRM y estado del asistente de IA en WhatsApp.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="https://maureenblandonz.kommo.com/settings/ai-agent/"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#1A1A1A] hover:bg-[#F1F5F9]"
          >
            Agente de IA en Kommo
          </a>
          <a
            href="https://maureenblandonz.kommo.com/leads/"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-[#27B1B8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1f9198]"
          >
            Abrir Kommo
          </a>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Últimos registros</p>
          <p className="mt-1 text-2xl font-bold text-[#1A1A1A]">{total}</p>
        </div>
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Exitosos</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{success}</p>
        </div>
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Fallidos</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{failed}</p>
        </div>
      </div>

      <div className="rounded-xl border border-[#E2E8F0] bg-white">
        <div className="border-b border-[#E2E8F0] px-4 py-3">
          <h2 className="text-sm font-bold text-[#1A1A1A]">Log de sincronización</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-left text-xs font-semibold uppercase text-[#94A3B8]">
                <th className="px-4 py-2">Operación</th>
                <th className="px-4 py-2">Entidad</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2">Kommo ID</th>
                <th className="px-4 py-2">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-[#94A3B8]">
                    Sin registros todavía.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-[#F1F5F9] last:border-0">
                    <td className="px-4 py-2 font-medium text-[#1A1A1A]">{log.operation}</td>
                    <td className="px-4 py-2 text-[#64748B]">
                      {log.entityType} #{log.entityId}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[log.status] ?? "bg-slate-100 text-slate-600"}`}
                      >
                        {STATUS_LABEL[log.status] ?? log.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-[#64748B]">{log.kommoId ?? "—"}</td>
                    <td className="px-4 py-2 text-[#64748B]">{fmt(log.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
