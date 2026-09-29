import type { Metadata } from "next";
import { headers } from "next/headers";
import { getProducts, type StoreProduct } from "@/lib/products";
import { SITE_URL } from "@/lib/site";
import ProductoDetalleClient from "./producto-detalle-client";

function absoluteUrl(path: string) {
  const value = (path || "").trim();
  if (!value) return undefined;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `${SITE_URL}${value.startsWith("/") ? value : `/${value}`}`;
}

function productAvailability(producto: StoreProduct) {
  if (producto.estadoInventario === "out-of-stock" || producto.disponibilidad === "Agotado") {
    return "https://schema.org/BackOrder";
  }
  return "https://schema.org/InStock";
}

function buildProductJsonLd(producto: StoreProduct) {
  const url = `${SITE_URL}/producto/${producto.slug}`;
  const images = [producto.imagen, ...(producto.imagenesExtra ?? [])]
    .map(absoluteUrl)
    .filter((image): image is string => Boolean(image));

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: producto.nombre,
    description: producto.descripcion,
    sku: producto.sku,
    mpn: producto.oemReferencia || producto.sku,
    category: producto.categoria,
    brand: { "@type": "Brand", name: producto.marca },
    image: images,
    url,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "COP",
      price: producto.precioValor,
      availability: productAvailability(producto),
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "Kliniu" },
    },
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const products = await getProducts();
  const producto = products.find((p) => p.slug === slug);

  if (!producto) {
    return { title: "Producto no encontrado" };
  }

  const canonical = `/producto/${producto.slug}`;
  const images = [producto.imagen, ...(producto.imagenesExtra ?? [])]
    .map(absoluteUrl)
    .filter((image): image is string => Boolean(image));

  return {
    title: producto.nombre,
    description: producto.descripcion,
    keywords: [
      producto.nombre,
      producto.marca,
      producto.categoria,
      "dispensadores Colombia",
      "higiene para negocios",
    ],
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: producto.nombre,
      description: producto.descripcion,
      url: canonical,
      images: images.length > 0 ? images.map((url) => ({ url })) : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: producto.nombre,
      description: producto.descripcion,
      images: images.length > 0 ? images : undefined,
    },
  };
}

export default async function ProductoDetallePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const products = await getProducts();
  const producto = products.find((p) => p.slug === slug);
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <>
      {producto && (
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildProductJsonLd(producto)) }}
        />
      )}
      <ProductoDetalleClient />
    </>
  );
}
