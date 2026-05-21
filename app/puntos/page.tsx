import Image from "next/image";
import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth";
import { TIERS_K, getUserKData, getKTierData } from "@/lib/points";
import SiteFooter from "@/app/components/site-footer";
import { FadeIn } from "./fade-in";

export const dynamic = "force-dynamic";
export const metadata = { title: "Puntos K — Programa de Fidelización Kliniu" };

const fmt = (n: number) =>
  n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

const TIER_CONFIG = {
  SILVER:   { gradientStyle: "linear-gradient(160deg, #c8c8d8 0%, #e8e8f0 50%, #f5f5f8 100%)", shadow: "0 16px 40px rgba(140,140,160,0.35)", ring: "#9A9AB0", label: "#5A5A72" },
  GOLD:     { gradientStyle: "linear-gradient(160deg, #D4A017 0%, #F0C040 40%, #FDE88A 100%)",  shadow: "0 16px 40px rgba(212,160,23,0.40)",  ring: "#D4A017", label: "#7A5800" },
  PLATINUM: { gradientStyle: "linear-gradient(160deg, #1A8FA0 0%, #27B1C8 40%, #7DDDE8 100%)", shadow: "0 16px 40px rgba(27,177,200,0.38)", ring: "#27B1C8", label: "#0C535B" },
  DIAMANTE: { gradientStyle: "linear-gradient(160deg, #5B1FA8 0%, #8B3FD8 40%, #C084FC 100%)", shadow: "0 16px 40px rgba(107,33,168,0.42)", ring: "#8B3FD8", label: "#3B0F6E" },
};

const FOCA_IMAGES = [
  "/foca-ok-kliniu-original.png",
  "/foca-como-elegir-liquidos.png",
  "/foca-como-elegir-papel.png",
  "/foca-como-elegir-klinox.png",
];

const CONDITIONS_LEFT = [
  {
    num: "1",
    icon: "🗓",
    title: "Acumulación mensual",
    items: [
      "Las compras se suman de forma acumulada dentro del mismo mes calendario.",
      "La categoría y el bono se determinan con base en el total acumulado al cierre del mes.",
    ],
  },
  {
    num: "2",
    icon: "🛒",
    title: "Redención del bono",
    items: [
      "El bono recompra se redime únicamente en producto KLINIU®.",
      "El valor es equivalente al porcentaje según la categoría alcanzada.",
      "Es redimible únicamente en el mes siguiente al que se acumuló.",
      "Requisito de compra mínima: Para redimir, el cliente debe realizar una compra equivalente al 25% de la compra acumulada del mes anterior.",
      "Ejemplo: Si en agosto acumuló $6.000.000 (Platinum), para redimir en septiembre debe comprar mínimo $1.500.000.",
    ],
  },
  {
    num: "3",
    icon: "⏳",
    title: "Vencimiento del bono",
    items: [
      "Si el bono no se redime en el mes siguiente, se pierde automáticamente y no se puede reclamar posteriormente.",
    ],
  },
];

const CONDITIONS_RIGHT = [
  {
    num: "4",
    icon: "🔄",
    title: "Acumulación continua",
    items: [
      "La compra que realice en el mes de redención también cuenta para acumular puntos y alcanzar categoría para el mes siguiente.",
    ],
  },
  {
    num: "5",
    icon: "👥",
    title: "Naturaleza del programa",
    items: [
      "Este plan busca mantener una relación mensual con nuestros clientes, premiando la fidelidad y el volumen de compra.",
      "Favorece a quienes realizan compras constantes y en volúmenes que les permitan acceder a las mejores recompensas.",
    ],
  },
  {
    num: "6",
    icon: "⚖️",
    title: "Aspectos legales",
    items: [
      "El Plan K se rige por las leyes colombianas y se reserva el derecho a modificar condiciones según normatividad vigente.",
      "La participación implica la aceptación de sus términos y condiciones.",
    ],
  },
];

const REDEEM_CHECKS = [
  "Redime tu bono únicamente en el mes siguiente al que se acumuló.",
  "Haz una compra mínima del 25% de tu compra acumulada del mes anterior para poder redimir.",
  "El bono recompra es equivalente al porcentaje según la categoría alcanzada.",
  "El bono solo aplica en producto KLINIU®.",
];

