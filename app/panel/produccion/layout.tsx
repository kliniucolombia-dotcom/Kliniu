import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inyección — Panel Comercial",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
