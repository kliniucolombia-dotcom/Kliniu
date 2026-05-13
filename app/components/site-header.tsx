"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCart } from "./cart-provider";
import { categoriasData, slugCategoria } from "../data/catalog";

type SiteHeaderProps = {
  currentUser: {
    fullName: string;
    role: "CUSTOMER" | "ADMIN";
  } | null;
};

export default function SiteHeader({ currentUser }: SiteHeaderProps) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { totalItems } = useCart();

  const irACategoria = (categoria?: string) => {
    setMenuAbierto(false);
    const url = categoria
      ? `/categorias?categoria=${slugCategoria(categoria)}`
      : "/categorias";
    router.push(url);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get("q") || "").trim();
    const params = new URLSearchParams(searchParams.toString());
    if (query) {
      params.set("q", query);
    } else {
      params.delete("q");
    }
    const targetUrl = params.toString()
      ? `/categorias?${params.toString()}`
      : "/categorias";
    if (pathname === "/categorias") {
      router.replace(targetUrl);
      return;
    }
    router.push(targetUrl);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-black/8 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.06)]">
      <div className="mx-auto max-w-[1440px] px-5 py-3">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <Link href="/" className="shrink-0">
            <Image
              src="/logo.png"
              alt="Kliniu"
              width={110}
              height={30}
              style={{ width: "110px", height: "auto" }}
              priority
            />
          </Link>

          {/* Nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            {/* Productos dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuAbierto((prev) => !prev)}
                className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  pathname === "/categorias"
                    ? "text-[#0C535B] underline decoration-[#27B1B8] decoration-2 underline-offset-4"
                    : "text-[#0C535B] hover:text-[#27B1B8]"
                }`}
              >
                Productos
                <svg viewBox="0 0 12 12" className="h-3 w-3 opacity-50" fill="currentColor">
                  <path d="M6 8L1 3h10z" />
                </svg>
              </button>

              {menuAbierto && (
                <div className="absolute left-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                  <div className="p-2">
                    {categoriasData.map((cat) => (
                      <button
                        key={cat.nombre}
                        type="button"
                        onClick={() => irACategoria(cat.nombre)}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm text-[#0C535B]/85 transition-colors hover:bg-[#f3f9f9] hover:text-[#0C535B]"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e8f5f5] text-base">
                          {cat.icono}
                        </span>
                        <span className="font-medium">{cat.nombre}</span>
                      </button>
                    ))}
                    <div className="mx-2 my-1 border-t border-black/6" />
                    <button
                      type="button"
                      onClick={() => irACategoria()}
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-semibold text-[#27B1B8] transition-colors hover:bg-[#f3f9f9]"
                    >
                      Ver todos los productos →
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Link
              href="/categorias?tipo=insumos"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-[#0C535B] transition-colors hover:text-[#27B1B8]"
            >
              Insumos/Repuestos
            </Link>
            <Link
              href="/quienes-somos"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-[#0C535B] transition-colors hover:text-[#27B1B8]"
            >
              Nosotros
            </Link>
            <Link
              href="/contacto"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-[#0C535B] transition-colors hover:text-[#27B1B8]"
            >
              Contacto
            </Link>
          </nav>

          {/* Search */}
          <form
            onSubmit={handleSearch}
            className="flex flex-1 items-center gap-2 rounded-full border border-black/10 bg-[#f8f8f7] px-4 py-2.5 transition-all focus-within:border-[#27B1B8]/40 focus-within:bg-white"
          >
            <svg
              className="h-4 w-4 shrink-0 text-[#0C535B]/50"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              key={searchParams.get("q") || ""}
              name="q"
              type="search"
              defaultValue={searchParams.get("q") || ""}
              placeholder="Buscar productos, categorias, insumos..."
              className="w-full bg-transparent text-sm text-[#0C535B] outline-none placeholder:text-[#0C535B]/40"
            />
          </form>

          {/* Account + Cart */}
          <div className="flex shrink-0 items-center gap-4">
            {currentUser ? (
              <Link
                href={currentUser.role === "ADMIN" ? "/admin" : "/mi-cuenta"}
                className="flex flex-col items-center gap-0.5 text-[#0C535B] transition-colors hover:text-[#27B1B8]"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M20 21a8 8 0 0 0-16 0" />
                  <circle cx="12" cy="8" r="4" />
                </svg>
                <span className="text-[10px] font-semibold">{currentUser.fullName.split(" ")[0]}</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="flex flex-col items-center gap-0.5 text-[#0C535B] transition-colors hover:text-[#27B1B8]"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M20 21a8 8 0 0 0-16 0" />
                  <circle cx="12" cy="8" r="4" />
                </svg>
                <span className="text-[10px] font-semibold">Mi cuenta</span>
              </Link>
            )}

            <Link
              href="/carrito"
              className="relative flex flex-col items-center gap-0.5 text-[#0C535B] transition-colors hover:text-[#27B1B8]"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              {totalItems > 0 && (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#27B1B8] px-1 text-[9px] font-bold text-white">
                  {totalItems}
                </span>
              )}
              <span className="text-[10px] font-semibold">Carrito</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
