import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ensamble — Panel Comercial",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
