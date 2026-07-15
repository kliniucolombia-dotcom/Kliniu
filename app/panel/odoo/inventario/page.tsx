import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermissionWithFallback } from "@/lib/permissions";
import { getOdooProducts } from "@/lib/odoo";
import { getOdooErrorMessage, OdooErrorPanel } from "../odoo-error-panel";
import SyncStockButton from "../sync-stock-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inventario Odoo — Panel Comercial" };

function getOdooCategoryName(category: [number, string] | false | undefined) {
  return Array.isArray(category) ? category[1] : "Sin categoría";
}

export default async function OdooInventoryPage() {
  const access = await requirePermissionWithFallback("MODULE_ODOO", "view");
  if (!access.ok) {
    redirect(access.redirectTo);
  }

  const productsResult = await getOdooProducts(100).catch((error) => ({
    error: getOdooErrorMessage(error),
  }));

  if ("error" in productsResult) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Odoo</p>
            <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Inventario</h1>
            <p className="mt-1 text-sm text-[#64748B]">Ordenado por menor disponibilidad para priorizar seguimiento.</p>
          </div>
          <Link href="/panel/odoo/productos" className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-bold text-[#64748B] transition-colors hover:border-[#27B1B8] hover:text-[#0C535B]">
            Ver productos
          </Link>
        </div>
        <OdooErrorPanel message={productsResult.error} />
      </div>
    );
  }

  const products = productsResult;
  const sorted = [...products].sort(
    (a, b) => (a.qty_available ?? 0) - (b.qty_available ?? 0),
  );
  const outOfStock = sorted.filter((product) => (product.qty_available ?? 0) <= 0);
  const available = sorted.filter((product) => (product.qty_available ?? 0) > 0);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Odoo</p>
          <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Inventario</h1>
          <p className="mt-1 text-sm text-[#64748B]">Ordenado por menor disponibilidad para priorizar seguimiento.</p>
        </div>
        <div className="flex items-start gap-3">
          <Link href="/panel/odoo/productos" className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-bold text-[#64748B] transition-colors hover:border-[#27B1B8] hover:text-[#0C535B]">
            Ver productos
          </Link>
          <SyncStockButton />
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <p className="text-xs font-semibold text-[#94A3B8]">Sin stock</p>
          <p className="mt-1 text-2xl font-black text-[#DC2626]">{outOfStock.length}</p>
        </div>
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <p className="text-xs font-semibold text-[#94A3B8]">Con stock</p>
          <p className="mt-1 text-2xl font-black text-[#16A34A]">{available.length}</p>
        </div>
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <p className="text-xs font-semibold text-[#94A3B8]">Total revisado</p>
          <p className="mt-1 text-2xl font-black text-[#27B1B8]">{products.length}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <tr>
              {["Producto", "SKU", "Disponible", "Pronosticado", "Estado"].map((heading) => (
                <th key={heading} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {sorted.map((product) => {
              const qty = product.qty_available ?? 0;
              const virtualQty = product.virtual_available ?? 0;
              const tone =
                qty <= 0
                  ? "bg-[#FEE2E2] text-[#DC2626]"
                  : qty <= 10
                    ? "bg-[#FEF3C7] text-[#D97706]"
                    : "bg-[#DCFCE7] text-[#16A34A]";
              const label = qty <= 0 ? "Sin stock" : qty <= 10 ? "Stock bajo" : "Disponible";

              return (
                <tr key={product.id} className="transition-colors hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3">
                    <p className="font-bold leading-tight text-[#1A1A1A]">{product.name}</p>
                    <p className="mt-1 text-[10px] text-[#94A3B8]">{getOdooCategoryName(product.categ_id)}</p>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-[#64748B]">{product.default_code || "—"}</td>
                  <td className="px-4 py-3 text-sm font-black text-[#1A1A1A]">{qty}</td>
                  <td className={`px-4 py-3 text-sm font-black ${virtualQty < 0 ? "text-[#DC2626]" : "text-[#64748B]"}`}>{virtualQty}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>
                      {label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
