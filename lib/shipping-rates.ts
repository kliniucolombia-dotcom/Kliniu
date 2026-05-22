export type ShippingZone = "bogota" | "principal" | "nacional" | "remoto";

export const SHIPPING_RATES: Record<ShippingZone, { label: string; price: number }> = {
  bogota:    { label: "Bogotá D.C.",           price: 0 },
  principal: { label: "Ciudad principal",       price: 12000 },
  nacional:  { label: "Nacional",               price: 18000 },
  remoto:    { label: "Zona remota",            price: 25000 },
};

const ZONE_BY_DEPARTMENT: Record<string, ShippingZone> = {
  "Bogotá D.C.":           "bogota",
  "Cundinamarca":          "principal",
  "Antioquia":             "principal",
  "Valle del Cauca":       "principal",
  "Atlántico":             "principal",
  "Bolívar":               "principal",
  "Santander":             "principal",
  "Córdoba":               "nacional",
  "Nariño":                "nacional",
  "Tolima":                "nacional",
  "Boyacá":                "nacional",
  "Cauca":                 "nacional",
  "Norte de Santander":    "nacional",
  "Huila":                 "nacional",
  "Magdalena":             "nacional",
  "Cesar":                 "nacional",
  "Meta":                  "nacional",
  "Risaralda":             "nacional",
  "Sucre":                 "nacional",
  "Quindío":               "nacional",
  "Caldas":                "nacional",
  "La Guajira":            "nacional",
  "Chocó":                 "remoto",
  "Arauca":                "remoto",
  "Casanare":              "remoto",
  "Putumayo":              "remoto",
  "Caquetá":               "remoto",
  "Guaviare":              "remoto",
  "Amazonas":              "remoto",
  "Vaupés":                "remoto",
  "Guainía":               "remoto",
  "Vichada":               "remoto",
  "San Andrés y Providencia": "remoto",
};

export function getShippingForDepartment(department: string): { zone: ShippingZone; label: string; price: number } {
  const zone = ZONE_BY_DEPARTMENT[department] ?? "nacional";
  return { zone, ...SHIPPING_RATES[zone] };
}

export function formatShippingPrice(price: number): string {
  return price === 0 ? "Gratis 🎉" : "$ " + price.toLocaleString("es-CO");
}
