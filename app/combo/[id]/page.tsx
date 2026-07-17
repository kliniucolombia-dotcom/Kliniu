import { notFound } from "next/navigation";
import { getComboById } from "@/lib/combos";
import { formatearMoneda } from "@/app/data/catalog";
import ComboDetailClient from "./combo-detail-client";

export default async function ComboPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const combo = await getComboById(id);
  if (!combo || !combo.active) notFound();

  const productos = combo.items.map((item) => ({
    nombre: item.product.name,
    cantidad: item.quantity,
    precio: formatearMoneda(item.product.price),
    imagen: item.product.image || "/product-placeholder.png",
    galeria: (item.product.galleryImages || []).filter(Boolean),
  }));

  const galleryImages = Array.from(
    new Set(
      [
        combo.image,
        ...(combo.galleryImages || []),
        ...productos.flatMap((p) => [p.imagen, ...p.galeria]),
      ].filter((src): src is string => Boolean(src))
    )
  );

  return (
    <ComboDetailClient
      combo={{
        id: combo.id,
        sku: combo.sku,
        nombre: combo.name,
        precio: formatearMoneda(combo.price),
        imagenPrincipal: combo.image ?? "/combo-productos-kliniu.png",
      }}
      productos={productos}
      galleryImages={galleryImages.length > 0 ? galleryImages : ["/combo-productos-kliniu.png"]}
    />
  );
}
