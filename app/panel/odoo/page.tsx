import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { getOdooConnectionStatus, getOdooProducts } from "@/lib/odoo";
import { getOdooErrorMessage, OdooErrorPanel } from "./odoo-error-panel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Odoo — Panel Comercial Kliniu" };

const fmt = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

function uniqueCount(values: Array<string | false | undefined>) {
  return new Set(values.filter(Boolean)).size;
}

function getOdooCategoryName(category: [number, string] | false | undefined) {
  return Array.isArray(category) ? category[1] : undefined;
}

export default async function OdooPanelPage() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    redirect("/login");
  }

  const result = await Promise.all([
    getOdooConnectionStatus(),
    getOdooProducts(40),
  ])
    .then(([status, products]) => ({ status, products }))
    .catch((error) => ({ error: getOdooErrorMessage(error) }));

  if ("error" in result) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Panel Comercial</p>
          <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Odoo</h1>
          <p className="mt-1 text-sm text-[#64748B]">Información directa de productos e inventario.</p>
        </div>
        <OdooErrorPanel message={result.error} />
      </div>
    );
  }

  const { status, products } = result;

  const totalStock = products.reduce(
    (sum, product) => sum + (product.qty_available ?? 0),
    0,
  );
  const stockValue = products.reduce(
    (sum, product) => sum + (product.qty_available ?? 0) * (product.list_price ?? 0),
    0,
  );
  const withoutStock = products.filter((product) => (product.qty_available ?? 0) <= 0).length;
  const categories = uniqueCount(products.map((product) => getOdooCategoryName(product.categ_id)));

  const cards = [
    { label: "Conexión", value: status.connected ? "Activa" : "Inactiva", sub: `BD ${status.database}`, color: "#16A34A" },
    { label: "Productos leídos", value: products.length.toString(), sub: "últimos actualizados", color: "#27B1B8" },
    { label: "Stock disponible", value: totalStock.toString(), sub: "unidades visibles", color: "#0C535B" },
    { label: "Sin stock", value: withoutStock.toString(), sub: "requieren revisión", color: withoutStock > 0 ? "#DC2626" : "#16A34A" },
    { label: "Categorías", value: categories.toString(), sub: "desde Odoo", color: "#64748B" },
    { label: "Valor inventario", value: fmt(stockValue), sub: "según precio de lista", color: "#FF6B00" },
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Panel Comercial</p>
        <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Odoo</h1>
        <p className="mt-1 text-sm text-[#64748B]">Información directa de productos e inventario.</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
            <p className="text-xs font-semibold text-[#94A3B8]">{card.label}</p>
            <p className="mt-1 text-2xl font-black" style={{ color: card.color }}>{card.value}</p>
            <p className="mt-0.5 text-xs text-[#CBD5E1]">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Link href="/panel/odoo/aplicaciones" className="rounded-2xl border border-[#E2E8F0] bg-white p-6 transition-colors hover:border-[#27B1B8]">
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Acceso Odoo</p>
          <h2 className="mt-2 text-lg font-black text-[#1A1A1A]">Aplicaciones</h2>
          <p className="mt-2 text-sm leading-6 text-[#64748B]">Abre módulos como Ventas, Contactos, CRM, Inventario, Compra y Fabricación.</p>
        </Link>
        <Link href="/panel/odoo/reportes" className="rounded-2xl border border-[#E2E8F0] bg-white p-6 transition-colors hover:border-[#27B1B8]">
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Inteligencia comercial</p>
          <h2 className="mt-2 text-lg font-black text-[#1A1A1A]">Reportes</h2>
          <p className="mt-2 text-sm leading-6 text-[#64748B]">Revisa ventas, cotizaciones, clientes, productos destacados y alertas de stock.</p>
        </Link>
        <Link href="/panel/odoo/productos" className="rounded-2xl border border-[#E2E8F0] bg-white p-6 transition-colors hover:border-[#27B1B8]">
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Catálogo Odoo</p>
          <h2 className="mt-2 text-lg font-black text-[#1A1A1A]">Productos</h2>
          <p className="mt-2 text-sm leading-6 text-[#64748B]">Consulta SKU, categoría, precio de lista y disponibilidad desde Odoo.</p>
        </Link>
        <Link href="/panel/odoo/inventario" className="rounded-2xl border border-[#E2E8F0] bg-white p-6 transition-colors hover:border-[#27B1B8]">
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Operación Odoo</p>
          <h2 className="mt-2 text-lg font-black text-[#1A1A1A]">Inventario</h2>
          <p className="mt-2 text-sm leading-6 text-[#64748B]">Revisa existencias disponibles, pronosticadas y productos sin stock.</p>
        </Link>
      </div>
    </div>
  );
}
