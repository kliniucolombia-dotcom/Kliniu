import { notFound } from "next/navigation";
import { getComboById } from "@/lib/combos";
import { formatearMoneda } from "@/app/data/catalog";
import ComboDetailClient from "./combo-detail-client";
import { getComboItemNormalPrice } from "@/lib/volume-discounts";

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
      // Solo las imágenes cargadas al combo en el panel, no las de sus productos
      [combo.image, ...(combo.galleryImages || [])].filter((src): src is string => Boolean(src))
    )
  );

  return (
    <ComboDetailClient
      combo={{
        id: combo.id,
        sku: combo.sku,
        nombre: combo.name,
        precio: formatearMoneda(combo.price),
        precioNumero: combo.price,
        precioNormal: combo.items.reduce((sum, i) => sum + getComboItemNormalPrice(i.product, i.quantity), 0),
        imagenPrincipal: combo.image ?? "/combo-productos-kliniu.png",
      }}
      productos={productos}
      galleryImages={galleryImages.length > 0 ? galleryImages : ["/combo-productos-kliniu.png"]}
    />
  );
}
