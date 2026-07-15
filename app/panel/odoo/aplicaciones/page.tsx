import { redirect } from "next/navigation";
import { requirePermissionWithFallback } from "@/lib/permissions";
import { getOdooApps } from "@/lib/odoo";
import { getOdooErrorMessage, OdooErrorPanel } from "../odoo-error-panel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Aplicaciones Odoo — Panel Comercial" };

const fallbackIcons = ["◒", "31", "▥", "▣", "◆", "▦", "▤", "◈", "⬢", "▰", "◉", "⌕"];

export default async function OdooApplicationsPage() {
  const access = await requirePermissionWithFallback("MODULE_ODOO", "view");
  if (!access.ok) {
    redirect(access.redirectTo);
  }

  const appsResult = await getOdooApps().catch((error) => ({
    error: getOdooErrorMessage(error),
  }));

  if ("error" in appsResult) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Odoo</p>
            <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Aplicaciones</h1>
            <p className="mt-1 text-sm text-[#64748B]">Acceso directo a los módulos disponibles en tu cuenta de Odoo.</p>
          </div>
        </div>
        <OdooErrorPanel message={appsResult.error} />
      </div>
    );
  }

  const apps = appsResult;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Odoo</p>
          <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Aplicaciones</h1>
          <p className="mt-1 text-sm text-[#64748B]">Acceso directo a los módulos disponibles en tu cuenta de Odoo.</p>
        </div>
        <a
          href={process.env.ODOO_URL ? `${process.env.ODOO_URL.replace(/\/+$/, "")}/odoo` : "#"}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl bg-[#27B1B8] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-85"
        >
          Abrir Odoo
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {apps.map((app, index) => (
          <a
            key={app.id}
            href={app.url}
            target="_blank"
            rel="noreferrer"
            className="group rounded-2xl border border-[#E2E8F0] bg-white p-5 text-center transition-all hover:-translate-y-0.5 hover:border-[#27B1B8] hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
          >
            <span className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-2xl font-black text-[#27B1B8] shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
              {app.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={app.icon} alt="" className="h-full w-full object-cover" />
              ) : (
                fallbackIcons[index % fallbackIcons.length]
              )}
            </span>
            <span className="mt-3 block text-sm font-black text-[#1A1A1A] transition-colors group-hover:text-[#0C535B]">
              {app.name}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
