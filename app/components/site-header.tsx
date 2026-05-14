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
  const { totalProducts } = useCart();

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
    <header ref={menuRef} className="relative sticky top-0 z-50 border-b border-black/8 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.06)]">
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
            <div className="relative">
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
              {totalProducts > 0 && (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#27B1B8] px-1 text-[9px] font-bold text-white">
                  {totalProducts}
                </span>
              )}
              <span className="text-[10px] font-semibold">Carrito</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Mega-menú productos ── */}
      {menuAbierto && (
        <div className="absolute left-0 right-0 top-full z-50 border-t border-black/8 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.13)]">
          <div className="mx-auto max-w-[1440px] px-5 py-5">
            <div className="flex gap-3">
              {categoriasData.map((cat) => {
                const line1 = cat.heroTitulo1 ?? cat.nombre.split(" ").slice(0, 2).join(" ");
                const line2 = cat.heroTitulo2 ?? "";
                const dest = cat.heroDestacado ?? cat.nombre.split(" ").slice(2).join(" ");
                return (
                  <button
                    key={cat.nombre}
                    type="button"
                    onClick={() => irACategoria(cat.nombre)}
                    className="group flex flex-1 flex-col overflow-hidden rounded-2xl border border-black/8 bg-white text-left transition-all hover:border-[#27B1B8]/40 hover:shadow-md"
                  >
                    <div className="relative h-32 w-full overflow-hidden bg-[#f0f8f8]">
                      {cat.bannerImagen && (
                        <Image
                          src={cat.bannerImagen}
                          alt={cat.nombre}
                          fill
                          sizes="200px"
                          className="object-cover object-right transition-transform duration-300 group-hover:scale-105"
                        />
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-[11px] font-bold leading-snug text-[#073F43]">
                        {line1}
                        <br />
                        <span className="text-[#073F43]">{line2}</span>
                        <span className="text-[#27B1B8]">{dest}</span>
                      </p>
                    </div>
                  </button>
                );
              })}

              {/* CTA card */}
              <div className="flex w-40 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#e8f5f5] p-4 text-center">
                <Image
                  src="/foca-ok-kliniu-original.png"
                  alt="Foca Kliniu"
                  width={64}
                  height={64}
                  className="object-contain"
                />
                <p className="mt-2 text-xs font-bold leading-tight text-[#073F43]">
                  ¿No sabes cuál necesitas?
                </p>
                <p className="mt-1 text-[10px] leading-tight text-[#607175]">
                  Te ayudamos a elegir la mejor solución para tu espacio.
                </p>
                <Link
                  href="/contacto"
                  onClick={() => setMenuAbierto(false)}
                  className="mt-3 rounded-full bg-[#073F43] px-3 py-1.5 text-[10px] font-bold text-white transition-colors hover:bg-[#0C535B]"
                >
                  Te asesoramos ☎
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
