import Image from "next/image";
import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth";
import { TIERS_K, getUserKData, getKTierData } from "@/lib/points";
import SiteFooter from "@/app/components/site-footer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Puntos K — Programa de Fidelización Kliniu" };

const fmt = (n: number) =>
  n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

const TIER_COLORS = {
  NONE:     { bg: "#F5F5F5",  border: "#E0E0E0",  text: "#888" },
  SILVER:   { bg: "#FDF6ED",  border: "#E8C080",  text: "#B8822A" },
  GOLD:     { bg: "#FDFAEC",  border: "#E8D870",  text: "#A89010" },
  PLATINUM: { bg: "#EAF7F5",  border: "#7BBFB0",  text: "#3D8F8F" },
  DIAMANTE: { bg: "#EEF3F8",  border: "#88AACF",  text: "#3A6D9A" },
};

const CONDITIONS = [
  {
    num: "1",
    title: "Acumulación mensual",
    items: [
      "Las compras se suman de forma acumulada dentro del mismo mes calendario.",
      "La categoría y el bono se determinan con base en el total acumulado al cierre del mes.",
    ],
  },
  {
    num: "2",
    title: "Redención del bono",
    items: [
      "El bono recompra se redime únicamente en producto KLINIU®.",
      "El valor es equivalente al porcentaje según la categoría alcanzada.",
      "Es redimible únicamente en el mes siguiente al que se acumuló.",
      "Requisito de compra mínima: para redimir, el cliente debe realizar una compra equivalente al 25% de la compra acumulada del mes anterior.",
    ],
  },
  {
    num: "3",
    title: "Vencimiento del bono",
    items: [
      "Si el bono no se redime en el mes siguiente, se pierde automáticamente y no se puede reclamar posteriormente.",
    ],
  },
  {
    num: "4",
    title: "Acumulación continua",
    items: [
      "La compra que realice en el mes de redención también cuenta para acumular y alcanzar categoría para el mes siguiente.",
    ],
  },
  {
    num: "5",
    title: "Naturaleza del programa",
    items: [
      "Este plan busca mantener una relación mensual con nuestros clientes, premiando la fidelidad y el volumen de compra.",
    ],
  },
  {
    num: "6",
    title: "Aspectos legales",
    items: [
      "El Plan K se rige por las leyes colombianas y se reserva el derecho a modificar condiciones según normatividad vigente.",
      "La participación implica la aceptación de sus términos y condiciones.",
    ],
  },
];

