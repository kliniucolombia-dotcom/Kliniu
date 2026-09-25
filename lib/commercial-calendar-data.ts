// Calendario de actividad comercial — carga de datos (servidor). Reutiliza User, Campaign y CampaignDaily.
import { prisma } from "@/lib/prisma";
import { getTrmForDate } from "@/lib/trm";
import {
  addDays, bogotaNow, compliance, computeDayStatus, dateToKey, DEFAULT_DEADLINE_MINUTES,
  DEFAULT_WORK_DAYS, keyToDate, monthKeys, prevMonth, weekday,
  type Cell, type CellEvent, type CellNewCampaign, type CellRow, type SellerCalendar,
} from "@/lib/commercial-calendar";

const HIDDEN_NAMES = ["kliniu1234", "odoo"];

export type CalendarSession = { userId: string; role: string };

export async function getCalendarConfig() {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  const existing = await prisma.calendarConfig.findUnique({ where: { id: "default" } });
  if (existing) return existing;
  // Primer uso: el seguimiento arranca hoy; no se inventa historial hacia atrás.
  return prisma.calendarConfig.create({
    data: { id: "default", deadlineMinutes: DEFAULT_DEADLINE_MINUTES, trackingStartDate: keyToDate(bogotaNow().key) },
  });
}

/** Vendedores que entran al calendario: rol SELLER o dueños de al menos una campaña. */
export async function listCalendarSellers(session: CalendarSession, onlyId?: string) {
  if (!prisma) return [];
  const users = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      OR: [{ role: "SELLER" }, { campaigns: { some: {} } }],
      NOT: { OR: HIDDEN_NAMES.map((n) => ({ fullName: { equals: n, mode: "insensitive" as const } })) },
      ...(session.role === "SELLER" ? { id: session.userId } : onlyId ? { id: onlyId } : {}),
    },
    select: { id: true, fullName: true, email: true, role: true },
    orderBy: { fullName: "asc" },
  });
  const settings = await prisma.sellerCalendarSetting.findMany({ where: { userId: { in: users.map((u) => u.id) } } });
  const byUser = new Map(settings.map((s) => [s.userId, s]));
  return users.map((u) => ({
    id: u.id,
    name: u.fullName || u.email,
    workDays: byUser.get(u.id)?.workDays ?? DEFAULT_WORK_DAYS,
    active: byUser.get(u.id)?.active ?? true,
  }));
}