export default async function PuntosPage() {
  const session = await getSessionFromCookies();
  const kData = session ? await getUserKData(session.userId) : null;
  const userTierData = kData ? getKTierData(kData.currentTier) : null;

  return (
    <main className="min-h-screen bg-white text-[#1A1A1A]">

      {/* ─── HERO ─── */}
      <section className="relative w-full overflow-hidden bg-[#7B3FCF]" style={{ minHeight: 580 }}>
        <Image
          src="/puntos-k-banner.jpg"
          alt="Puntos K Kliniu"
          fill
          priority
          sizes="100vw"
          className="object-cover object-right"
        />
        {/* Left overlay gradient */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(60,20,130,0.88) 0%, rgba(90,35,170,0.65) 40%, rgba(90,35,170,0.15) 65%, transparent 80%)" }} />

        <div className="absolute inset-0 flex items-center">
          <div className="mx-auto w-full max-w-[1440px] px-8 lg:px-16">
            <div className="max-w-[600px] text-white">

              <FadeIn delay={0} direction="up">
                <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
                  <span>✦</span> Programa de fidelización KLINIU®
                </div>

                <h1 className="mt-3 font-black leading-none tracking-tight">
                  <span className="block" style={{ fontSize: "clamp(1.8rem,3vw,3rem)", color: "rgba(255,255,255,0.85)", fontWeight: 500, letterSpacing: "0.08em" }}>PROGRAMA</span>
                  <span className="block" style={{ fontSize: "clamp(3.5rem,7vw,6rem)" }}>Puntos <span style={{ color: "#E9D5FF" }}>K</span></span>
                </h1>

                <p className="mt-5 text-lg font-semibold leading-relaxed" style={{ color: "rgba(255,255,255,0.9)" }}>
                  Compra, acumula y recibe un <span style={{ color: "#E9D5FF", fontWeight: 800 }}>bono recompra</span><br />
                  en producto KLINIU® cada mes.
                </p>

                <div className="mt-5 flex gap-2">
                  {["#F87171","#FB923C","#4ADE80","#38BDF8","#A78BFA"].map((c) => (
                    <div key={c} className="h-2 w-12 rounded-full" style={{ background: c }} />
                  ))}
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  {session ? (
                    <Link href="/mi-cuenta/puntos" className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-black text-[#6B21A8] shadow-xl hover:opacity-90">
                      Ver mi bono →
                    </Link>
                  ) : (
                    <>
                      <Link href="/registro" className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-black text-[#6B21A8] shadow-xl hover:opacity-90">
                        Únete gratis →
                      </Link>
                      <Link href="#categorias" className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white" style={{ border: "2px solid rgba(255,255,255,0.4)" }}>
                        Ver categorías
                      </Link>
                    </>
                  )}
                </div>
              </FadeIn>
            </div>
          </div>
        </div>

        {/* Floating card — right */}
        <div className="absolute bottom-8 right-8 hidden max-w-[200px] rounded-2xl bg-[#5B1FA8]/80 p-5 text-white backdrop-blur-md lg:block">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
            <span className="text-lg">⭐</span>
          </div>
          <p className="text-sm font-bold leading-snug">Cada compra te acerca a más beneficios</p>
          <p className="mt-2 text-xs text-white/70">¡Sigue participando y acumulando puntos!</p>
        </div>
      </section>

      {/* ─── ESTADO USUARIO ─── */}
      {session && kData && (
        <section className="bg-[#F5F0FF] px-6 py-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Compra acumulada este mes</p>
                <p className="mt-1 text-3xl font-black text-[#6B21A8]">{fmt(kData.monthlySpend)}</p>
                <p className="mt-1 text-xs text-[#999]">
                  {kData.currentTier === "NONE"
                    ? `Necesitas ${fmt(2_000_000 - kData.monthlySpend)} más para Silver`
                    : `Categoría este mes: ${kData.currentTier}`}
                </p>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-sm" style={{ borderLeft: `4px solid ${userTierData?.color ?? "#ddd"}` }}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Tu categoría este mes</p>
                <p className="mt-1 text-3xl font-black" style={{ color: userTierData?.color ?? "#888" }}>
                  {kData.currentTier === "NONE" ? "Sin categoría" : kData.currentTier}
                </p>
                <p className="mt-1 text-xs text-[#999]">
                  {userTierData ? `Bono: ${userTierData.bonusPercent}% en producto KLINIU®` : "Compra desde $2.000.000 para ganar bono"}
                </p>
              </div>
              <div className="rounded-2xl bg-[#6B21A8] p-5 text-white shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Bono recompra disponible</p>
                <p className="mt-1 text-3xl font-black">{kData.bonusBalance > 0 ? fmt(kData.bonusBalance) : "$0"}</p>
                <p className="mt-1 text-xs text-white/70">
                  {kData.bonusBalance > 0 && kData.bonusExpiry
                    ? `Vence ${new Date(kData.bonusExpiry).toLocaleDateString("es-CO", { day: "numeric", month: "long" })}`
                    : "Se asigna al cierre de cada mes"}
                </p>
                {kData.bonusBalance > 0 && (
                  <Link href="/mi-cuenta/puntos" className="mt-3 inline-block rounded-full bg-white px-4 py-1.5 text-xs font-bold text-[#6B21A8] hover:opacity-90">
                    Redimir →
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── CATEGORÍAS ─── */}
      <section id="categorias" className="bg-[#F5F0FF] px-6 py-16">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-2 flex items-center justify-center gap-3">
            <span className="text-[#A78BFA]">✦</span>
            <h2 className="text-center text-3xl font-black text-[#1A1A1A]">Categorías y beneficios</h2>
            <span className="text-[#A78BFA]">✦</span>
          </div>
          <p className="mt-2 text-center text-sm text-[#666]">Tu categoría depende del total de compra acumulada en el mes.</p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TIERS_K.map((tier, idx) => {
              const isUserTier = kData?.currentTier === tier.key;
              const cfg = TIER_CONFIG[tier.key as keyof typeof TIER_CONFIG];

              return (
                <FadeIn key={tier.key} delay={idx * 100} direction="up">
                <div
                  className="group overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-2"
                  style={{
                    background: "#fff",
                    boxShadow: cfg?.shadow,
                    border: `2px solid ${isUserTier ? cfg?.ring : "rgba(0,0,0,0.06)"}`,
                  }}
                >
                  {/* Foca con fondo degradado */}
                  <div className="relative flex h-56 items-end justify-center overflow-hidden px-4 pb-0" style={{ background: cfg?.gradientStyle }}>
                    {/* Brillo decorativo */}
                    <div className="absolute right-4 top-4 h-20 w-20 rounded-full opacity-20" style={{ background: "white", filter: "blur(20px)" }} />
                    <Image
                      src={FOCA_IMAGES[idx]}
                      alt={`Foca ${tier.label}`}
                      width={170}
                      height={185}
                      className="relative z-10 object-contain object-bottom drop-shadow-lg"
                    />
                    {isUserTier && (
                      <span className="absolute left-3 top-3 rounded-full px-3 py-1 text-[9px] font-black text-white" style={{ background: "rgba(0,0,0,0.35)" }}>
                        ★ Tu nivel
                      </span>
                    )}
                  </div>

                  {/* Badge + nombre */}
                  <div className="flex items-center justify-center gap-2 py-3.5" style={{ background: cfg?.gradientStyle }}>
                    <span className="text-xl drop-shadow">
                      {idx === 0 ? "🥈" : idx === 1 ? "🥇" : idx === 2 ? "⭐" : "💎"}
                    </span>
                    <p className="text-base font-black uppercase tracking-widest text-white drop-shadow">{tier.label}</p>
                  </div>

                  {/* Info */}
                  <div className="px-5 py-6 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#999]">Compra mensual</p>
                    <p className="mt-1 text-sm font-black text-[#1A1A1A]">
                      {tier.max === Infinity ? `${fmt(tier.min)} o más` : `${fmt(tier.min)} – ${fmt(tier.max)}`}
                    </p>

                    <div className="my-4 flex flex-col items-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#aaa]">Bono recompra</p>
                      <p className="mt-1 font-black leading-none" style={{ fontSize: "clamp(2.8rem,6vw,3.8rem)", color: cfg?.label }}>
                        {tier.bonusPercent}%
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[#aaa]">en producto KLINIU®</p>
                    </div>

                    <div className="rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: cfg?.gradientStyle, color: "#fff" }}>
                      Redimible el mes siguiente
                    </div>
                  </div>
                </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── CÓMO FUNCIONA + REDIME ─── */}
      <section className="relative overflow-hidden px-6 py-20" style={{ background: "#F5F0FF" }}>
        {/* Decoración de fondo */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full opacity-30" style={{ background: "radial-gradient(circle, #C084FC, transparent 70%)" }} />
          <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #7C3AED, transparent 70%)" }} />
        </div>

        <div className="relative mx-auto max-w-[1200px]">
          {/* Encabezado centrado */}
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold uppercase tracking-widest text-[#7C3AED]" style={{ background: "rgba(124,58,237,0.10)" }}>
              ✦ Así funciona el programa
            </div>
            <h2 className="mt-4 text-4xl font-black text-[#1A1A1A]">Todo lo que necesitas saber</h2>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">

            {/* Left: ¿Cómo funciona? */}
            <FadeIn delay={0} direction="left">
            <div className="overflow-hidden rounded-3xl bg-white shadow-lg" style={{ boxShadow: "0 8px 40px rgba(124,58,237,0.12)" }}>
              {/* Header de la tarjeta */}
              <div className="px-7 py-5" style={{ background: "linear-gradient(135deg, #7C3AED, #A855F7)" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Reglas del programa</p>
                <h3 className="mt-1 text-xl font-black text-white">¿Cómo funciona el plan?</h3>
              </div>

              <div className="relative px-6 py-6">
                {/* Línea vertical conectora */}
                <div className="absolute left-[46px] top-8 bottom-8 w-[2px]" style={{ background: "linear-gradient(to bottom, #7C3AED, #C084FC)" }} />

                <div className="space-y-5">
                  {[...CONDITIONS_LEFT, ...CONDITIONS_RIGHT].map((c) => (
                    <div key={c.num} className="relative flex gap-4">
                      <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black text-white shadow-md" style={{ background: "linear-gradient(135deg, #7C3AED, #A855F7)" }}>
                        {c.num}
                      </div>
                      <div className="flex-1 rounded-2xl bg-white p-4" style={{ boxShadow: "0 2px 12px rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.10)" }}>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{c.icon}</span>
                          <h4 className="text-sm font-black text-[#1A1A1A]">{c.title}</h4>
                        </div>
                        <ul className="mt-2 space-y-1">
                          {c.items.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-[#666]">
                              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ background: "#A78BFA" }} />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            </FadeIn>

            {/* Right: Redime tu bono */}
            <FadeIn delay={150} direction="right">
            <div className="flex flex-col gap-6">

              {/* Timeline card */}
              <div className="overflow-hidden rounded-3xl bg-white shadow-lg" style={{ boxShadow: "0 8px 40px rgba(124,58,237,0.12)" }}>
                <div className="px-7 py-5" style={{ background: "linear-gradient(135deg, #7C3AED, #A855F7)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Proceso de redención</p>
                  <h3 className="mt-1 text-xl font-black text-white">Redime tu bono recompra</h3>
                </div>

                <div className="px-7 py-6">
                  {/* Timeline visual */}
                  <div className="relative flex items-start justify-between gap-2">
                    {/* Línea de fondo */}
                    <div className="absolute left-[36px] right-[36px] top-[28px] h-[3px] rounded-full" style={{ background: "linear-gradient(to right, #7C3AED, #A855F7, #7C3AED)" }} />

                    {[
                      { emoji: "🗓", label: "Mes 1", sub: "Acumulas compras", active: false },
                      { emoji: "🎁", label: "Cierre", sub: "Obtienes tu bono", active: true },
                      { emoji: "✅", label: "Mes 2", sub: "Redimes tu bono", active: false },
                    ].map((item) => (
                      <div key={item.label} className="relative z-10 flex flex-col items-center text-center">
                        <div
                          className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shadow-md"
                          style={{ background: item.active ? "linear-gradient(135deg, #7C3AED, #A855F7)" : "#EDE9FE" }}
                        >
                          {item.emoji}
                        </div>
                        <p className="mt-2.5 text-sm font-black" style={{ color: item.active ? "#7C3AED" : "#1A1A1A" }}>{item.label}</p>
                        <p className="mt-0.5 text-[11px] leading-tight text-[#888]">{item.sub}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Checklist */}
              <div className="overflow-hidden rounded-3xl bg-white shadow-lg" style={{ boxShadow: "0 8px 40px rgba(124,58,237,0.12)" }}>
                <div className="divide-y divide-[#F0EBFF]">
                  {REDEEM_CHECKS.map((item, i) => (
                    <div key={i} className="flex items-start gap-4 px-6 py-4">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white" style={{ background: "#7C3AED" }}>
                        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M4 10l4 4 8-8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <p className="text-sm leading-relaxed text-[#444]">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tip card */}
              <div className="flex items-center gap-4 rounded-3xl p-6 text-white" style={{ background: "linear-gradient(135deg, #5B1FA8, #8B3FD8)" }}>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl" style={{ background: "rgba(255,255,255,0.15)" }}>💡</div>
                <p className="text-sm leading-relaxed">
                  Entre más acumules cada mes, más alta tu categoría y mejor tu beneficio.{" "}
                  <span className="font-black">¡Crece con Puntos K!</span>
                </p>
              </div>
            </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ─── CTA / FOOTER BAR ─── */}
      <section className="px-6 py-8" style={{ background: "#1A0A3A" }}>
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white">
              <span className="text-xl font-black" style={{ color: "#6B21A8" }}>K</span>
            </div>
            <div>
              <p className="font-black text-white">KLINIU®</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Dispensing and cleaning smart</p>
            </div>
          </div>
          <div className="text-center">
            <p className="font-bold text-white">Gracias por tu confianza. Sigamos creciendo juntos.</p>
            <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Para más información consulta los términos y condiciones en kliniu.com</p>
          </div>
          {!session && (
            <Link href="/registro" className="rounded-full px-6 py-2.5 text-sm font-bold text-white" style={{ background: "#7C3AED" }}>
              Únete gratis →
            </Link>
          )}
          {session && (
            <Link href="/mi-cuenta/puntos" className="rounded-full px-6 py-2.5 text-sm font-bold text-white" style={{ background: "#7C3AED" }}>
              Ver mi bono →
            </Link>
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
