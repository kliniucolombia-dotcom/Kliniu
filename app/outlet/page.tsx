import { getBannersByKeys } from "@/lib/banners";
import OutletClient from "./outlet-client";

export default async function OutletPage() {
  const banners = await getBannersByKeys(["outlet_hero", "outlet_super_ofertas"]);
  const hero = banners.get("outlet_hero");
  const superOfertas = banners.get("outlet_super_ofertas");

  return (
    <OutletClient
      heroDesktop={hero?.desktopImage ?? "/banner-outlet.jpg"}
      heroMobile={hero?.mobileImage ?? "/banners-responsive/oulet%20movil.jpg"}
      superOfertas={superOfertas?.desktopImage ?? "/outlet/banner-super-ofertas.jpg"}
    />
  );
}
