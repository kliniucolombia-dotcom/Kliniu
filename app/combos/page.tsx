import Image from "next/image";
import Link from "next/link";
import { getActiveCombos } from "@/lib/combos";
import { getBannerByKey } from "@/lib/banners";
import { formatearMoneda } from "../data/catalog";
import SiteFooter from "../components/site-footer";

export const metadata = { title: "Combos" };

export const dynamic = "force-dynamic";

export default async function CombosPage() {
  const combosDb = await getActiveCombos();
  const banner = await getBannerByKey("combos_hero");
  const heroDesktop = banner?.desktopImage ?? null;
  const heroMobile = banner?.mobileImage ?? null;

  return (
    <>
      <main className="min-h-screen bg-white pt-16 text-[#111]">
        {/* Hero banner — se configura en /panel/banners */}
        {heroDesktop && (
          <section className="home-reveal relative overflow-hidden bg-white">
            <Image
              src={heroDesktop}
              alt="Combos Kliniu"
              width={1920}
              height={420}
              priority
              className={`h-auto w-full object-cover ${heroMobile ? "hidden md:block" : ""}`}
            />
            {heroMobile && (
              <Image
                src={heroMobile}
                alt="Combos Kliniu"
                width={900}
                height={700}
                priority
                className="h-auto w-full object-cover md:hidden"
              />
            )}
          </section>
        )}

        <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#27B1B8]">Ahorra combinando</p>
          <h1 className="mt-1 text-3xl font-black text-[#0C535B] sm:text-4xl">Combos</h1>
          <p className="mt-2 max-w-xl text-sm text-[#555]">
            Soluciones armadas para tus espacios, a un mejor precio que comprando por separado.
          </p>

          {combosDb.length === 0 ? (
            <p className="mt-10 text-sm text-[#8b8d91]">Sin combos disponibles por ahora.</p>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {combosDb.map((combo) => (
                <Link
                  key={combo.id}
                  href={`/combo/${combo.id}`}
                  className="interactive-lift overflow-hidden rounded-2xl border border-black/8 bg-white"
                >
                  <div className="flex h-36 items-center justify-center bg-[#f8f8f7] p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={combo.image ?? "/combo-productos-kliniu.png"}
                      alt={combo.name}
                      className="image-lift h-full w-full object-contain"
                    />
                  </div>
                  <div className="flex flex-col gap-1 p-4">
                    <p className="font-semibold text-[#111]">{combo.name}</p>
                    <p className="mt-1 text-base font-bold" style={{ color: "#0C535B" }}>
                      {formatearMoneda(combo.price)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
