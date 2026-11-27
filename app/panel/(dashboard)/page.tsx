import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermissionWithFallback, getEffectivePermissions } from "@/lib/permissions";
import { isSuperAdmin } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { NOT_SYSTEM_EMPLOYEE } from "@/lib/tickets";
import { MdArrowBack, MdChevronRight } from "react-icons/md";
import { NAV, type NavChild } from "../_components/panel-nav";

const HIDDEN_KEYS = new Set(["inicio", "notificaciones"]);
const COLORS = 10;

type Tile = { key: string; label: string; href: string; icon: React.ReactNode; color: number; count?: number };

export const dynamic = "force-dynamic";
export const metadata = { title: "Panel — Kliniu" };

const TZ = "America/Bogota";
const cop = (n: number) =>
  n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

type Kpi = { label: string; module: string; value: () => Promise<number | string> };

function startOfToday() {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
  return new Date(`${ymd}T00:00:00-05:00`);
}

// KPIs por vista: "inicio" = nivel 1; el resto, por departamento. Cada uno se muestra solo si el usuario ve su módulo.
const KPIS: Record<string, Kpi[]> = {
  inicio: [
    { label: "Vendido hoy", module: "MODULE_PEDIDOS", value: async () => cop(Number((await prisma!.order.aggregate({ where: { status: "PAID", createdAt: { gte: startOfToday() } }, _sum: { subtotal: true } }))._sum.subtotal ?? 0)) },
    { label: "Por despachar", module: "MODULE_PEDIDOS", value: () => prisma!.order.count({ where: { status: "PAID", shippingStatus: "PENDING" } }) },
    { label: "Esperando pago", module: "MODULE_PEDIDOS", value: () => prisma!.order.count({ where: { status: "PENDING" } }) },
  ],
  comercial: [],
  operaciones: [
    { label: "Órdenes de producción activas", module: "MODULE_PRODUCCION", value: () => prisma!.productionOrder.count({ where: { status: { in: ["APPROVED", "IN_PRODUCTION"] } } }) },
    { label: "Casos de calidad sin acción", module: "MODULE_CALIDAD", value: () => prisma!.qualityCase.count({ where: { status: { not: "PROPOSED_ACTION" } } }) },
    { label: "Mantenimientos pendientes", module: "MODULE_MANTENIMIENTO", value: () => prisma!.maintenanceOrder.count({ where: { status: { in: ["PENDING", "IN_PROGRESS"] } } }) },
  ],
  administracion: [
    { label: "Vacaciones/ausencias por aprobar", module: "MODULE_RRHH", value: () => prisma!.timeOffRequest.count({ where: { status: "PENDING" } }) },
    { label: "Empleados activos", module: "MODULE_RRHH", value: () => prisma!.employee.count({ where: { status: "ACTIVE", ...NOT_SYSTEM_EMPLOYEE } }) },
    { label: "Usuarios activos", module: "MODULE_USUARIOS", value: () => prisma!.user.count({ where: { status: "ACTIVE" } }) },
  ],
};
KPIS.comercial = [
  ...KPIS.inicio,
  { label: "Cotizaciones enviadas", module: "MODULE_COTIZACIONES", value: () => prisma!.quotation.count({ where: { status: "SENT" } }) },
  { label: "Campañas activas", module: "MODULE_CAMPANAS", value: () => prisma!.campaign.count({ where: { status: "ACTIVE" } }) },
  { label: "Productos sin stock", module: "MODULE_PRODUCTOS", value: () => prisma!.product.count({ where: { active: true, stock: { lte: 0 } } }) },
];

/** Un KPI que falla muestra "Sin datos"; nunca un número inventado. */
async function loadKpis(view: string, can: (m: string) => boolean) {
  const list = (KPIS[view] ?? []).filter((k) => can(k.module));
  return Promise.all(
    list.map(async (k) => {
      if (!prisma) return { label: k.label, value: "Sin datos" };
      try {
        const v = await k.value();
        return { label: k.label, value: typeof v === "number" ? v.toLocaleString("es-CO") : v };
      } catch {
        return { label: k.label, value: "Sin datos" };
      }
    }),
  );
}

