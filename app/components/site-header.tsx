"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCart } from "./cart-provider";
import { categoriasData, slugCategoria } from "../data/catalog";
import WhatsAppAsesor from "./whatsapp-asesor";

type SiteHeaderProps = {
  currentUser: {
    fullName: string;
    role: "CUSTOMER" | "ADMIN" | "SELLER" | "PACKING";
  } | null;
};

export default function SiteHeader({ currentUser }: SiteHeaderProps) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { totalProducts } = useCart();

  useEffect(() => {
    const onScroll = () => {
      const current = window.scrollY;
      if (current < 60) {
        setHidden(false);
      } else if (current > lastScrollY.current + 6) {
        setHidden(true);
        setMenuAbierto(false);
      } else if (current < lastScrollY.current - 6) {
        setHidden(false);
      }
      lastScrollY.current = current;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
    <header
      ref={menuRef}
      className="fixed top-0 left-0 right-0 z-50 border-b border-black/8 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.06)]"
      style={{ transform: hidden ? "translateY(-100%)" : "translateY(0)", transition: "transform 300ms ease-in-out" }}
    >
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
            <div
              className="relative"
              onMouseEnter={() => {
                if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
                setMenuAbierto(true);
              }}
              onMouseLeave={() => {
                hoverTimeout.current = setTimeout(() => setMenuAbierto(false), 120);
              }}
            >
              <button
                type="button"
                className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  pathname === "/categorias"
                    ? "text-[#0C535B] underline decoration-[#27B1B8] decoration-2 underline-offset-4"
                    : "text-[#0C535B] hover:text-[#27B1B8]"
                }`}
              >
                Productos
                <svg viewBox="0 0 12 12" className={`h-3 w-3 opacity-50 transition-transform ${menuAbierto ? "rotate-180" : ""}`} fill="currentColor">
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
              href="/outlet"
              className={`rounded-lg px-3 py-2 text-sm font-black transition-colors ${
                pathname === "/outlet"
                  ? "text-[#27B1B8] underline decoration-[#27B1B8] decoration-2 underline-offset-4"
                  : "text-[#27B1B8] hover:text-[#0C535B]"
              }`}
            >
              Outlet
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
            <Link
              href="/puntos"
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-black transition-all ${
                pathname === "/puntos"
                  ? "bg-[#FF6B00] text-white shadow-[0_4px_14px_rgba(255,107,0,0.4)]"
                  : "bg-[#FF6B00] text-white shadow-[0_2px_8px_rgba(255,107,0,0.3)] hover:shadow-[0_4px_14px_rgba(255,107,0,0.45)] hover:opacity-90"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              Puntos
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
        <div
          className="absolute left-0 right-0 top-full z-50 border-t border-black/8 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.13)]"
          onMouseEnter={() => {
            if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
          }}
          onMouseLeave={() => {
            hoverTimeout.current = setTimeout(() => setMenuAbierto(false), 120);
          }}
        >
          <div className="mx-auto max-w-[1510px] px-5 py-5">
            <div className="scrollbar-hidden flex items-start gap-5 overflow-x-auto">
              {categoriasData.filter((cat) => cat.nombre !== "Outlet" && cat.nombre !== "Insumos/Repuesto").map((cat) => {
                return (
                  <button
                    key={cat.nombre}
                    type="button"
                    onClick={() => irACategoria(cat.nombre)}
                    className="group flex h-[249px] w-[224px] shrink-0 flex-col items-center justify-between rounded-[14px] border border-[#e2e8e8] bg-white px-6 pb-7 pt-7 text-center transition-all duration-300 hover:-translate-y-1 hover:border-[#9bdddf] hover:shadow-[0_18px_36px_rgba(10,92,99,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8ed9dd]"
                  >
                    <div className="relative flex h-[142px] w-full items-center justify-center">
                      {cat.bannerImagen && (
                        <Image
                          src={cat.bannerImagen}
                          alt={cat.nombre}
                          width={150}
                          height={140}
                          className="h-[118px] w-auto max-w-[132px] object-contain transition-transform duration-300 group-hover:scale-[1.04]"
                        />
                      )}
                    </div>
                    <p className="max-w-[180px] text-[15px] font-bold leading-[1.25] text-[#064f59]">
                      {cat.nombre}
                    </p>
                  </button>
                );
              })}

              {/* CTA card */}
              <div className="flex h-[249px] w-[224px] shrink-0 flex-col items-center justify-center rounded-[14px] border border-[#9bdddf] bg-[#e9f7f8] px-7 py-7 text-center">
                <Image
                  src="/foca-ok-kliniu-original.png"
                  alt="Foca Kliniu"
                  width={82}
                  height={78}
                  className="mb-4 h-[72px] w-[76px] object-contain"
                />
                <p className="max-w-[178px] text-[16px] font-extrabold leading-[1.25] text-[#064f59]">
                  ¿No sabes cuál necesitas?
                </p>
                <p className="mt-2 max-w-[174px] text-[12px] font-medium leading-[1.35] text-[#3d8b93]">
                  Te ayudamos a elegir la mejor solución para tu espacio.
                </p>
                <WhatsAppAsesor className="mt-4 inline-flex min-h-9 items-center justify-center rounded-full bg-[#075762] px-6 text-[12px] font-extrabold text-white shadow-[0_10px_20px_rgba(7,87,98,0.12)] transition-colors hover:bg-[#0C535B]">
                  Te asesoramos ☎
                </WhatsAppAsesor>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
