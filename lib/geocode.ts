// Geocoding API con la key de servidor. Devuelve null si Google no encuentra la dirección.
export async function geocodeAddress(parts: { address: string; city: string; department?: string }) {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) return null;
  const q = [parts.address, parts.city, parts.department, "Colombia"].filter(Boolean).join(", ");
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&region=co&components=country:CO&key=${key}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const json = (await res.json()) as { results?: { types: string[]; geometry: { location: { lat: number; lng: number } } }[] };
  // Descarta lugares comerciales/zonas a los que Google "adivina" cuando la dirección no existe.
  const ADDRESS_TYPES = ["street_address", "premise", "subpremise", "route"];
  const hit = json.results?.find((r) => r.types.some((t) => ADDRESS_TYPES.includes(t)));
  return hit ? { lat: hit.geometry.location.lat, lng: hit.geometry.location.lng } : null;
}
