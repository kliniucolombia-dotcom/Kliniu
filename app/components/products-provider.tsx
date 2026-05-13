"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import {
  type Categoria,
  type Disponibilidad,
  type ProductoEspecificacion,
} from "../data/catalog";
import type { StoreProduct } from "@/lib/products";

export type AdminProductInput = {
  sku?: string;
  oemReferencia?: string;
  referenciasAlternas?: string[];
  categoria: Categoria;
  nombre: string;
  marca: string;
  precioValor: number;
  precioAnteriorValor: number;
  stock: number;
  stockMinimo: number;
  imagen: string;
  imagenesExtra?: string[];
  disponibilidad: Disponibilidad;
  descripcion?: string;
  aplicacion?: string;
  compatibilidad?: string[];
  garantia?: string;
  especificacionesTecnicas?: ProductoEspecificacion[];
};

type ProductsContextValue = {
  products: StoreProduct[];
  adminProducts: StoreProduct[];
  createProduct: (
    input: AdminProductInput,
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
  updateProduct: (
    slug: string,
    input: AdminProductInput,
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
  removeProduct: (
    slug: string,
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
  adjustInventory: (
    slug: string,
    quantity: number,
    note?: string,
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
};

const ProductsContext = createContext<ProductsContextValue | null>(null);
export function ProductsProvider({
  children,
  initialProducts,
}: {
  children: ReactNode;
  initialProducts: StoreProduct[];
}) {
  const [products, setProducts] = useState<StoreProduct[]>(initialProducts);

  const value: ProductsContextValue = {
    products,
    adminProducts: products,
    createProduct: async (input) => {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      const payload = (await response.json()) as {
        error?: string;
        details?: string;
        product?: StoreProduct;
      };

      if (!response.ok || !payload.product) {
        return {
          ok: false,
          message:
            payload.details && payload.error
              ? `${payload.error} ${payload.details}`
              : payload.error || "No fue posible guardar el producto.",
        };
      }

      setProducts((current) => [payload.product!, ...current]);

      return { ok: true };
    },
    updateProduct: async (slug, input) => {
      const response = await fetch(`/api/products/${slug}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      const payload = (await response.json()) as {
        error?: string;
        details?: string;
        product?: StoreProduct;
      };

      if (!response.ok || !payload.product) {
        return {
          ok: false,
          message:
            payload.details && payload.error
              ? `${payload.error} ${payload.details}`
              : payload.error || "No fue posible actualizar el producto.",
        };
      }

      setProducts((current) =>
        current.map((product) =>
          product.slug === slug ? payload.product! : product,
        ),
      );

      return { ok: true };
    },
    removeProduct: async (slug) => {
      const response = await fetch(`/api/products/${slug}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        return {
          ok: false,
          message: payload.error || "No fue posible eliminar el producto.",
        };
      }

      setProducts((current) => current.filter((product) => product.slug !== slug));

      return { ok: true };
    },
    adjustInventory: async (slug, quantity, note) => {
      const response = await fetch(`/api/inventory/${slug}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quantity, note }),
      });

      const payload = (await response.json()) as {
        error?: string;
        product?: StoreProduct;
      };

      if (!response.ok || !payload.product) {
        return {
          ok: false,
          message: payload.error || "No fue posible ajustar el inventario.",
        };
      }

      setProducts((current) =>
        current.map((product) =>
          product.slug === slug ? payload.product! : product,
        ),
      );

      return { ok: true };
    },
  };

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error("useProducts must be used within ProductsProvider");
  }

  return context;
}
