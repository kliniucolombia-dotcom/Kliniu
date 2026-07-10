import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pedidos — Panel Comercial",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
