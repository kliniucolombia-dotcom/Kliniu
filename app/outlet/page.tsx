import { getBannersByKeys } from "@/lib/banners";
import { getProducts } from "@/lib/products";
import OutletClient from "./outlet-client";

// El contador de 15 días se compara contra la hora actual, así que esta página
// no puede servirse cacheada: leemos los productos aquí en vez de tomarlos del
// provider global (que vive en el layout y sí se cachea).
export const dynamic = "force-dynamic";

export default async function OutletPage() {
  const banners = await getBannersByKeys(["outlet_hero", "outlet_super_ofertas"]);
  const products = await getProducts();
  const hero = banners.get("outlet_hero");
  const superOfertas = banners.get("outlet_super_ofertas");

  return (
    <OutletClient
      products={products}
      heroDesktop={hero?.desktopImage ?? "/banner-outlet.jpg"}
      heroMobile={hero?.mobileImage ?? "/banners-responsive/oulet%20movil.jpg"}
      superOfertas={superOfertas?.desktopImage ?? "/outlet/banner-super-ofertas.jpg"}
    />
  );
}
