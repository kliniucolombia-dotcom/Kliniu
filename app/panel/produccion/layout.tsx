import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Producción — Panel Comercial",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
