import sharp from "sharp";

export const runtime = "nodejs";

function isAllowedHost(host: string) {
  if (host === "kliniucolombia.com" || host === "www.kliniucolombia.com") return true;
  if (host.endsWith(".supabase.co")) return true;
  try {
    const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
      : null;
    if (supabaseHost && host === supabaseHost) return true;
  } catch {
    // ignore
  }
  return false;
}

/**
 * Convierte imágenes (webp/avif) a PNG para WATI, que no acepta esos formatos.
 * Solo permite hosts de confianza para evitar SSRF.
 */
export async function GET(request: Request) {
  const target = new URL(request.url).searchParams.get("url");
  if (!target) return new Response("Falta el parámetro url.", { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new Response("URL inválida.", { status: 400 });
  }
  if (parsed.protocol !== "https:" || !isAllowedHost(parsed.host)) {
    return new Response("Host no permitido.", { status: 400 });
  }

  const upstream = await fetch(parsed, { cache: "no-store" });
  if (!upstream.ok) {
    return new Response("No se pudo obtener la imagen.", { status: 502 });
  }

  try {
    const input = Buffer.from(await upstream.arrayBuffer());
    const png = await sharp(input).png({ compressionLevel: 9 }).toBuffer();
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
      },
    });
  } catch {
    return new Response("No se pudo convertir la imagen.", { status: 500 });
  }
}
