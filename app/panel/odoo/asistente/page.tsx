import { redirect } from "next/navigation";
import { requirePermissionWithFallback } from "@/lib/permissions";
import { OdooSalesChat } from "./odoo-sales-chat";

export const dynamic = "force-dynamic";
export const metadata = { title: "Asistente Odoo — Panel Comercial" };

export default async function OdooAssistantPage() {
  const access = await requirePermissionWithFallback("MODULE_ODOO", "view");
  if (!access.ok) {
    redirect(access.redirectTo);
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Odoo</p>
        <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Asistente comercial</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Pregunta por ventas, productos, clientes y facturación usando datos reales de Odoo.
        </p>
      </div>

      <OdooSalesChat />
    </div>
  );
}
