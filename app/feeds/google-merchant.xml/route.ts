import { getDefaultOffer, getProducts } from "@/lib/products";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

const PLACEHOLDER_IMAGE = "/product-placeholder.png";

function xml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function absoluteUrl(path: string) {
  return /^https?:\/\//.test(path) ? path : `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

const cop = (value: number) => `${Math.round(value)} COP`;

/**
 * Feed de Google Merchant Center. Un item por producto con el precio y stock que la ficha
 * muestra al cargar (getDefaultOffer), porque los colores no tienen URL propia y Google
 * rechaza el item si el precio del feed no coincide con el de la página de destino.
 */
export async function GET() {
  const products = await getProducts();

  const items = products.flatMap((producto) => {
    const offer = getDefaultOffer(producto);
    // Sin precio o sin foto real Merchant lo rechaza; se omite hasta que se complete la ficha.
    if (offer.price <= 0 || !producto.imagen || producto.imagen === PLACEHOLDER_IMAGE) return [];

    const link = `${SITE_URL}/producto/${producto.slug}`;
    const extra = (producto.imagenesExtra ?? []).slice(0, 10);
    const lines = [
      `<g:id>${xml(producto.sku ?? producto.slug)}</g:id>`,
      `<title>${xml(offer.pack ? `${producto.nombre} (${offer.pack.label})` : producto.nombre).slice(0, 150)}</title>`,
      `<description>${xml(producto.descripcion).slice(0, 5000)}</description>`,
      `<link>${xml(link)}</link>`,
      `<g:image_link>${xml(absoluteUrl(producto.imagen))}</g:image_link>`,
      ...extra.map((image) => `<g:additional_image_link>${xml(absoluteUrl(image))}</g:additional_image_link>`),
      `<g:availability>${offer.inStock ? "in_stock" : "out_of_stock"}</g:availability>`,
      `<g:price>${cop(offer.previousPrice ?? offer.price)}</g:price>`,
      ...(offer.previousPrice ? [`<g:sale_price>${cop(offer.price)}</g:sale_price>`] : []),
      ...(offer.pack ? [`<g:multipack>${offer.pack.qty}</g:multipack>`] : []),
      `<g:condition>new</g:condition>`,
      `<g:brand>${xml(producto.marca)}</g:brand>`,
      ...(producto.sku ? [`<g:mpn>${xml(producto.sku)}</g:mpn>`] : [`<g:identifier_exists>no</g:identifier_exists>`]),
      `<g:product_type>${xml(producto.categoria)}</g:product_type>`,
    ];
    return [`<item>\n${lines.join("\n")}\n</item>`];
  });

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>Kliniu Colombia</title>
<link>${SITE_URL}</link>
<description>Dispensadores e insumos de higiene para negocios en Colombia.</description>
${items.join("\n")}
</channel>
</rss>`;

  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
