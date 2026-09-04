import Image from "next/image";
import Link from "next/link";
import { getActiveCombos } from "@/lib/combos";
import { getBannerByKey } from "@/lib/banners";
import SiteFooter from "../components/site-footer";
import ComboCard from "../components/combo-card";
import { getComboItemNormalPrice } from "@/lib/volume-discounts";
import { formatearMoneda } from "../data/catalog";

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
                <ComboCard
                  key={combo.id}
                  combo={{
                    id: combo.id,
                    nombre: combo.name,
                    imagen: combo.image ?? "/combo-productos-kliniu.png",
                    items: combo.items.map((i) => `${i.quantity}× ${i.product.name}`),
                    precio: formatearMoneda(combo.price),
                    precioNumero: combo.price,
                    precioNormal: combo.items.reduce((sum, i) => sum + getComboItemNormalPrice(i.product, i.quantity), 0),
                    sku: combo.sku,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
