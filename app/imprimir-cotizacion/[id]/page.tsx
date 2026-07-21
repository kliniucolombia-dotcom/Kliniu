import { notFound, redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getQuotationTaxConfig, getQuotationWithItems } from "@/lib/panel";
import { fmtDateOnly } from "@/lib/date";
import { calcLineTotal } from "@/lib/quotation-calculator";

const fmt = (n: number) =>
  (n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  EXPIRED: "Vencida",
};

export default async function QuotationPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) redirect("/login");

  const { id } = await params;
  if (!prisma) notFound();

  const quotationOwner = await prisma.quotation.findUnique({ where: { id }, select: { sellerId: true } });
  if (!quotationOwner) notFound();
  if (session.role !== "ADMIN" && quotationOwner.sellerId !== session.userId) notFound();

  const quotation = await getQuotationWithItems(id);
  if (!quotation) notFound();
  const taxCfg = await getQuotationTaxConfig();

  const { summary } = quotation;

  return (
    <div className="mx-auto max-w-[900px] bg-white p-10 text-[#1A1A1A] print:p-0">
      <div className="flex items-start justify-between border-b-2 border-[#1A1A1A] pb-4">
        <img src="/logo.png" alt="Kliniu" className="h-14 w-auto object-contain" />
        <div className="text-right">
          <h1 className="text-2xl font-black tracking-wide">COTIZACIÓN</h1>
          <p className="text-sm font-bold text-[#64748B]">{quotation.number}</p>
          <p className="mt-1 text-xs text-[#94A3B8]">{STATUS_LABEL[quotation.status] ?? quotation.status}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6 text-sm">
        <div>
          <p><span className="font-bold">Fecha:</span> {new Date(quotation.createdAt).toLocaleDateString("es-CO")}</p>
          <p><span className="font-bold">Cliente:</span> {quotation.client.company || quotation.client.fullName}</p>
          <p><span className="font-bold">Contacto:</span> {quotation.client.fullName}</p>
          <p><span className="font-bold">Dirección:</span> {[quotation.client.addressLine1, quotation.client.city].filter(Boolean).join(", ") || "—"}</p>
        </div>
        <div className="text-right">
          <p><span className="font-bold">Vendedor:</span> {quotation.seller.fullName}</p>
          <p><span className="font-bold">Condiciones:</span> {quotation.paymentTerms || "—"}</p>
          {quotation.validUntil && (
            <p><span className="font-bold">Válida hasta:</span> {fmtDateOnly(quotation.validUntil)}</p>
          )}
        </div>
      </div>

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[#F8FAFC]">
            {["Ítem", "Ref.", "Cantidad", "Imagen", "Vr. Unit", "Total"].map((h) => (
              <th key={h} className="border border-[#E2E8F0] px-2 py-2 text-left text-xs font-bold uppercase tracking-widest text-[#64748B]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {quotation.items.map((item, idx) => (
            <tr key={item.id} style={{ breakInside: "avoid" }}>
              <td className="border border-[#E2E8F0] px-2 py-2 align-top">{idx + 1}. {item.name}</td>
              <td className="border border-[#E2E8F0] px-2 py-2 align-top">{item.reference || "—"}</td>
              <td className="border border-[#E2E8F0] px-2 py-2 text-right align-top">{item.quantity}</td>
              <td className="border border-[#E2E8F0] px-2 py-2 align-top">
                {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="h-16 w-16 object-contain" />}
              </td>
              <td className="border border-[#E2E8F0] px-2 py-2 text-right align-top">{fmt(item.unitPrice)}</td>
              <td className="border border-[#E2E8F0] px-2 py-2 text-right align-top font-bold">{fmt(calcLineTotal(item))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-end" style={{ breakInside: "avoid" }}>
        <div className="w-72 space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{fmt(summary.subtotal)}</span></div>
          <div className="flex justify-between"><span>ReteICA ({taxCfg.reteIcaPct}%)</span><span>-{fmt(summary.reteIca)}</span></div>
          <div className="flex justify-between"><span>ReteFuente ({taxCfg.reteFuentePct}%)</span><span>-{fmt(summary.reteFuente)}</span></div>
          <div className="flex justify-between"><span>IVA ({taxCfg.ivaPct}%)</span><span>{fmt(summary.iva)}</span></div>
          <div className="flex justify-between border-t-2 border-[#1A1A1A] pt-1 text-base font-black">
            <span>TOTAL</span><span>{fmt(summary.total)}</span>
          </div>
        </div>
      </div>

      {quotation.notes && (
        <div className="mt-8 rounded-lg bg-[#F8FAFC] p-4 text-xs text-[#64748B]">
          {quotation.notes.split("\n").map((line, i) => <p key={i}>{line}</p>)}
        </div>
      )}

      <div className="mt-8 border-t border-[#E2E8F0] pt-4 text-[10px] text-[#94A3B8]">
        <p>Documento generado automáticamente por el sistema Kliniu. Los precios y disponibilidad están sujetos a confirmación de stock.</p>
      </div>
    </div>
  );
}
