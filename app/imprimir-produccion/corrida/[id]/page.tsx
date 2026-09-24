import { notFound, redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { getUserById } from "@/lib/users";
import { getEffectivePermission } from "@/lib/permissions";
import { getProductionRunById } from "@/lib/panel";
import { ProductionRunDetail } from "../../_components/production-run-detail";

export const dynamic = "force-dynamic";

export default async function ProductionRunPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");

  const user = await getUserById(session.userId);
  if (!user || user.status !== "ACTIVE") redirect("/login");

  const permission = await getEffectivePermission(user, "MODULE_PRODUCCION");
  if (!permission.canView) notFound();

  const { id } = await params;
  const run = await getProductionRunById(id);
  if (!run) notFound();

  const generatedAt = new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" });

  return (
    <div className="mx-auto max-w-[900px] bg-white p-8 text-[#1A1A1A] print:p-0">
      <div className="flex items-start justify-between border-b-2 border-[#1A1A1A] pb-4">
        <img src="/logo.png" alt="Kliniu" className="h-14 w-auto object-contain" />
        <div className="text-right">
          <h1 className="text-2xl font-black tracking-wide">DETALLE DE CORRIDA</h1>
          <p className="text-sm font-bold text-[#64748B]">Planta de inyección</p>
          <p className="mt-1 text-xs text-[#94A3B8]">Generado el {generatedAt}</p>
        </div>
      </div>

      <div className="mt-4">
        <ProductionRunDetail run={run} />
      </div>

      <div className="mt-8 border-t border-[#E2E8F0] pt-4 text-[10px] text-[#94A3B8]">
        <p>Documento generado automáticamente por el sistema Kliniu a partir de la corrida registrada en la planta de inyección.</p>
      </div>
    </div>
  );
}
