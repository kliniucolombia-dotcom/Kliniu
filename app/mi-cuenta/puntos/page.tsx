import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth";
import { getUserKData, getKTierData, TIERS_K, getMonthlySpendForUser } from "@/lib/points";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mis Puntos K — Kliniu" };

const fmt = (n: number) =>
  n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

export default async function MisPuntosPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");

  const kData = await getUserKData(session.userId);
  if (!kData) redirect("/login");

  const tierData = getKTierData(kData.currentTier);
  const nextTierIdx = TIERS_K.findIndex((t) => t.key === kData.currentTier) + 1;
  const nextTier = nextTierIdx < TIERS_K.length ? TIERS_K[nextTierIdx] : null;
  const spendToNextTier = nextTier ? nextTier.min - kData.monthlySpend : 0;

  // Last month's spend
  const now = new Date();
  const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const lastMonthSpend = await getMonthlySpendForUser(session.userId, prevYear, prevMonth);

  // Recent orders this month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const orders = prisma
    ? await prisma.order.findMany({
        where: { userId: session.userId, createdAt: { gte: monthStart }, status: { not: "CANCELLED" } },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, createdAt: true, subtotal: true, status: true, paymentStatus: true },
      })
    : [];

  const progressPercent =
    kData.currentTier === "NONE"
      ? Math.min(100, Math.round((kData.monthlySpend / 2_000_000) * 100))
      : nextTier
      ? Math.min(
          100,
          Math.round(
            ((kData.monthlySpend - (tierData?.min ?? 0)) /
              ((nextTier.min - (tierData?.min ?? 0)) || 1)) *
              100,
          ),
        )
      : 100;

  const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const currentMonthName = monthNames[now.getMonth()];
  const prevMonthName = monthNames[prevMonth];

  return (
    <main className="min-h-screen bg-[#F0F9F8] text-[#1A1A1A]">
      <div className="mx-auto max-w-[1100px] px-4 py-10 sm:px-6">

        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-[#888]">
          <Link href="/mi-cuenta" className="hover:text-[#0C6060]">Mi cuenta</Link>
          <span>/</span>
          <span className="font-semibold text-[#0C6060]">Puntos K</span>
        </nav>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">

          {/* ── Columna izquierda ── */}
          <div className="space-y-6">

            {/* Tarjeta principal */}
            <div
              className="overflow-hidden rounded-2xl text-white"
              style={{ background: tierData ? `linear-gradient(135deg, ${tierData.color}dd, ${tierData.color}88)` : "linear-gradient(135deg, #0C6060, #27B1B8)" }}
            >
              <div className="relative px-6 py-6">
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Categoría {currentMonthName}</p>
                      <h2 className="mt-1 text-4xl font-black tracking-tight">
                        {kData.currentTier === "NONE" ? "Sin categoría" : kData.currentTier}
                      </h2>
                      {tierData && (
                        <p className="mt-0.5 text-sm text-white/80">Bono recompra: {tierData.bonusPercent}%</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Acumulado este mes</p>
                      <p className="mt-1 text-3xl font-black tabular-nums">{fmt(kData.monthlySpend)}</p>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="mt-6">
                    <div className="mb-1.5 flex justify-between text-xs text-white/80">
                      <span>{kData.currentTier === "NONE" ? "$0" : fmt(tierData?.min ?? 0)}</span>
                      {nextTier ? (
                        <span>Faltan {fmt(spendToNextTier)} para {nextTier.label}</span>
                      ) : (
                        <span>¡Nivel máximo! 🏆</span>
                      )}
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-white/25">
                      <div
                        className="h-full rounded-full bg-white transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bono disponible */}
            {kData.bonusBalance > 0 ? (
              <div className="rounded-2xl border border-[#7BBFB0] bg-[#EAF7F5] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#3D8F8F]">
                      Bono recompra disponible
                    </p>
                    <p className="mt-1 text-4xl font-black text-[#0C6060]">{fmt(kData.bonusBalance)}</p>
                    {kData.bonusExpiry && (
                      <p className="mt-1 text-xs text-[#888]">
                        Vence el{" "}
                        {new Date(kData.bonusExpiry).toLocaleDateString("es-CO", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    )}
                    {kData.minPurchaseToRedeem > 0 && (
                      <p className="mt-1 text-xs text-[#888]">
                        Compra mínima para redimir: <span className="font-bold text-[#0C6060]">{fmt(kData.minPurchaseToRedeem)}</span>
                      </p>
                    )}
                  </div>
                  <Link
                    href="/categorias"
                    className="shrink-0 rounded-full bg-[#0C6060] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
                  >
                    Ir a comprar →
                  </Link>
                </div>
                <p className="mt-3 text-xs text-[#888]">
                  Menciona tu bono al hacer tu pedido o úsalo en el checkout. El bono se aplica únicamente en productos KLINIU®.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-[#E0E0E0] bg-white p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Bono recompra</p>
                <p className="mt-1 text-lg font-bold text-[#888]">Sin bono disponible</p>
                <p className="mt-1 text-xs text-[#999]">
                  Tu bono del mes de {prevMonthName} se asignará al cierre del mes según la categoría alcanzada.
                </p>
                {lastMonthSpend > 0 && (
                  <p className="mt-1 text-xs text-[#555]">
                    Compra de {prevMonthName}: <span className="font-semibold">{fmt(lastMonthSpend)}</span>
                  </p>
                )}
              </div>
            )}

            {/* Órdenes del mes */}
            <div className="rounded-2xl border border-[#E0E0E0] bg-white">
              <div className="border-b border-[#E0E0E0] px-5 py-4">
                <h3 className="font-bold text-[#1A1A1A]">Compras de {currentMonthName}</h3>
              </div>
              {orders.length === 0 ? (
                <div className="p-10 text-center text-sm text-[#999]">
                  Aún no tienes compras este mes.
                  <br />
                  <Link href="/categorias" className="mt-2 inline-block font-semibold text-[#0C6060] hover:underline">
                    Ver productos →
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-[#F0F0F0]">
                  {orders.map((order) => (
                    <div key={order.id} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF7F5] text-sm font-bold text-[#0C6060]">
                        K
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#1A1A1A]">
                          Pedido #{order.id.slice(-6).toUpperCase()}
                        </p>
                        <p className="text-xs text-[#999]">
                          {new Date(order.createdAt).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
                          {" · "}
                          <span className={order.paymentStatus === "PAID" ? "text-green-600" : "text-[#FF6B00]"}>
                            {order.paymentStatus === "PAID" ? "Pagado" : "Pendiente"}
                          </span>
                        </p>
                      </div>
                      <p className="text-sm font-bold text-[#0C6060]">{fmt(order.subtotal)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Columna derecha ── */}
          <div className="space-y-5">

            {/* Todas las categorías */}
            <div className="rounded-2xl border border-[#E0E0E0] bg-white p-5">
              <div className="mb-1 flex items-center justify-between">
                <h3 className="font-bold text-[#1A1A1A]">Categorías Puntos K</h3>
              </div>
              <div className="mb-4 flex gap-1">
                {["#B8822A","#C8A820","#4DAAAA","#5588BB"].map((c) => (
                  <div key={c} className="h-0.5 flex-1 rounded-full" style={{ background: c }} />
                ))}
              </div>
              <div className="space-y-3">
                {TIERS_K.map((tier) => {
                  const isActive = kData.currentTier === tier.key;
                  return (
                    <div
                      key={tier.key}
                      className="flex items-center gap-3 rounded-xl p-3 transition-colors"
                      style={{
                        background: isActive ? tier.colorBg : "transparent",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: isActive ? tier.colorBorder : "transparent",
                      }}
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white"
                        style={{ background: tier.color }}
                      >
                        {tier.bonusPercent}%
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold" style={{ color: isActive ? tier.color : "#333" }}>
                          {tier.label}
                        </p>
                        <p className="text-[10px] text-[#999]">
                          {tier.max === Infinity
                            ? `${fmt(tier.min)}+`
                            : `${fmt(tier.min)} – ${fmt(tier.max)}`}
                        </p>
                      </div>
                      {isActive && (
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold text-white"
                          style={{ background: tier.color }}
                        >
                          Tu nivel
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reglas clave */}
            <div className="rounded-2xl border border-[#E0E0E0] bg-white p-5">
              <h3 className="mb-3 font-bold text-[#1A1A1A]">Reglas clave</h3>
              <div className="space-y-2.5">
                {[
                  "El bono es válido solo el mes siguiente al acumulado.",
                  "Se requiere compra mínima del 25% del mes anterior para redimir.",
                  "Si no se redime, el bono vence automáticamente.",
                  "El bono aplica únicamente en productos KLINIU®.",
                ].map((rule, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0C6060]" />
                    <p className="text-xs leading-relaxed text-[#555]">{rule}</p>
                  </div>
                ))}
              </div>
              <Link
                href="/puntos"
                className="mt-4 inline-block text-xs font-semibold text-[#0C6060] hover:underline"
              >
                Ver condiciones completas →
              </Link>
            </div>

            {/* Foca motivacional */}
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-gradient-to-br from-[#0C4A4A] to-[#27B1B8] p-6 text-center text-white">
              <Image src="/foca-ok-kliniu-original.png" alt="Foca Kliniu" width={80} height={80} className="object-contain" />
              <div>
                <p className="font-bold">¡Sigue comprando!</p>
                <p className="mt-1 text-xs text-white/75">
                  {kData.currentTier === "NONE"
                    ? `Compra ${fmt(2_000_000 - kData.monthlySpend)} más para alcanzar Silver.`
                    : nextTier
                    ? `Compra ${fmt(spendToNextTier)} más para alcanzar ${nextTier.label}.`
                    : "¡Eres Diamante! El nivel más exclusivo. 💎"}
                </p>
              </div>
              <Link
                href="/categorias"
                className="rounded-full bg-white px-5 py-2 text-xs font-bold text-[#0C6060] hover:opacity-90"
              >
                Ver productos
              </Link>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