export default async function PuntosPage() {
  const session = await getSessionFromCookies();
  const kData = session ? await getUserKData(session.userId) : null;
  const userTierData = kData ? getKTierData(kData.currentTier) : null;

  return (
    <main className="min-h-screen bg-white text-[#1A1A1A]">

      {/* ─── HERO ─── */}
      <section className="relative w-full overflow-hidden" style={{ minHeight: 340 }}>
        <Image
          src="/puntos-hero-banner.jpg"
          alt="Puntos K Kliniu"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0C4A4A]/80 via-[#0C6060]/60 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="mx-auto w-full max-w-[1440px] px-8 lg:px-16">
            <div className="max-w-[520px] text-white">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">
                Programa de fidelización
              </p>
              <h1 className="mt-2 text-[clamp(3rem,7vw,6rem)] font-black leading-[1.0] tracking-tight">
                Puntos K
              </h1>
              {/* Barras de colores */}
              <div className="mt-3 flex gap-1.5">
                {["#B8822A","#C8A820","#4DAAAA","#5588BB","#8888AA"].map((c) => (
                  <div key={c} className="h-1 w-10 rounded-full" style={{ background: c }} />
                ))}
              </div>
              <p className="mt-4 max-w-[380px] text-sm leading-relaxed text-white/80">
                Compra todos los meses, alcanza tu categoría y recibe un bono recompra exclusivo en productos KLINIU®.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {session ? (
                  <Link
                    href="/mi-cuenta/puntos"
                    className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-[#0C6060] shadow-lg hover:opacity-90"
                  >
                    Ver mi bono →
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/registro"
                      className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-[#0C6060] shadow-lg hover:opacity-90"
                    >
                      Únete gratis →
                    </Link>
                    <Link
                      href="#categorias"
                      className="inline-flex items-center gap-2 rounded-full border border-white/40 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/10"
                    >
                      Ver categorías
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ESTADO USUARIO (si está logueado) ─── */}
      {session && kData && (
        <section className="bg-[#EAF7F5] px-6 py-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Gasto del mes */}
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Compra acumulada este mes</p>
                <p className="mt-1 text-3xl font-black text-[#0C6060]">
                  {fmt(kData.monthlySpend)}
                </p>
                <p className="mt-1 text-xs text-[#999]">
                  {kData.currentTier === "NONE"
                    ? `Necesitas ${fmt(2_000_000 - kData.monthlySpend)} más para Silver`
                    : `Categoría este mes: ${kData.currentTier}`}
                </p>
              </div>

              {/* Categoría actual */}
              <div
                className="rounded-2xl p-5 shadow-sm"
                style={{
                  background: userTierData?.colorBg ?? "#F5F5F5",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: userTierData?.colorBorder ?? "#E0E0E0",
                }}
              >
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: userTierData?.color ?? "#888" }}>
                  Tu categoría este mes
                </p>
                <p className="mt-1 text-3xl font-black" style={{ color: userTierData?.color ?? "#888" }}>
                  {kData.currentTier === "NONE" ? "Sin categoría" : kData.currentTier}
                </p>
                <p className="mt-1 text-xs text-[#999]">
                  {userTierData ? `Bono: ${userTierData.bonusPercent}% en producto KLINIU®` : "Compra desde $2.000.000 para ganar bono"}
                </p>
              </div>

              {/* Bono disponible */}
              <div className="rounded-2xl bg-[#0C6060] p-5 text-white shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Bono recompra disponible</p>
                <p className="mt-1 text-3xl font-black">
                  {kData.bonusBalance > 0 ? fmt(kData.bonusBalance) : "$0"}
                </p>
                <p className="mt-1 text-xs text-white/70">
                  {kData.bonusBalance > 0 && kData.bonusExpiry
                    ? `Vence ${new Date(kData.bonusExpiry).toLocaleDateString("es-CO", { day: "numeric", month: "long" })}`
                    : "Se asigna al cierre de cada mes"}
                </p>
                {kData.bonusBalance > 0 && (
                  <Link
                    href="/mi-cuenta/puntos"
                    className="mt-3 inline-block rounded-full bg-white px-4 py-1.5 text-xs font-bold text-[#0C6060] hover:opacity-90"
                  >
                    Redimir →
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── CÓMO FUNCIONA ─── */}
      <section className="bg-white px-6 py-14">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-2 flex items-center justify-center gap-3">
            <div className="h-px flex-1 bg-[#E0E0E0]" />
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#888]">Cómo funciona</p>
            <div className="h-px flex-1 bg-[#E0E0E0]" />
          </div>
          <h2 className="mt-2 text-center text-2xl font-black text-[#1A1A1A]">
            Compra, acumula y gana tu bono
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-4">
            {[
              { num: "01", title: "Compra en el mes",      desc: "Acumula tus compras dentro del mismo mes calendario." },
              { num: "02", title: "Alcanza tu categoría",  desc: "Silver, Gold, Platinum o Diamante según tu total mensual." },
              { num: "03", title: "Recibe tu bono",        desc: "Al cierre del mes se asigna tu bono recompra en COP." },
              { num: "04", title: "Redime el mes siguiente", desc: "Úsalo en tu próxima compra mínima del 25% del mes anterior." },
            ].map(({ num, title, desc }) => (
              <div key={num} className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF7F5] text-xl font-black text-[#0C6060]">
                  {num}
                </div>
                <p className="mt-3 text-sm font-bold text-[#1A1A1A]">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-[#888]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CATEGORÍAS ─── */}
      <section id="categorias" className="bg-[#F0F9F8] px-6 py-16">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="mb-2 text-center text-2xl font-black text-[#1A1A1A]">Puntos K</h2>
          {/* Barras decorativas */}
          <div className="mx-auto mb-8 flex w-fit gap-1.5">
            {["#B8822A","#C8A820","#4DAAAA","#5588BB","#8888AA"].map((c) => (
              <div key={c} className="h-1 w-10 rounded-full" style={{ background: c }} />
            ))}
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TIERS_K.map((tier, idx) => {
              const isUserTier = kData?.currentTier === tier.key;
              const fokaImages = [
                "/foca-ok-kliniu-original.png",
                "/foca-como-elegir-liquidos.png",
                "/foca-como-elegir-papel.png",
                "/foca-como-elegir-klinox.png",
              ];
              return (
                <div
                  key={tier.key}
                  className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)]"
                  style={isUserTier ? { outline: `3px solid ${tier.color}` } : {}}
                >
                  {/* Imagen foca */}
                  <div className="relative flex h-48 items-end justify-center bg-gradient-to-b from-[#F8F8F8] to-[#EFEFEF] px-4 pb-2">
                    <Image
                      src={fokaImages[idx]}
                      alt={`Foca ${tier.label}`}
                      width={140}
                      height={160}
                      className="object-contain object-bottom"
                    />
                    {isUserTier && (
                      <span
                        className="absolute right-3 top-3 rounded-full px-2 py-0.5 text-[9px] font-bold text-white"
                        style={{ background: tier.color }}
                      >
                        Tu nivel
                      </span>
                    )}
                  </div>

                  {/* Etiqueta de categoría */}
                  <div className="py-3 text-center" style={{ background: tier.color }}>
                    <p className="text-lg font-black uppercase tracking-wider text-white">
                      {tier.label}
                    </p>
                  </div>

                  {/* Info */}
                  <div className="px-5 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: tier.color }}>
                      Rango de compra mensual:
                    </p>
                    <p className="mt-1 text-lg font-black text-[#1A1A1A]">
                      {tier.max === Infinity
                        ? `${fmt(tier.min)} o más`
                        : `${fmt(tier.min)} – ${fmt(tier.max)}`}
                    </p>
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: tier.color }}>
                      Beneficio:
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-[#444]">
                      {tier.bonusPercent}% en bono recompra<br />
                      <span className="text-xs font-normal text-[#999]">(redimible en producto)</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-8 text-center text-xs text-[#888]">
            Ejemplo: Si en agosto acumuló $6.000.000 (Platinum), en septiembre recibe un bono de $360.000 en producto KLINIU®.
          </p>
        </div>
      </section>

      {/* ─── CONDICIONES ─── */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-[1000px]">
          <h2 className="mb-2 text-center text-2xl font-black text-[#1A1A1A]">Condiciones del Plan</h2>
          {/* Barras */}
          <div className="mx-auto mb-10 flex w-fit gap-1.5">
            {["#B8822A","#C8A820","#4DAAAA","#5588BB","#8888AA"].map((c) => (
              <div key={c} className="h-1 w-10 rounded-full" style={{ background: c }} />
            ))}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {CONDITIONS.map((c) => (
              <div key={c.num} className="rounded-2xl border border-[#E8E8E8] p-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0C6060] text-sm font-black text-white">
                    {c.num}
                  </div>
                  <h3 className="text-sm font-black text-[#1A1A1A]">{c.title}</h3>
                </div>
                <ul className="space-y-1.5">
                  {c.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-[#555]">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0C6060]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA FINAL ─── */}
      {!session && (
        <section className="bg-gradient-to-br from-[#0C4A4A] to-[#27B1B8] px-6 py-16 text-white">
          <div className="mx-auto max-w-[700px] text-center">
            <h2 className="text-3xl font-black">¡Empieza a acumular este mes!</h2>
            <p className="mt-3 text-sm text-white/80">
              Crea tu cuenta, compra desde $2.000.000 y comienza a ganar bonos recompra con Puntos K.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href="/registro"
                className="rounded-full bg-white px-8 py-3 text-sm font-bold text-[#0C6060] shadow-lg hover:opacity-90"
              >
                Crear cuenta gratis
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-white/40 px-8 py-3 text-sm font-bold text-white hover:bg-white/10"
              >
                Ya tengo cuenta
              </Link>
            </div>
          </div>
        </section>
      )}

      <SiteFooter />
    </main>
  );
}
