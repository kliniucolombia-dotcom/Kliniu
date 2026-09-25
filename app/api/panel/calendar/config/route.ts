import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getCalendarConfig, listCalendarSellers } from "@/lib/commercial-calendar-data";
import { dateToKey, keyToDate } from "@/lib/commercial-calendar";
import { broadcastPanelUpdate } from "@/lib/realtime";

const CONFIG_ROLES = ["SUPERADMIN", "ADMIN", "JEFE_VENTAS"];
const KEY = /^\d{4}-\d{2}-\d{2}$/;

async function guard(action: "view" | "edit") {
  const access = await requirePermission("MODULE_CAMPANAS", action);
  if (!access.ok) return { error: Response.json({ error: "No autorizado" }, { status: access.status }) };
  if (!CONFIG_ROLES.includes(access.session.role)) return { error: Response.json({ error: "Sin permiso" }, { status: 403 }) };
  return { session: access.session };
}

export async function GET() {
  const g = await guard("view");
  if (g.error) return g.error;
  if (!prisma) return Response.json({ error: "DB no disponible" }, { status: 500 });
  const [config, holidays, sellers] = await Promise.all([
    getCalendarConfig(),
    prisma.calendarHoliday.findMany({ orderBy: { date: "asc" } }),
    listCalendarSellers(g.session),
  ]);
  return Response.json({
    deadlineMinutes: config.deadlineMinutes,
    trackingStartDate: dateToKey(config.trackingStartDate),
    holidays: holidays.map((h) => ({ date: dateToKey(h.date), label: h.label })),
    sellers,
  });
}

export async function PUT(request: Request) {
  const g = await guard("edit");
  if (g.error) return g.error;
  if (!prisma) return Response.json({ error: "DB no disponible" }, { status: 500 });

  const body = await request.json().catch(() => ({})) as {
    deadlineMinutes?: number; trackingStartDate?: string;
    holidays?: { date: string; label: string }[];
    sellers?: { userId: string; workDays: number[]; active: boolean }[];
  };

  await getCalendarConfig();
  const data: { deadlineMinutes?: number; trackingStartDate?: Date } = {};
  if (body.deadlineMinutes !== undefined) {
    if (!Number.isInteger(body.deadlineMinutes) || body.deadlineMinutes < 0 || body.deadlineMinutes > 1439) {
      return Response.json({ error: "Hora límite inválida" }, { status: 400 });
    }
    data.deadlineMinutes = body.deadlineMinutes;
  }
  if (body.trackingStartDate !== undefined) {
    if (!KEY.test(body.trackingStartDate)) return Response.json({ error: "Fecha de inicio inválida" }, { status: 400 });
    data.trackingStartDate = keyToDate(body.trackingStartDate);
  }
  if (Object.keys(data).length) await prisma.calendarConfig.update({ where: { id: "default" }, data });

  if (body.holidays) {
    const clean = body.holidays.filter((h) => KEY.test(h.date)).map((h) => ({ date: keyToDate(h.date), label: (h.label || "Festivo").slice(0, 80) }));
    await prisma.$transaction([
      prisma.calendarHoliday.deleteMany({}),
      prisma.calendarHoliday.createMany({ data: clean, skipDuplicates: true }),
    ]);
  }
  if (body.sellers) {
    for (const s of body.sellers) {
      const workDays = [...new Set(s.workDays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
      await prisma.sellerCalendarSetting.upsert({
        where: { userId: s.userId },
        update: { workDays, active: !!s.active },
        create: { userId: s.userId, workDays, active: !!s.active },
      });
    }
  }

  broadcastPanelUpdate("campaigns").catch(() => {});
  return Response.json({ ok: true });
}