export async function loadCalendar(opts: { month: string; session: CalendarSession; sellerId?: string; platform?: string }) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  const { month, session, platform } = opts;
  const now = bogotaNow();
  const config = await getCalendarConfig();
  const trackingStart = dateToKey(config.trackingStartDate);

  const monthKs = monthKeys(month);
  const prevKs = monthKeys(prevMonth(month));
  const last14 = Array.from({ length: 14 }, (_, i) => addDays(now.key, -13 + i));
  const windows: [string, string][] = [
    [monthKs[0], monthKs[monthKs.length - 1]],
    [prevKs[0], prevKs[prevKs.length - 1]],
    [last14[0], now.key],
  ];
  const allKeys = new Set([...monthKs, ...prevKs, ...last14]);

  const sellersAll = await listCalendarSellers(session);
  const sellers = sellersAll.filter((s) => s.active);
  const ids = sellers.map((s) => s.id);
  const dateOr = (field: "fecha" | "date") => windows.map(([a, b]) => ({ [field]: { gte: keyToDate(a), lte: keyToDate(b) } }));

  const [rows, closes, events, newCamps, holidays] = await Promise.all([
    prisma.campaignDaily.findMany({
      where: { campaign: { sellerId: { in: ids } }, OR: dateOr("fecha") },
      select: {
        fecha: true, mensajes: true, transacciones: true, presupuestoPublicidad: true, ventaDelDia: true, updatedAt: true,
        campaign: { select: { id: true, name: true, platform: true, sellerId: true, status: true } },
      },
    }),
    prisma.sellerDailyClose.findMany({ where: { sellerId: { in: ids }, OR: dateOr("date") } }),
    prisma.sellerReportEvent.findMany({ where: { sellerId: { in: ids }, OR: dateOr("date") }, orderBy: { createdAt: "asc" } }),
    prisma.campaign.findMany({
      where: {
        sellerId: { in: ids },
        OR: windows.map(([a, b]) => ({ createdAt: { gte: keyToDate(a), lt: keyToDate(addDays(b, 1)) } })),
      },
      select: {
        id: true, name: true, platform: true, status: true, createdAt: true, sellerId: true,
        dailyEntries: { orderBy: { fecha: "asc" }, take: 1, select: { presupuestoPublicidad: true } },
      },
    }),
    prisma.calendarHoliday.findMany(),
  ]);

  const holidaySet = new Set(holidays.map((h) => dateToKey(h.date)));
  const actorIds = [...new Set(events.map((e) => e.actorId))];
  const actors = await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, fullName: true, email: true } });
  const actorName = new Map(actors.map((a) => [a.id, a.fullName || a.email]));

  type Bucket = {
    rows: (CellRow & { updatedAt: number })[];
    close?: (typeof closes)[number];
    events: CellEvent[];
    firstReport: number | null;
    news: CellNewCampaign[];
  };
  const buckets = new Map<string, Bucket>();
  const bucket = (sellerId: string, date: string) => {
    const k = `${sellerId}|${date}`;
    let b = buckets.get(k);
    if (!b) { b = { rows: [], events: [], firstReport: null, news: [] }; buckets.set(k, b); }
    return b;
  };
  const minReport = (b: Bucket, t: number) => { b.firstReport = b.firstReport === null ? t : Math.min(b.firstReport, t); };

  for (const r of rows) {
    const b = bucket(r.campaign.sellerId, dateToKey(r.fecha));
    b.rows.push({
      campaignId: r.campaign.id, name: r.campaign.name, platform: r.campaign.platform,
      venta: r.ventaDelDia, presupuestoUsd: r.presupuestoPublicidad, mensajes: r.mensajes,
      transacciones: r.transacciones, updatedAt: r.updatedAt.getTime(),
    });
  }
  for (const c of closes) {
    const b = bucket(c.sellerId, dateToKey(c.date));
    b.close = c;
    minReport(b, c.closedAt.getTime());
  }
  for (const e of events) {
    const b = bucket(e.sellerId, dateToKey(e.date));
    b.events.push({ kind: e.kind, value: e.value, at: e.createdAt.toISOString(), actor: actorName.get(e.actorId) ?? "—" });
    if (e.kind === "CLOSE" || e.value > 0) minReport(b, e.createdAt.getTime());
  }
  for (const c of newCamps) {
    bucket(c.sellerId, dateToKey(c.createdAt)).news.push({
      id: c.id, name: c.name, platform: c.platform, status: c.status, createdAt: c.createdAt.toISOString(),
      initialUsd: c.dailyEntries[0]?.presupuestoPublicidad || null,
    });
  }

  const sellersOut: SellerCalendar[] = sellers.map((s) => {
    const cells: Record<string, Cell> = {};
    for (const date of allKeys) {
      const b = buckets.get(`${s.id}|${date}`);
      const allSales = b?.rows.reduce((t, r) => t + r.venta, 0) ?? 0;
      const first = b ? (b.firstReport ?? (allSales > 0 ? Math.min(...b.rows.filter((r) => r.venta > 0).map((r) => r.updatedAt)) : null)) : null;
      const res = computeDayStatus({
        date, todayKey: now.key, nowMinutes: now.minutes, deadlineMinutes: config.deadlineMinutes,
        trackingStart, workDays: s.workDays, isHoliday: holidaySet.has(date), active: true,
        hasClose: !!b?.close, salesTotal: allSales, rowsCount: b?.rows.length ?? 0, firstReportAt: first,
      });
      const shown = (b?.rows ?? []).filter((r) => !platform || r.platform === platform);
      const updates = [...(b?.rows.map((r) => r.updatedAt) ?? []), ...(b?.close ? [b.close.closedAt.getTime()] : [])];
      cells[date] = {
        date, ...res,
        total: shown.reduce((t, r) => t + r.venta, 0),
        campaignsWithSales: shown.filter((r) => r.venta > 0).length,
        rows: shown.map(({ updatedAt: _u, ...r }) => r),
        newCampaigns: (b?.news ?? []).filter((c) => !platform || c.platform === platform),
        closed: !!b?.close,
        noSales: !!b?.close?.noSales,
        lastUpdate: updates.length ? new Date(Math.max(...updates)).toISOString() : null,
        events: b?.events ?? [],
      };
    }
    return { id: s.id, name: s.name, workDays: s.workDays, cells };
  });

  // ─── KPIs ───
  const yesterday = addDays(now.key, -1);
  const day = (key: string) => {
    const cs = sellersOut.map((s) => s.cells[key]);
    const expected = cs.filter((c) => c.status !== "GRAY" && c.status !== "FUTURE" && c.reason !== "untracked");
    return {
      reported: cs.filter((c) => c.status === "GREEN" && c.reason !== "untracked").length,
      expected: expected.length,
      sales: cs.reduce((t, c) => t + c.total, 0),
    };
  };
  const period = (keys: string[]) => {
    const cs = sellersOut.flatMap((s) => keys.map((k) => s.cells[k]));
    const { done, expected, pct } = compliance(cs, () => true);
    return {
      done, expected, pct,
      late: cs.filter((c) => c.late).length,
      newCampaigns: cs.reduce((t, c) => t + c.newCampaigns.length, 0),
    };
  };
  const today = day(now.key);
  const ayer = day(yesterday);
  const kpis = {
    today, yesterday: ayer,
    pending: today.expected - today.reported,
    yesterdayPending: ayer.expected - ayer.reported,
    month: period(monthKs),
    prevMonth: period(prevKs),
  };

  // ─── Alertas (últimos 14 días, sin filtro de plataforma) ───
  const alerts = sellersOut.map((s) => {
    const past = last14.filter((k) => k < now.key || s.cells[k].status === "RED");
    const items: string[] = [];
    const lastWork = [...past].reverse().find((k) => s.cells[k].status !== "GRAY");
    if (lastWork && s.cells[lastWork].status === "RED") {
      items.push(lastWork === yesterday ? "No reportó ayer." : `No reportó el ${lastWork.slice(8)}/${lastWork.slice(5, 7)}.`);
    }
    let streak = 0;
    for (const k of [...past].reverse()) {
      const st = s.cells[k].status;
      if (st === "GRAY") continue;
      if (st === "RED") streak++;
      else break;
    }
    if (streak >= 2) items.push(`${streak} días laborables consecutivos sin reportar.`);
    const reds = last14.filter((k) => s.cells[k].status === "RED").length;
    if (reds > 0) items.push(`${reds} ${reds === 1 ? "reporte pendiente" : "reportes pendientes"} (últimos 14 días).`);
    const lates = last14.filter((k) => s.cells[k].late).length;
    if (lates > 0) items.push(`${lates} ${lates === 1 ? "reporte fuera de plazo" : "reportes fuera de plazo"} (últimos 14 días).`);
    return { sellerId: s.id, name: s.name, items };
  });

  // Campañas activas que invierten sin vender en los últimos 3 días.
  const last3 = new Set([now.key, addDays(now.key, -1), addDays(now.key, -2)]);
  const spend = new Map<string, { name: string; sellerId: string; usd: number; venta: number }>();
  for (const r of rows) {
    if (r.campaign.status !== "ACTIVE" || !last3.has(dateToKey(r.fecha))) continue;
    const cur = spend.get(r.campaign.id) ?? { name: r.campaign.name, sellerId: r.campaign.sellerId, usd: 0, venta: 0 };
    cur.usd += r.presupuestoPublicidad;
    cur.venta += r.ventaDelDia;
    spend.set(r.campaign.id, cur);
  }
  const nameOf = new Map(sellers.map((s) => [s.id, s.name]));
  const spendingNoSales = [...spend.entries()]
    .filter(([, v]) => v.usd > 0 && v.venta === 0)
    .map(([id, v]) => ({ campaignId: id, name: v.name, seller: nameOf.get(v.sellerId) ?? "—", usd: v.usd }));

  // TRM solo de los días del mes visible con inversión (para ROAS en el detalle).
  const trmDates = new Set<string>();
  for (const s of sellersOut) for (const k of monthKs) if (s.cells[k].rows.some((r) => r.presupuestoUsd > 0)) trmDates.add(k);
  const trm: Record<string, number> = {};
  await Promise.all([...trmDates].map(async (k) => { trm[k] = await getTrmForDate(k); }));

  const monthSet = new Set([...monthKs, ...last14]);
  const visible = sellersOut.map((s) => ({
    ...s,
    cells: Object.fromEntries(Object.entries(s.cells).filter(([k]) => monthSet.has(k))),
  }));

  // Meses con actividad (ventas registradas o campañas creadas) para el filtro de mes.
  const monthRows = await prisma.$queryRaw<{ m: string }[]>`
    SELECT DISTINCT to_char(d.fecha AT TIME ZONE 'America/Bogota', 'YYYY-MM') AS m
    FROM "CampaignDaily" d JOIN "Campaign" c ON c.id = d."campaignId" WHERE c."sellerId" = ANY(${ids})
    UNION
    SELECT DISTINCT to_char(c."createdAt" AT TIME ZONE 'America/Bogota', 'YYYY-MM') FROM "Campaign" c WHERE c."sellerId" = ANY(${ids})`;
  const months = monthRows.map((r) => r.m).sort().reverse();

  return {
    months, month, today: now.key, deadlineMinutes: config.deadlineMinutes, trackingStart,
    holidays: [...holidaySet], sellers: visible, kpis, alerts, spendingNoSales, trm,
    weekdayOfFirst: weekday(monthKs[0]),
  };
}

/** Cierra el día del vendedor (cero ventas o cierre explícito). Idempotente por (vendedor, fecha). */
export async function closeSellerDay(opts: { sellerId: string; date: string; noSales: boolean; actorId: string }) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  const date = keyToDate(opts.date);
  const dayRows = await prisma.campaignDaily.findMany({
    where: { fecha: date, campaign: { sellerId: opts.sellerId } },
    select: { ventaDelDia: true },
  });
  const totalSold = dayRows.reduce((t, r) => t + r.ventaDelDia, 0);
  const noSales = opts.noSales && totalSold === 0;
  const existing = await prisma.sellerDailyClose.findUnique({ where: { sellerId_date: { sellerId: opts.sellerId, date } } });
  if (existing) return existing;
  const close = await prisma.sellerDailyClose.create({
    data: { sellerId: opts.sellerId, date, noSales, totalSold, closedById: opts.actorId },
  });
  await prisma.sellerReportEvent.create({
    data: { sellerId: opts.sellerId, date, kind: "CLOSE", value: totalSold, actorId: opts.actorId },
  });
  return close;
}
