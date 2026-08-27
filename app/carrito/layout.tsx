import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSaleMode } from "@/lib/sale-mode";

export const metadata: Metadata = {
  title: "Carrito de compras",
};

export default async function CarritoLayout({ children }: { children: React.ReactNode }) {
  const mode = await getSaleMode();
  if (mode === "whatsapp") redirect("/");
  return children;
}
