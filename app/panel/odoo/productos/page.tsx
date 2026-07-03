import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/permissions";
import { getOdooProducts } from "@/lib/odoo";
import { getOdooErrorMessage, OdooErrorPanel } from "../odoo-error-panel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Productos Odoo — Panel Comercial Kliniu" };

const fmt = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

function getOdooCategoryName(category: [number, string] | false | undefined) {
  return Array.isArray(category) ? category[1] : "—";
}

export default async function OdooProductsPage() {
  const access = await requirePermission("MODULE_ODOO", "view");
  if (!access.ok) {
    redirect("/login");
  }

  const productsResult = await getOdooProducts(80).catch((error) => ({
    error: getOdooErrorMessage(error),
  }));

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Odoo</p>
          <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Productos</h1>
          <p className="mt-1 text-sm text-[#64748B]">Catálogo de productos vendibles leído desde Odoo.</p>
        </div>
        <Link href="/panel/odoo/inventario" className="rounded-xl bg-[#27B1B8] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-85">
          Ver inventario
        </Link>
      </div>

      {"error" in productsResult ? (
        <OdooErrorPanel message={productsResult.error} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <tr>
                {["Producto", "SKU", "Categoría", "Precio", "Stock", "Pronóstico"].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {productsResult.map((product) => (
                <tr key={product.id} className="transition-colors hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3">
                    <p className="font-bold leading-tight text-[#1A1A1A]">{product.name}</p>
                    <p className="mt-1 text-[10px] text-[#94A3B8]">ID Odoo {product.id}</p>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-[#64748B]">{product.default_code || "—"}</td>
                  <td className="px-4 py-3 text-xs text-[#64748B]">{getOdooCategoryName(product.categ_id)}</td>
                  <td className="px-4 py-3 font-bold text-[#1A1A1A]">{fmt(product.list_price ?? 0)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${(product.qty_available ?? 0) > 0 ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEE2E2] text-[#DC2626]"}`}>
                      {product.qty_available ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-[#64748B]">{product.virtual_available ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
