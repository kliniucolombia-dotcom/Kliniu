import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermissionWithFallback, getEffectivePermissions } from "@/lib/permissions";
import { isSuperAdmin } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { PANEL_APPS, canSeeApp } from "../_components/panel-apps";

export const dynamic = "force-dynamic";
export const metadata = { title: "Panel — Kliniu" };

const TZ = "America/Bogota";
const cop = (n: number) =>
  n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

async function getHomeKpis() {
  if (!prisma) return null;
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
  const startOfDay = new Date(`${ymd}T00:00:00-05:00`);
  const [today, toShip, awaiting] = await Promise.all([
    prisma.order.aggregate({ where: { status: "PAID", createdAt: { gte: startOfDay } }, _sum: { subtotal: true } }),
    prisma.order.count({ where: { status: "PAID", shippingStatus: "PENDING" } }),
    prisma.order.count({ where: { status: "PENDING" } }),
  ]);
  return { today: Number(today._sum.subtotal ?? 0), toShip, awaiting };
}

export default async function PanelHome() {
  const access = await requirePermissionWithFallback("MODULE_DASHBOARD", "view");
  if (!access.ok) redirect(access.redirectTo);
  const { user } = access;

  const [perms, kpis] = await Promise.all([getEffectivePermissions(user), getHomeKpis().catch(() => null)]);
  const superAdmin = isSuperAdmin(user);
  const can = (m: string) => superAdmin || !!perms[m as keyof typeof perms]?.canView;
  const apps = PANEL_APPS.filter((a) => canSeeApp(a, can, superAdmin));

  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("es-CO", { timeZone: TZ, hour: "numeric", hour12: false }).format(now));
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const dateLabel = new Intl.DateTimeFormat("es-CO", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" })
    .format(now)
    .toUpperCase();
  const firstName = user.fullName.split(" ")[0];

  const chips = [
    { label: "Vendido hoy", value: kpis ? cop(kpis.today) : "Sin datos" },
    { label: "Por despachar", value: kpis ? String(kpis.toShip) : "Sin datos" },
    { label: "Esperando pago", value: kpis ? String(kpis.awaiting) : "Sin datos" },
  ];

  return (
    <div className="mx-auto max-w-[1000px] px-5 pb-32 pt-8 sm:px-6 sm:pt-10">
      <p className="text-xs font-extrabold tracking-[0.12em] text-[#27B1B8]">{dateLabel}</p>
      <h1 className="mt-2 text-3xl font-extrabold italic text-[#002A2E] sm:text-5xl">
        {greeting}, <span className="text-[#27B1B8]">{firstName}</span>
      </h1>

      <div className="mt-6 flex flex-wrap gap-2.5">
        {chips.map((c) => (
          <div key={c.label} className="min-w-[130px] rounded-2xl border border-[#CFE8EA] bg-white px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#004B52]/60">{c.label}</p>
            <p className="mt-1 text-xl font-extrabold text-[#004B52]">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid grid-cols-3 gap-x-2 gap-y-7 sm:grid-cols-4 lg:grid-cols-6">
        {apps.map((a) => (
          <Link key={a.key} href={a.href} className="group flex flex-col items-center gap-2.5 text-center outline-none">
            <span
              className={`panel-tile panel-tone-${a.tone} grid h-[88px] w-[88px] place-items-center rounded-[24px] transition-transform duration-200 group-hover:-translate-y-1 group-focus-visible:ring-2 group-focus-visible:ring-[#27B1B8]`}
            >
              <a.icon size={38} />
            </span>
            <span className="text-[13px] font-bold text-[#002A2E]">{a.label}</span>
          </Link>
        ))}
      </div>
      {apps.length === 0 && <p className="mt-10 text-sm text-[#64748B]">Sin módulos asignados.</p>}
    </div>
  );
}