export default async function PanelHome({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s: sectionKey } = await searchParams;
  const access = await requirePermissionWithFallback("MODULE_DASHBOARD", "view");
  if (!access.ok) redirect(access.redirectTo);
  const { user } = access;

  const perms = await getEffectivePermissions(user);
  const superAdmin = isSuperAdmin(user);
  const can = (m: string) => superAdmin || !!perms[m as keyof typeof perms]?.canView;
  const canSee = (c: NavChild) =>
    c.superAdminOnly ? superAdmin : c.anyModule ? c.anyModule.some(can) : can(c.module);

  const visible = NAV.filter((n) => !HIDDEN_KEYS.has(n.key))
    .map((n) => ({ ...n, children: n.children?.filter(canSee) }))
    .filter((n) => (n.children ? n.children.length > 0 : !!n.module && can(n.module)));
  const departments = visible.filter((n) => !n.tool && !n.parent && n.children);
  const department = departments.find((n) => n.key === sectionKey);

  // Herramientas compartidas: van directo a su página, en cualquier nivel.
  const tools: Tile[] = visible
    .filter((n) => n.tool)
    .map((n, i) => ({ key: n.key, label: n.label, href: n.children?.[0]?.href ?? n.href, icon: n.icon, color: ((i + 6) % COLORS) + 1 }));

  // Nivel 1: departamentos. Nivel 2: módulos del departamento, agrupados por `group`.
  const groups: { title: string | null; tiles: Tile[] }[] = department
    ? department.children!.reduce<{ title: string | null; tiles: Tile[] }[]>((acc, c, i) => {
        if (c.group || acc.length === 0) acc.push({ title: c.group ?? null, tiles: [] });
        acc[acc.length - 1].tiles.push({ key: c.href, label: c.label, href: c.href, icon: c.icon, color: (i % COLORS) + 1 });
        return acc;
      }, [])
    : [
        {
          title: null,
          tiles: departments.map((n, i) => ({
            key: n.key,
            label: n.label,
            href: `/panel?s=${n.key}`,
            icon: n.icon,
            color: (i % COLORS) + 1,
            count: n.children!.length,
          })),
        },
      ];

  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("es-CO", { timeZone: TZ, hour: "numeric", hour12: false }).format(now));
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const dateLabel = new Intl.DateTimeFormat("es-CO", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" })
    .format(now)
    .toUpperCase();
  const firstName = user.fullName.split(" ")[0];

  const chips = await loadKpis(department?.key ?? "inicio", can);

  return (
    // Inicio (pocos ítems) va centrado; dentro de un departamento, alineado a la izquierda como una lista.
    <div className={`mx-auto max-w-[1000px] px-5 pb-32 pt-8 sm:px-6 sm:pt-10 ${department ? "" : "text-center"}`}>
      <p className="text-xs font-extrabold tracking-[0.12em] text-[#27B1B8]">{dateLabel}</p>
      <h1 className="mt-2 text-3xl font-extrabold italic text-[#002A2E] sm:text-5xl">
        {greeting}, <span className="text-[#27B1B8]">{firstName}</span>
      </h1>

      {chips.length > 0 && (
      <div className={`mt-6 gap-2.5 ${department ? "grid grid-cols-2 sm:flex sm:flex-wrap" : "flex flex-wrap justify-center"}`}>
        {chips.map((c) => (
          <div key={c.label} className={`min-w-0 rounded-2xl sm:min-w-[130px] border border-[#CFE8EA] bg-white px-4 py-3 ${department ? "" : "w-[calc(50%-0.3125rem)] sm:w-auto"}`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#004B52]/60">{c.label}</p>
            <p className="mt-1 text-xl font-extrabold text-[#004B52]">{c.value}</p>
          </div>
        ))}
      </div>
      )}

      {department ? (
        <div className="mt-10 flex items-center gap-3">
          <Link
            href="/panel"
            aria-label="Volver a departamentos"
            className="grid h-9 w-9 place-items-center rounded-full border border-[#CFE8EA] bg-white text-[#004B52] hover:bg-[#EAF7F8]"
          >
            <MdArrowBack size={18} />
          </Link>
          <nav aria-label="Ruta" className="flex items-center gap-1.5 text-xl font-extrabold">
            <Link href="/panel" className="text-[#004B52]/50 hover:text-[#004B52]">Inicio</Link>
            <MdChevronRight size={20} className="text-[#004B52]/40" aria-hidden />
            <h2 className="text-[#002A2E]">{department.label}</h2>
          </nav>
        </div>
      ) : (
        <h2 className="mt-10 text-xl font-extrabold text-[#002A2E]">Departamentos</h2>
      )}

      {groups.map((g, gi) => (
        <section key={g.title ?? gi} aria-label={g.title ?? undefined}>
          {g.title && <h3 className="mt-8 text-xs font-extrabold uppercase tracking-[0.1em] text-[#004B52]/60">{g.title}</h3>}
          <TileGrid tiles={g.tiles} home={!department} />
        </section>
      ))}
      {groups[0].tiles.length === 0 && <p className="mt-10 text-sm text-[#64748B]">Sin módulos asignados.</p>}

      {tools.length > 0 && (
        <section aria-label="Herramientas compartidas" className="mt-12 border-t border-[#CFE8EA] pt-8">
          <h2 className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#004B52]/60">Herramientas de todos los departamentos</h2>
          <TileGrid tiles={tools} home={!department} />
        </section>
      )}
    </div>
  );
}

function TileGrid({ tiles, home }: { tiles: Tile[]; home?: boolean }) {
  return (
    <div className={home ? "mt-6 flex flex-wrap justify-center gap-x-4 gap-y-7 sm:gap-x-10" : "mt-5 grid grid-cols-3 gap-x-2 gap-y-7 sm:grid-cols-4 lg:grid-cols-6"}>
      {tiles.map((t) => (
        <Link key={t.key} href={t.href} className={`group flex flex-col items-center gap-2.5 text-center outline-none ${home ? "w-[100px] sm:w-[128px]" : ""}`}>
          <span
            className={`panel-tile panel-c${t.color} grid place-items-center transition-transform duration-200 group-hover:-translate-y-1 group-focus-visible:ring-2 group-focus-visible:ring-[#27B1B8] group-focus-visible:ring-offset-2 ${
              home
                ? "h-[76px] w-[76px] rounded-[22px] [&>svg]:h-9 [&>svg]:w-9 sm:h-[84px] sm:w-[84px] sm:rounded-[24px] sm:[&>svg]:h-10 sm:[&>svg]:w-10"
                : "h-[88px] w-[88px] rounded-[24px] [&>svg]:h-10 [&>svg]:w-10"
            }`}
          >
            {t.icon}
          </span>
          <span className={`font-bold text-[#002A2E] ${home ? "text-[13px] sm:text-[14px]" : "text-[13px]"}`}>{t.label}</span>
          {t.count != null && <span className="-mt-2 text-[11px] font-semibold text-[#004B52]/55">{t.count} módulos</span>}
        </Link>
      ))}
    </div>
  );
}
