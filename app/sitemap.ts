import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getProducts } from "@/lib/products";
import { categoriasData, slugCategoria } from "./data/catalog";

const STATIC_PATHS = [
  "",
  "/categorias",
  "/outlet",
  "/quienes-somos",
  "/contacto",
  "/tips-y-videos",
  "/puntos",
  "/servicio-de-reparacion",
  "/politicas",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getProducts();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
  }));

  const categoryEntries: MetadataRoute.Sitemap = categoriasData.map((cat) => ({
    url: `${SITE_URL}/categorias?categoria=${slugCategoria(cat.nombre)}`,
    lastModified: new Date(),
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${SITE_URL}/producto/${product.slug}`,
    lastModified: new Date(),
  }));

  return [...staticEntries, ...categoryEntries, ...productEntries];
}
