export type ShippingZone = "bogota" | "nacional";

export const SHIPPING_RATES: Record<ShippingZone, { label: string; price: number }> = {
  bogota:    { label: "Bogotá D.C.", price: 0 },
  nacional:  { label: "Resto del país", price: 12000 },
};

export function getShippingForLocation(department: string, city: string): { zone: ShippingZone; label: string; price: number } {
  const zone: ShippingZone = department === "Cundinamarca" && city === "Bogotá" ? "bogota" : "nacional";
  return { zone, ...SHIPPING_RATES[zone] };
}

export function formatShippingPrice(price: number): string {
  return price === 0 ? "Gratis 🎉" : "$ " + price.toLocaleString("es-CO");
}
