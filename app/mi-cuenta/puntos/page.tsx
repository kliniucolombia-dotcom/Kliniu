import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth";
import {
  getPointsForUser,
  getTransactionsForUser,
  getLevelForPoints,
  getLevelProgress,
  getNextLevel,
  getActiveRewards,
  LEVELS,
} from "@/lib/points";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mis puntos — Kliniu" };

const TYPE_LABELS: Record<string, { label: string; color: string; sign: string }> = {
  EARNED:   { label: "Compra",   color: "text-[#FF6B00]", sign: "+" },
  REDEEMED: { label: "Canje",    color: "text-red-500",   sign: "-" },
  EXPIRED:  { label: "Expirado", color: "text-[#999]",    sign: "-" },
  ADJUSTED: { label: "Ajuste",   color: "text-blue-500",  sign: "±" },
  BONUS:    { label: "Bonus",    color: "text-[#FF6B00]", sign: "+" },
};

const LEVEL_ICONS = {
  AQUA: "✨",
  CORAL: "⚡",
  OCEAN: "🚀",
  DIAMOND_SEAL: "👑",
};

export default async function MisPuntosPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");

  const [userPoints, transactions, rewards] = await Promise.all([
    getPointsForUser(session.userId),
    getTransactionsForUser(session.userId, 30),
    getActiveRewards(),
  ]);

  if (!userPoints) redirect("/login");

  const level = getLevelForPoints(userPoints.points);
  const nextLevel = getNextLevel(level.key);
  const progress = getLevelProgress(userPoints.points, level.key);
  const pointsToNext = nextLevel ? nextLevel.min - userPoints.points : 0;

  const totalEarned = transactions.filter((t) => t.points > 0).reduce((s, t) => s + t.points, 0);
  const totalRedeemed = transactions.filter((t) => t.points < 0).reduce((s, t) => s + Math.abs(t.points), 0);

  return (
    <main className="min-h-screen bg-[#FEF3E2] text-[#1A1A1A]">
      <div className="mx-auto max-w-[1100px] px-4 py-10 sm:px-6">

        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-[#888]">
          <Link href="/mi-cuenta" className="hover:text-[#FF6B00]">Mi cuenta</Link>
          <span>/</span>
          <span className="font-semibold text-[#FF6B00]">Mis puntos</span>
        </nav>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">

          {/* ── Columna izquierda ── */}
          <div className="space-y-6">

            {/* Tarjeta nivel actual */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FF8C00] to-[#FFB347] p-6 text-white">
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[120px] opacity-10">
                {LEVEL_ICONS[level.key]}
              </div>
              <div className="relative">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-sm font-semibold opacity-80">Nivel actual</span>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-2xl">{LEVEL_ICONS[level.key]}</span>
                      <h2 className="text-3xl font-black">{level.label}</h2>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold opacity-80">Puntos disponibles</span>
                    <p className="text-4xl font-black tabular-nums">{userPoints.points.toLocaleString()}</p>
                  </div>
                </div>

                {nextLevel ? (
                  <div className="mt-6">
                    <div className="mb-1.5 flex justify-between text-xs opacity-80">
                      <span>{level.label}</span>
                      <span>{pointsToNext.toLocaleString()} puntos para {nextLevel.label}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-white/25">
                      <div className="h-full rounded-full bg-white transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm font-bold opacity-90">¡Estás en el nivel máximo! 🎉</p>
                )}
              </div>
            </div>

            {/* Stats rápidas */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Puntos ganados",   value: totalEarned.toLocaleString(),       color: "text-[#FF6B00]" },
                { label: "Puntos canjeados", value: totalRedeemed.toLocaleString(),     color: "text-red-500" },
                { label: "Transacciones",    value: transactions.length.toString(),     color: "text-[#FF6B00]" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-black/6 bg-white p-4">
                  <p className="text-xs text-[#888]">{s.label}</p>
                  <p className={`mt-1 text-2xl font-black ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Historial de transacciones */}
            <div className="rounded-2xl border border-black/6 bg-white">
              <div className="border-b border-black/6 px-5 py-4">
                <h3 className="font-bold text-[#1A1A1A]">Historial de puntos</h3>
              </div>
              {transactions.length === 0 ? (
                <div className="p-12 text-center text-sm text-[#999]">
                  Aún no tienes movimientos de puntos.<br />
                  <Link href="/categorias" className="mt-2 inline-block font-semibold text-[#FF6B00] hover:underline">
                    Ir a comprar →
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-black/5">
                  {transactions.map((tx) => {
                    const meta = TYPE_LABELS[tx.type] ?? { label: tx.type, color: "text-[#555]", sign: "" };
                    return (
                      <div key={tx.id} className="flex items-center gap-4 px-5 py-3.5">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${tx.points > 0 ? "bg-[#FFF3E0] text-[#FF6B00]" : "bg-red-50 text-red-500"}`}>
                          {meta.sign}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#1A1A1A]">{tx.description}</p>
                          <p className="text-xs text-[#999]">
                            {new Date(tx.createdAt).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
                            {" · "}
                            <span className={`font-medium ${meta.color}`}>{meta.label}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${meta.color}`}>
                            {meta.sign === "-" ? "-" : "+"}{Math.abs(tx.points).toLocaleString()} pts
                          </p>
                          <p className="text-xs text-[#bbb]">Saldo: {tx.balance.toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Columna derecha ── */}
          <div className="space-y-5">

            {/* Todos los niveles */}
            <div className="rounded-2xl border border-black/6 bg-white p-5">
              <h3 className="mb-4 font-bold text-[#1A1A1A]">Niveles del programa</h3>
              <div className="space-y-3">
                {LEVELS.map((l) => {
                  const isActive = userPoints.level === l.key;
                  const isPast = LEVELS.findIndex((x) => x.key === l.key) < LEVELS.findIndex((x) => x.key === userPoints.level);
                  return (
                    <div
                      key={l.key}
                      className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${isActive ? "ring-2 ring-[#FF6B00]" : ""}`}
                      style={{ background: isActive ? "#FFF3E0" : isPast ? "#f9f9f9" : "transparent" }}
                    >
                      <span className="text-2xl">{LEVEL_ICONS[l.key]}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold" style={{ color: isActive ? "#FF6B00" : isPast ? "#999" : "#555" }}>
                          {l.label}
                        </p>
                        <p className="text-xs text-[#999]">
                          {l.max === Infinity ? `${l.min.toLocaleString()}+` : `${l.min.toLocaleString()} – ${l.max.toLocaleString()}`} pts
                        </p>
                      </div>
                      {isActive && <span className="rounded-full bg-[#FF6B00] px-2 py-0.5 text-[9px] font-bold text-white">Actual</span>}
                      {isPast && <span className="text-xs text-[#FF6B00]">✓</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recompensas disponibles */}
            {rewards.length > 0 && (
              <div className="rounded-2xl border border-black/6 bg-white p-5">
                <h3 className="mb-4 font-bold text-[#1A1A1A]">Canjear puntos</h3>
                <div className="space-y-3">
                  {rewards.slice(0, 4).map((reward) => {
                    const canRedeem = userPoints.points >= reward.pointsCost;
                    return (
                      <div key={reward.id} className={`rounded-xl border p-3 ${canRedeem ? "border-[#FF6B00]/30 bg-[#FFF3E0]" : "border-black/6"}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#1A1A1A]">{reward.name}</p>
                            <p className="mt-0.5 text-xs leading-snug text-[#6e7379]">{reward.description}</p>
                          </div>
                          <div className="shrink-0 rounded-full bg-[#FFF3E0] px-2.5 py-1 text-xs font-bold text-[#FF6B00]">
                            {reward.pointsCost.toLocaleString()} pts
                          </div>
                        </div>
                        {canRedeem && (
                          <form action="/api/points/redeem" method="POST" className="mt-2">
                            <input type="hidden" name="rewardId" value={reward.id} />
                            <button
                              type="submit"
                              className="w-full rounded-full bg-[#FF6B00] py-1.5 text-xs font-bold text-white hover:bg-[#FF8C00]"
                            >
                              Canjear ahora
                            </button>
                          </form>
                        )}
                        {!canRedeem && (
                          <p className="mt-1.5 text-xs text-[#999]">
                            Necesitas {(reward.pointsCost - userPoints.points).toLocaleString()} puntos más
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Foca motivacional */}
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-gradient-to-br from-[#FF8C00] to-[#FFB347] p-6 text-center text-white">
              <Image src="/foca-ok-kliniu-original.png" alt="Foca Kliniu" width={80} height={80} className="object-contain" />
              <div>
                <p className="font-bold">¿Quieres más puntos?</p>
                <p className="mt-1 text-xs text-white/75">Compra productos Kliniu y acumula puntos en cada pedido.</p>
              </div>
              <Link href="/categorias" className="rounded-full bg-white px-5 py-2 text-xs font-bold text-[#FF6B00] hover:opacity-90">
                Ver productos
              </Link>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
