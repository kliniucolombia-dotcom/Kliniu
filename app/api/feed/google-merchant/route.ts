import { getProducts, type StoreProduct } from "@/lib/products";
import { SITE_URL } from "@/lib/site";

export const revalidate = 600;

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function absoluteUrl(path: string) {
  const value = (path || "").trim();
  if (!value) return undefined;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `${SITE_URL}${value.startsWith("/") ? value : `/${value}`}`;
}

function availabilityValue(producto: StoreProduct) {
  if (producto.estadoInventario === "out-of-stock" || producto.disponibilidad === "Agotado") {
    return "backorder";
  }
  return "in_stock";
}

function renderItem(producto: StoreProduct) {
  const link = `${SITE_URL}/producto/${producto.slug}`;
  const imageLink = absoluteUrl(producto.imagen);
  const extraImages = (producto.imagenesExtra ?? [])
    .map(absoluteUrl)
    .filter((image): image is string => Boolean(image));
  const mpn = producto.oemReferencia || producto.sku || producto.slug;
  const identifierExists = producto.sku || producto.oemReferencia ? "yes" : "no";
  const description = (producto.descripcion || producto.nombre).slice(0, 5000);

  const lines = [
    `    <g:id>${escapeXml(producto.sku || producto.slug)}</g:id>`,
    `    <g:title>${escapeXml(producto.nombre.slice(0, 150))}</g:title>`,
    `    <g:description>${escapeXml(description)}</g:description>`,
    `    <g:link>${escapeXml(link)}</g:link>`,
    imageLink ? `    <g:image_link>${escapeXml(imageLink)}</g:image_link>` : "",
    ...extraImages.map((image) => `    <g:additional_image_link>${escapeXml(image)}</g:additional_image_link>`),
    `    <g:availability>${availabilityValue(producto)}</g:availability>`,
    `    <g:price>${producto.precioValor.toFixed(2)} COP</g:price>`,
    `    <g:condition>new</g:condition>`,
    `    <g:brand>${escapeXml(producto.marca)}</g:brand>`,
    `    <g:mpn>${escapeXml(mpn)}</g:mpn>`,
    `    <g:identifier_exists>${identifierExists}</g:identifier_exists>`,
    `    <g:product_type>${escapeXml(producto.categoria)}</g:product_type>`,
  ].filter(Boolean);

  return `  <item>\n${lines.join("\n")}\n  </item>`;
}

export async function GET() {
  const products = await getProducts();
  const items = products
    .filter((producto) => producto.precioValor > 0)
    .map(renderItem)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>Kliniu — Catálogo</title>
  <link>${SITE_URL}</link>
  <description>Catálogo de dispensadores e insumos de higiene de Kliniu</description>
${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=600",
    },
  });
}
