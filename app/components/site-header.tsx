"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCart } from "./cart-provider";
import { useProducts } from "./products-provider";
import { categoriasData, slugCategoria } from "../data/catalog";
import AdvisorCtaCard from "./advisor-cta-card";

type SiteHeaderProps = {
  currentUser: {
    fullName: string;
    role: "CUSTOMER" | "ADMIN" | "SELLER" | "PACKING" | "SUPERADMIN" | "RRHH" | "EMPLOYEE";
  } | null;
};

function getUserHref(role: "CUSTOMER" | "ADMIN" | "SELLER" | "PACKING" | "SUPERADMIN" | "RRHH" | "EMPLOYEE"): string {
  if (role === "ADMIN") return "/admin";
  if (role === "SELLER" || role === "SUPERADMIN") return "/panel";
  if (role === "RRHH") return "/panel/rrhh";
  if (role === "EMPLOYEE") return "/empleado";
  return "/mi-cuenta";
}

export default function SiteHeader({ currentUser }: SiteHeaderProps) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [masAbierto, setMasAbierto] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const lastScrollY = useRef(0);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { totalProducts } = useCart();
  const { products } = useProducts();

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
    const q = searchQuery.trim();
    setSearchFocused(false);
    const params = new URLSearchParams(searchParams.toString());
    if (q) {
      params.set("q", q);
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

  const searchSuggestions = searchQuery.trim().length >= 2
    ? products
        .filter((p) =>
          p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.descripcion || "").toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 6)
    : [];

  const showSuggestions = searchFocused && searchSuggestions.length > 0;

  const bottomNavItems = [
    // ── Principales (visibles) ──
    {
      label: "Inicio",
      href: "/",
      active: pathname === "/",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinejoin="round" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      label: "Categorías",
      href: "/categorias",
      active: pathname === "/categorias" && !searchParams.get("tipo"),
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    {
      label: "Carrito",
      href: "/carrito",
      active: pathname === "/carrito",
      icon: (
        <span className="relative">
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
        </span>
      ),
    },
    {
      label: currentUser ? currentUser.fullName.split(" ")[0] : "Cuenta",
      href: currentUser ? getUserHref(currentUser.role) : "/login",
      active: pathname === "/mi-cuenta" || pathname === "/login",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M20 21a8 8 0 0 0-16 0" />
          <circle cx="12" cy="8" r="4" />
        </svg>
      ),
    },
    // ── En "Más" ──
    {
      label: "Insumos",
      href: "/categorias?tipo=insumos",
      active: pathname === "/categorias" && searchParams.get("tipo") === "insumos",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </svg>
      ),
    },
    {
      label: "Outlet",
      href: "/outlet",
      active: pathname === "/outlet",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
      ),
    },
    {
      label: "Puntos",
      href: "/puntos",
      active: pathname === "/puntos",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ),
    },
    {
      label: "Contacto",
      href: "/contacto",
      active: pathname === "/contacto",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.63 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.78a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      ),
    },
    {
      label: "Nosotros",
      href: "/quienes-somos",
      active: pathname === "/quienes-somos",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <header
        ref={menuRef}
        className="fixed top-0 left-0 right-0 z-50 bg-white"
        style={{ transform: hidden ? "translateY(-100%)" : "translateY(0)", transition: "transform 300ms ease-in-out" }}
      >
        <div className="mx-auto max-w-[1440px] px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3 sm:gap-6">
            {/* Logo */}
            <Link href="/" className="shrink-0">
              <Image
                src="/logo.png"
                alt="Kliniu"
                width={110}
                height={30}
                style={{ width: "100px", height: "auto" }}
                priority
              />
            </Link>

            {/* Nav — desktop */}
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
                  onClick={() => setMenuAbierto((v) => !v)}
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
                className={`nav-animated-link rounded-lg px-3 py-2 text-sm font-black transition-colors ${
                  pathname === "/outlet"
                    ? "nav-animated-link-active text-[#27B1B8]"
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
                    ? "bg-[#7c3aed] text-white shadow-[0_4px_14px_rgba(124,58,237,0.4)]"
                    : "bg-[#7c3aed] text-white shadow-[0_2px_8px_rgba(124,58,237,0.3)] hover:shadow-[0_4px_14px_rgba(124,58,237,0.45)] hover:opacity-90"
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                Puntos
              </Link>
            </nav>

            {/* Search */}
            <div ref={searchRef} className="relative flex-1">
              <form
                onSubmit={handleSearch}
                className="flex items-center gap-2 rounded-full border border-black/10 bg-[#f8f8f7] px-3 py-2 transition-all focus-within:border-[#27B1B8]/40 focus-within:bg-white sm:px-4 sm:py-2.5"
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
                  name="q"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                  placeholder="Buscar productos..."
                  className="w-full bg-transparent text-sm text-[#0C535B] outline-none placeholder:text-[#0C535B]/40"
                  autoComplete="off"
                />
              </form>
              {showSuggestions && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_8px_28px_rgba(0,0,0,0.12)]">
                  {searchSuggestions.map((p) => (
                    <button
                      key={p.slug}
                      type="button"
                      onMouseDown={() => {
                        setSearchQuery("");
                        setSearchFocused(false);
                        router.push(`/producto/${p.slug}`);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[#f0fbfc]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.imagen}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-lg object-contain bg-[#f8f8f7] p-1"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/product-placeholder.png"; }}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#111]">{p.nombre}</p>
                        <p className="text-xs font-bold text-[#0C535B]">{p.precio}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Account + Cart */}
            <div className="flex shrink-0 items-center gap-3 sm:gap-4">
              {currentUser ? (
                <Link
                  href={getUserHref(currentUser.role)}
                  className="flex flex-col items-center gap-0.5 text-[#0C535B] transition-colors hover:text-[#27B1B8]"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M20 21a8 8 0 0 0-16 0" />
                    <circle cx="12" cy="8" r="4" />
                  </svg>
                  <span className="hidden text-[10px] font-semibold sm:block">{currentUser.fullName.split(" ")[0]}</span>
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
                  <span className="hidden text-[10px] font-semibold sm:block">Mi cuenta</span>
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
                <span className="hidden text-[10px] font-semibold sm:block">Carrito</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ── Mega-menú productos (desktop) ── */}
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
              <div className="scrollbar-hidden grid grid-cols-[repeat(6,minmax(170px,1fr))] gap-5 overflow-x-auto">
                {categoriasData.filter((cat) => cat.nombre !== "Outlet" && cat.nombre !== "Insumos/Repuesto").map((cat) => {
                  return (
                    <button
                      key={cat.nombre}
                      type="button"
                      onClick={() => irACategoria(cat.nombre)}
                      className="group flex h-[249px] min-w-0 flex-col items-center justify-between rounded-[14px] border border-[#e2e8e8] bg-white px-6 pb-7 pt-7 text-center transition-all duration-300 hover:-translate-y-1 hover:border-[#9bdddf] hover:shadow-[0_18px_36px_rgba(10,92,99,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8ed9dd]"
                    >
                      <div className={`relative flex h-[142px] w-full items-center justify-center ${cat.flipImagen ? "-scale-x-100" : ""}`}>
                        {cat.bannerImagen && (
                          <Image
                            src={cat.bannerImagen}
                            alt={cat.nombre}
                            width={150}
                            height={140}
                            className="h-[118px] w-auto max-w-[132px] object-contain"
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
                <AdvisorCtaCard className="h-[249px] min-w-0" />
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── Bottom Navigation — mobile only ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-[0_-4px_20px_rgba(15,23,42,0.08)] lg:hidden">
        {/* Panel Más */}
        {masAbierto && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/20"
              onClick={() => setMasAbierto(false)}
            />
            <div className="absolute bottom-full left-0 right-0 z-50 rounded-t-2xl bg-white px-4 pb-4 pt-5 shadow-[0_-8px_32px_rgba(15,23,42,0.12)] animate-[slideUp_200ms_ease-out]">
              <p className="mb-3 text-[11px] font-black uppercase tracking-widest text-[#0C535B]/50">Más opciones</p>
              {bottomNavItems.slice(4).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMasAbierto(false)}
                  aria-current={item.active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                    item.active
                      ? "bg-[#e8f5f5] text-[#27B1B8] shadow-[inset_3px_0_0_#27B1B8]"
                      : "text-[#0C535B] hover:bg-[#f0fafa] hover:text-[#27B1B8]"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}

              {currentUser && (
                <>
                  <div className="my-2 h-px bg-black/6" />
                  <Link
                    href="/mi-cuenta?tab=orders"
                    onClick={() => setMasAbierto(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#0C535B] transition-colors hover:bg-[#f0fafa] hover:text-[#27B1B8]"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M12 3 4 7l8 4 8-4-8-4Z"/><path d="M4 7v10l8 4 8-4V7"/><path d="M12 11v10"/>
                    </svg>
                    Mis Pedidos
                  </Link>
                  <Link
                    href="/mi-cuenta?tab=facturas"
                    onClick={() => setMasAbierto(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#0C535B] transition-colors hover:bg-[#f0fafa] hover:text-[#27B1B8]"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                    Facturas
                  </Link>
                  <Link
                    href="/mi-cuenta/puntos"
                    onClick={() => setMasAbierto(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#0C535B] transition-colors hover:bg-[#f0fafa] hover:text-[#27B1B8]"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    Mis Puntos
                  </Link>
                  <div className="my-2 h-px bg-black/6" />
                  <button
                    type="button"
                    onClick={async () => {
                      setMasAbierto(false);
                      await fetch("/api/auth/logout", { method: "POST" });
                      window.location.href = "/login";
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Cerrar sesión
                  </button>
                </>
              )}
            </div>
          </>
        )}

        <div className="flex items-center justify-around px-1 pb-safe pt-1">
          {bottomNavItems.slice(0, 4).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMasAbierto(false)}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 transition-colors ${
                item.active
                  ? "text-[#27B1B8]"
                  : "text-[#0C535B]/60 hover:text-[#0C535B]"
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-semibold leading-none">{item.label}</span>
            </Link>
          ))}

          {/* Botón Más */}
          <button
            type="button"
            onClick={() => setMasAbierto((v) => !v)}
            className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 transition-colors ${
              masAbierto ? "text-[#27B1B8]" : "text-[#0C535B]/60 hover:text-[#0C535B]"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <circle cx="5" cy="12" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="19" cy="12" r="1.5" />
            </svg>
            <span className="text-[10px] font-semibold leading-none">Más</span>
          </button>
        </div>
      </nav>
    </>
  );
}
