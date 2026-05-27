import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { OdooSalesChat } from "./odoo-sales-chat";

export const dynamic = "force-dynamic";
export const metadata = { title: "Asistente Odoo — Panel Comercial Kliniu" };

export default async function OdooAssistantPage() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    redirect("/login");
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
