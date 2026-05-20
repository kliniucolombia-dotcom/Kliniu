import Image from "next/image";
import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth";
import {
  getPointsForUser,
  getLevelForPoints,
  getNextLevel,
  LEVELS,
  getActiveRewards,
} from "@/lib/points";
import SiteFooter from "@/app/components/site-footer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kliniu Puntos — Programa de Fidelización" };

/* ── SVG icons ── */
const IconCart = () => (
  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);
const IconCoins = () => (
  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/>
    <path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/>
  </svg>
);
const IconGift = () => (
  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 12v10H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/>
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
  </svg>
);
const IconChart = () => (
  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
);
const IconTag = () => (
  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);
const IconTruck = () => (
  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/>
    <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);
const IconHeadset = () => (
  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/>
    <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
  </svg>
);
const IconPercent = () => (
  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>
  </svg>
);
const IconStar = () => (
  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);
const IconChevron = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-[#FF6B00]/40" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M9 18l6-6-6-6"/>
  </svg>
);

export default async function PuntosPage() {
  const session = await getSessionFromCookies();
  const userPoints = session ? await getPointsForUser(session.userId) : null;
  const rewards = await getActiveRewards();

  const currentLevel = userPoints ? getLevelForPoints(userPoints.points) : null;
  const nextLevel = currentLevel ? getNextLevel(currentLevel.key) : null;
  const currentLevelIdx = currentLevel ? LEVELS.findIndex((l) => l.key === currentLevel.key) : -1;
  const pointsToNext = nextLevel ? nextLevel.min - (userPoints?.points ?? 0) : 0;

  return (
    <main className="min-h-screen bg-[#FEF3E2] text-[#1A1A1A]">

      {/* ════════════════════════════════════════
          HERO — banner full-width + texto overlay
          ════════════════════════════════════════ */}
      <section className="relative w-full overflow-hidden" style={{ aspectRatio: "3.1 / 1", minHeight: 300 }}>
        <Image
          src="/puntos-hero-banner.jpg"
          alt="Kliniu Puntos"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Texto superpuesto */}
        <div className="absolute inset-0 flex items-center">
          <div className="mx-auto w-full max-w-[1440px] px-8 lg:px-14">
            <div className="max-w-[480px]">
              <div className="flex items-center gap-2">
                <span className="rounded bg-[#FF6B00] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">Nuevo</span>
                <span className="text-xs font-semibold text-[#5A5A5A]">Programa de fidelización</span>
              </div>
              <h1 className="mt-3 text-[clamp(2.6rem,5.5vw,5rem)] font-black leading-[1.0] tracking-tight">
                Kliniu
                <br />
                <span className="text-[#FF6B00]">Puntos</span>
              </h1>
              <p className="mt-2 text-sm font-semibold text-[#1A1A1A] sm:text-base">
                Más que higiene,{" "}
                <span className="text-[#FF6B00]">experiencias que te premian.</span>
              </p>
              <p className="mt-2 max-w-[320px] text-xs leading-relaxed text-[#5A5A5A] sm:text-sm">
                Acumula puntos en cada compra, sube de nivel y canjea increíbles recompensas por ser parte de Kliniu.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                {session ? (
                  <Link href="/mi-cuenta/puntos" className="inline-flex items-center gap-2 rounded-full bg-[#FF6B00] px-6 py-2.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(255,107,0,0.35)] hover:opacity-90">
                    Ver mis puntos →
                  </Link>
                ) : (
                  <>
                    <Link href="/registro" className="inline-flex items-center gap-2 rounded-full bg-[#FF6B00] px-6 py-2.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(255,107,0,0.35)] hover:opacity-90">
                      Únete gratis →
                    </Link>
                    <Link href="#como-funciona" className="inline-flex items-center gap-2 rounded-full border border-[#1A1A1A]/20 bg-white/80 px-5 py-2.5 text-sm font-bold text-[#1A1A1A] backdrop-blur-sm hover:border-[#FF6B00] hover:text-[#FF6B00]">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                      </svg>
                      Conoce más
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Card "Únete gratis" top-right */}
        {!session && (
          <div className="absolute right-8 top-8 hidden w-44 rounded-2xl bg-white p-4 shadow-[0_12px_32px_rgba(0,0,0,0.12)] lg:block">
            <div className="mb-2 flex justify-center text-[#FF6B00]">
              <IconGift />
            </div>
            <p className="text-center text-[11px] font-black uppercase tracking-wide text-[#FF6B00]">Únete gratis</p>
            <p className="mt-1 text-center text-[10px] leading-snug text-[#6B7280]">
              Es fácil, rápido y tienes beneficios desde tu primera compra.
            </p>
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════
          PASOS + PANEL DE PUNTOS
          ════════════════════════════════════════ */}
      <section className="bg-[#FEF3E2] px-6 py-10">
        <div className="mx-auto max-w-[1200px]">
          <div className="grid gap-6 lg:grid-cols-[1fr_420px]">

            {/* 4 pasos — sin card, iconos flotando sobre el fondo crema */}
            <div className="flex items-center rounded-3xl bg-white/60 p-8">
              <div className="grid w-full grid-cols-2 gap-10 sm:grid-cols-4">
                {[
                  { Icon: IconCart,  label: "COMPRA",        sub: "productos Kliniu", desc: "Cada $1.000 COP en compras equivale a 1 punto Kliniu acumulado." },
                  { Icon: IconCoins, label: "ACUMULA",       sub: "kliniu puntos",    desc: "Tus puntos se suman automáticamente en cada pedido confirmado." },
                  { Icon: IconGift,  label: "CANJEA",        sub: "recompensas increíbles", desc: "Usa tus puntos en descuentos, envíos gratis y premios exclusivos." },
                  { Icon: IconChart, label: "SUBE DE NIVEL", sub: "y desbloquea más beneficios", desc: "A más puntos, mejor tu nivel: Glow, Pulse, Nova o Elite." },
                ].map(({ Icon, label, sub, desc }) => (
                  <div key={label} className="flex flex-col items-center gap-3 text-center">
                    {/* Icono en caja blanca con borde naranja suave y sombra */}
                    <div className="flex h-[80px] w-[80px] items-center justify-center rounded-2xl border border-[#FFD4B0] bg-white text-[#FF6B00] shadow-[0_4px_14px_rgba(255,107,0,0.18)]">
                      <div className="[&_svg]:h-10 [&_svg]:w-10"><Icon /></div>
                    </div>
                    <p className="text-[12px] font-black uppercase tracking-widest text-[#1A1A1A]">{label}</p>
                    <p className="text-[11px] font-semibold leading-snug text-[#FF6B00]">{sub}</p>
                    <p className="text-[11px] leading-relaxed text-[#B0B0B0]">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel puntos actuales + barra niveles */}
            <div className="rounded-3xl bg-white p-6 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#B0B0B0]">
                Tus Kliniu Puntos actuales
              </p>
              <div className="mt-1 flex items-end justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[3.2rem] font-black leading-none text-[#FF6B00]">
                    {(userPoints?.points ?? 0).toLocaleString("es-CO")}
                  </span>
                  <span className="mb-1.5 text-base font-bold text-[#B0B0B0]">PTS</span>
                </div>
                <svg viewBox="0 0 24 24" className="h-7 w-7 text-[#FFD0A8]" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>

              {/* Barra de progreso con nodos */}
              <div className="mt-6">
                <div className="relative flex items-center py-1">
                  {/* Línea 100% naranja siempre */}
                  <div className="absolute left-0 right-0 h-[3px] rounded-full bg-[#FF6B00]" />
                  {/* Nodos: actual/pasados = relleno naranja · futuros = anillo naranja */}
                  {LEVELS.map((l, i) => (
                    <div key={l.key} className="relative z-10 flex flex-1 justify-center first:justify-start last:justify-end">
                      <div className={`h-[15px] w-[15px] rounded-full border-[2.5px] border-[#FF6B00] ${
                        i <= currentLevelIdx ? "bg-[#FF6B00]" : "bg-white"
                      }`} />
                    </div>
                  ))}
                </div>

                {/* Labels bajo los nodos */}
                <div className="mt-2 flex">
                  {LEVELS.map((l, i) => (
                    <div key={l.key} className={`flex-1 ${i === 0 ? "text-left" : i === LEVELS.length - 1 ? "text-right" : "text-center"}`}>
                      <p className={`text-[10px] font-bold ${i <= currentLevelIdx ? "text-[#FF6B00]" : "text-[#9CA3AF]"}`}>
                        {l.label}
                      </p>
                      <p className="text-[9px] text-[#C4C4C4]">
                        {l.max === Infinity ? `${l.min.toLocaleString()}+` : `${l.min.toLocaleString()}–${l.max.toLocaleString()}`} pts
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {nextLevel && (
                <p className="mt-4 text-xs text-[#9CA3AF]">
                  Faltan{" "}
                  <span className="font-bold text-[#FF6B00]">{pointsToNext.toLocaleString()} pts</span>
                  {" "}para {nextLevel.label}
                </p>
              )}
              {!nextLevel && userPoints && (
                <p className="mt-4 text-xs font-bold text-[#FF6B00]">¡Nivel máximo alcanzado! 🎉</p>
              )}

              <Link
                href={session ? "/mi-cuenta/puntos" : "/registro"}
                className="mt-5 block w-full rounded-full bg-[#FF6B00] py-3 text-center text-sm font-bold text-white shadow-[0_8px_22px_rgba(255,107,0,0.35)] transition-opacity hover:opacity-90"
              >
                {session ? "Ver historial completo →" : "Únete y empieza a acumular →"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          BENEFICIOS + CTA naranja
          ════════════════════════════════════════ */}
      <section className="bg-[#FEF3E2] px-6 py-10">
        <div className="mx-auto max-w-[1200px]">
          <div className="grid items-stretch gap-6 lg:grid-cols-[1fr_360px]">

            {/* Beneficios */}
            <div className="flex flex-col justify-between rounded-3xl bg-white/60 p-6">
              <h2 className="mb-5 text-xl font-black text-[#1A1A1A]">
                Beneficios exclusivos <span className="text-[#FF6B00]">para ti</span>
              </h2>

              {/* flex nowrap — siempre 5 en fila */}
              <div className="flex gap-3">
                {[
                  { Icon: IconTag,     label: "DESCUENTOS",  sub: "exclusivos" },
                  { Icon: IconTruck,   label: "ENVÍOS",      sub: "preferenciales" },
                  { Icon: IconHeadset, label: "ATENCIÓN",    sub: "prioritaria" },
                  { Icon: IconPercent, label: "PROMOCIONES", sub: "especiales" },
                  { Icon: IconGift,    label: "SORPRESAS",   sub: "y mucho más" },
                ].map(({ Icon, label, sub }) => (
                  <div key={label} className="flex flex-1 flex-col items-center gap-2 rounded-2xl bg-white py-5 text-center shadow-[0_2px_10px_rgba(0,0,0,0.07)]">
                    <div className="text-[#FF6B00] [&_svg]:h-7 [&_svg]:w-7"><Icon /></div>
                    <p className="text-[10px] font-black tracking-wide text-[#1A1A1A]">{label}</p>
                    <p className="text-[10px] text-[#B0B0B0]">{sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA naranja con foca */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FF8C00] to-[#FFB347] p-8 text-white" style={{ minHeight: 220 }}>
              {/* Burbujas decorativas */}
              <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10" />
              <div className="pointer-events-none absolute -bottom-4 left-8 h-20 w-20 rounded-full bg-white/10" />
              {/* Foca en esquina inferior derecha */}
              <div className="absolute bottom-0 right-0 h-36 w-36">
                <Image
                  src="/foca-ok-kliniu-original.png"
                  alt="Foca Kliniu"
                  fill
                  className="object-contain object-bottom-right"
                />
              </div>
              {/* Contenido */}
              <div className="relative max-w-[65%]">
                <p className="text-lg font-black leading-snug">
                  Empieza a acumular y disfruta beneficios desde hoy.
                </p>
                <p className="mt-2 text-sm text-white/80">
                  Cada compra te acerca a mejores recompensas.
                </p>
                <Link
                  href={session ? "/mi-cuenta/puntos" : "/registro"}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-[#FF6B00] shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:opacity-90"
                >
                  {session ? "Ver mis puntos" : "Únete ahora"} →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          ASÍ DE FÁCIL + NEWSLETTER
          ════════════════════════════════════════ */}
      <section id="como-funciona" className="bg-white px-6 py-8">
        <div className="mx-auto max-w-[1200px]">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_380px]">

            {/* Pasos numerados */}
            <div>
              <h2 className="mb-6 text-center text-xl font-black text-[#1A1A1A]">
                Así de fácil es ganar puntos
              </h2>
              <div className="flex items-start justify-between">
                {[
                  { num: "1", Icon: IconCart,  label: "Compra",        sub: "productos Kliniu" },
                  { num: "2", Icon: IconCoins, label: "Acumula",       sub: "kliniu puntos" },
                  { num: "3", Icon: IconChart, label: "Sube de nivel", sub: "y obtén más beneficios" },
                  { num: "4", Icon: IconGift,  label: "Canjea",        sub: "recompensas increíbles" },
                ].map((paso, i) => (
                  <div key={paso.num} className="flex flex-1 items-center">
                    <div className="flex w-full flex-col items-center gap-2 text-center">
                      <div className="flex h-[58px] w-[58px] items-center justify-center rounded-full bg-[#FF6B00] text-white shadow-[0_4px_14px_rgba(255,107,0,0.28)] [&_svg]:h-[26px] [&_svg]:w-[26px]">
                        <paso.Icon />
                      </div>
                      <p className="text-sm font-bold text-[#1A1A1A]">
                        <span className="mr-1 text-[#FF6B00]">{paso.num}.</span>{paso.label}
                      </p>
                      <p className="text-xs leading-snug text-[#B0B0B0]">{paso.sub}</p>
                    </div>
                    {i < 3 && (
                      <svg viewBox="0 0 24 24" className="mx-1 h-4 w-4 shrink-0 text-[#FFB88A]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Newsletter — icon+título en fila, luego input+botón en fila */}
            <div className="rounded-2xl border border-[#FFE0C0] bg-[#FFFAF5] p-5">
              <div className="mb-3 flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FF6B00]/10 text-[#FF6B00]">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-black text-[#1A1A1A]">Entérate de promociones y novedades</p>
                  <p className="text-xs text-[#B0B0B0]">Recibe ofertas exclusivas y acumula más puntos.</p>
                </div>
              </div>
              <form className="flex gap-2" action="#">
                <input
                  type="email"
                  placeholder="Ingresa tu correo electrónico"
                  className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#FF6B00]"
                />
                <button type="submit" className="shrink-0 rounded-xl bg-[#FF6B00] px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(255,107,0,0.28)] hover:opacity-90">
                  Suscribirme
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          NIVELES
          ════════════════════════════════════════ */}
      <section className="bg-[#FEF3E2] px-6 py-14">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="mb-2 text-center text-2xl font-black text-[#1A1A1A]">Niveles Kliniu Points</h2>
          <p className="mb-10 text-center text-sm text-[#9CA3AF]">Cuantos más puntos acumules, más exclusivos son tus beneficios</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {LEVELS.map((level, idx) => {
              const isActive = userPoints?.level === level.key;
              const isPast = currentLevelIdx > idx;
              return (
                <div
                  key={level.key}
                  className={`relative overflow-hidden rounded-2xl p-6 transition-all ${
                    isActive
                      ? "border-2 border-[#FF6B00] bg-white shadow-[0_8px_32px_rgba(255,107,0,0.18)]"
                      : isPast
                      ? "border border-[#FF6B00]/30 bg-white"
                      : "border border-[#E5E7EB] bg-white"
                  }`}
                >
                  {isActive && (
                    <span className="absolute right-3 top-3 rounded-full bg-[#FF6B00] px-2 py-0.5 text-[9px] font-bold text-white">
                      Tu nivel
                    </span>
                  )}
                  <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${isActive ? "bg-[#FF6B00]" : "bg-[#FFF3E0]"}`}>
                    <span className={`text-xl ${isActive ? "brightness-0 invert" : ""}`}>
                      {["✨", "⚡", "🚀", "👑"][idx]}
                    </span>
                  </div>
                  <h3 className={`text-lg font-black ${isActive ? "text-[#FF6B00]" : "text-[#1A1A1A]"}`}>
                    {level.label}
                  </h3>
                  <p className="mt-0.5 text-xs text-[#9CA3AF]">
                    {level.max === Infinity ? `${level.min.toLocaleString()}+ pts` : `${level.min.toLocaleString()} – ${level.max.toLocaleString()} pts`}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {level.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2 text-xs text-[#555]">
                        <svg viewBox="0 0 24 24" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FF6B00]" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M20 6 9 17l-5-5"/>
                        </svg>
                        {perk}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          RECOMPENSAS (si hay)
          ════════════════════════════════════════ */}
      {rewards.length > 0 && (
        <section className="bg-white px-6 py-14">
          <div className="mx-auto max-w-[1200px]">
            <h2 className="mb-2 text-center text-2xl font-black text-[#1A1A1A]">Recompensas disponibles</h2>
            <p className="mb-10 text-center text-sm text-[#9CA3AF]">Canjea tus puntos por estos beneficios</p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {rewards.map((reward) => {
                const canRedeem = (userPoints?.points ?? 0) >= reward.pointsCost;
                return (
                  <div key={reward.id} className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
                    {reward.image && (
                      <div className="mb-4 flex h-32 items-center justify-center rounded-xl bg-[#FFF8F0]">
                        <Image src={reward.image} alt={reward.name} width={120} height={100} className="object-contain" />
                      </div>
                    )}
                    <h3 className="font-bold text-[#1A1A1A]">{reward.name}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-[#9CA3AF]">{reward.description}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-1 rounded-full bg-[#FFF3E0] px-3 py-1">
                        <IconStar />
                        <span className="text-sm font-bold text-[#FF6B00]">{reward.pointsCost.toLocaleString()} pts</span>
                      </div>
                      <Link
                        href={session ? "/mi-cuenta/puntos" : "/login"}
                        className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                          canRedeem ? "bg-[#FF6B00] text-white hover:opacity-90" : "border border-black/10 text-[#9CA3AF]"
                        }`}
                      >
                        {session ? (canRedeem ? "Canjear" : "Faltan puntos") : "Iniciar sesión"}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════
          CTA FINAL (no logueado)
          ════════════════════════════════════════ */}
      {!session && (
        <section className="bg-[#FEF3E2] px-6 py-16">
          <div className="mx-auto max-w-[1200px]">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FF8C00] to-[#FFB347] px-10 py-14 text-white">
              <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-white/10" />
              <div className="pointer-events-none absolute -bottom-8 left-1/3 h-36 w-36 rounded-full bg-white/10" />
              <div className="relative flex flex-col items-center gap-5 text-center">
                <h2 className="text-3xl font-black">¡Empieza a acumular hoy!</h2>
                <p className="max-w-sm text-sm text-white/80">Crea tu cuenta gratis y gana puntos desde tu primera compra. Cada $1.000 COP = 1 punto.</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link href="/registro" className="rounded-full bg-white px-7 py-3 text-sm font-bold text-[#FF6B00] shadow-[0_8px_20px_rgba(0,0,0,0.15)] hover:opacity-90">
                    Crear cuenta gratis
                  </Link>
                  <Link href="/login" className="rounded-full border border-white/40 px-7 py-3 text-sm font-bold text-white hover:bg-white/10">
                    Ya tengo cuenta
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <SiteFooter />
    </main>
  );
}
