import type { Metadata } from "next";
import { getProducts } from "@/lib/products";
import ProductoDetalleClient from "./producto-detalle-client";

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

  return {
    title: producto.nombre,
    description: producto.descripcion,
    openGraph: {
      title: producto.nombre,
      description: producto.descripcion,
      images: producto.imagen ? [{ url: producto.imagen }] : undefined,
    },
  };
}

export default function ProductoDetallePage() {
  return <ProductoDetalleClient />;
}
