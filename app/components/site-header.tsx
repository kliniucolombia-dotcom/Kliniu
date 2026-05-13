"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCart } from "./cart-provider";
import { categorias, slugCategoria } from "../data/catalog";

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
    await fetch("/api/auth/logout", {
      method: "POST",
    });
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-black/8 bg-white text-[#0C535B] shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div className="mx-auto max-w-[1600px] px-4 py-4 lg:px-5">
        <div className="flex items-center gap-3">
          <Link href="/" className="inline-flex shrink-0">
            <Image
              src="/logo.png"
              alt="Kliniu"
              width={128}
              height={34}
              style={{ width: "128px", height: "auto" }}
              priority
            />
          </Link>

          <form
            onSubmit={handleSearch}
            className="flex min-w-0 flex-1 items-center rounded-full border border-black/10 bg-[#f8f8f7] p-2 shadow-[0_8px_20px_rgba(15,23,42,0.04)] md:max-w-[720px]"
          >
            <input
              key={searchParams.get("q") || ""}
              name="q"
              type="search"
              defaultValue={searchParams.get("q") || ""}
              placeholder="Buscar repuestos..."
              className="w-full min-w-0 bg-transparent px-4 text-sm text-[#0C535B] outline-none placeholder:text-slate-400 md:px-5"
            />
            <div className="ml-2 flex items-center gap-2 rounded-full bg-white/88 pl-2">
              <button
                type="submit"
                className="rounded-full bg-[#27B1B8] px-5 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#1E969B] lg:px-7"
              >
                Buscar
              </button>
              <Link
                href="/buscar-por-imagen"
                aria-label="Abrir búsqueda por imagen"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#0C535B]/12 bg-white text-[#0C535B] transition-colors duration-200 hover:border-[#27B1B8] hover:bg-[#EAF8F6] hover:text-[#27B1B8]"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14.5 4H9.5L8 6H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3l-1.5-2Z" />
                  <circle cx="12" cy="12" r="3.5" />
                </svg>
              </Link>
            </div>
          </form>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <nav className="flex shrink-0 items-center gap-4 text-[13px] font-semibold tracking-[0.01em] text-[#0C535B] md:gap-5 lg:text-sm xl:gap-6">
          <div className="relative" ref={menuRef}>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => irACategoria()}
                className="whitespace-nowrap transition-colors duration-200 hover:text-[#27B1B8]"
              >
                Categoría
              </button>
              <button
                type="button"
                aria-label="Abrir subcategorías"
                onClick={() => setMenuAbierto((prev) => !prev)}
                className="text-[10px] text-[#0C535B]/55 transition-colors duration-200 hover:text-[#27B1B8]"
              >
                {menuAbierto ? "▲" : "▼"}
              </button>
            </div>

            {menuAbierto && (
              <div className="absolute left-0 top-full mt-4 w-72 rounded-2xl border border-black/8 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                {categorias.map((categoria) => (
                  <button
                    key={categoria}
                    type="button"
                    onClick={() => irACategoria(categoria)}
                    className="block w-full rounded-xl px-4 py-3 text-left text-sm font-medium normal-case tracking-normal text-[#0C535B]/85 transition-colors duration-200 hover:bg-[#f8f8f7] hover:text-[#0C535B]"
                  >
                    {categoria}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/quienes-somos"
            className="whitespace-nowrap transition-colors duration-200 hover:text-[#27B1B8]"
          >
            Quiénes somos
          </Link>
<Link
            href="/contacto"
            className="whitespace-nowrap transition-colors duration-200 hover:text-[#27B1B8]"
          >
            Contacto
          </Link>
          </nav>

          <div className="flex shrink-0 items-center gap-2 xl:gap-3">
            <Link
              href="/carrito"
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#0C535B]/18 bg-[#f8f8f7] text-[#0C535B] transition-colors duration-200 hover:bg-[#0C535B] hover:text-white"
            >
              <span className="text-lg">🛒</span>
              {totalItems > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#27B1B8] px-1 text-[10px] font-semibold text-white">
                  {totalItems}
                </span>
              )}
            </Link>
            {currentUser ? (
              <>
                <span className="hidden max-w-[96px] truncate whitespace-nowrap text-sm font-semibold text-[#0C535B] lg:inline xl:max-w-none">
                  Hola, {currentUser.fullName}
                </span>
                <Link
                  href={currentUser.role === "ADMIN" ? "/admin" : "/mi-cuenta"}
                  className="inline-flex items-center gap-2 rounded-full bg-[#27B1B8] px-3 py-2.5 text-[11px] font-semibold tracking-[0.04em] text-white transition-colors duration-200 hover:bg-[#1E969B] lg:px-4 lg:text-xs xl:px-5"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 21a8 8 0 0 0-16 0" />
                    <circle cx="12" cy="8" r="4" />
                  </svg>
                  <span className="hidden lg:inline">{currentUser.fullName}</span>
                  <span className="lg:hidden">Cuenta</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full border border-[#0C535B]/25 px-3 py-2.5 text-[11px] font-semibold tracking-[0.04em] text-[#0C535B] transition-colors duration-200 hover:border-[#0C535B] hover:bg-[#0C535B] hover:text-white lg:px-4 lg:text-xs xl:px-5"
                >
                  Salir
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/registro"
                  className="rounded-full bg-[#27B1B8] px-3 py-2.5 text-[11px] font-semibold tracking-[0.04em] text-white transition-colors duration-200 hover:bg-[#1E969B] lg:px-4 lg:text-xs xl:px-5"
                >
                  Registro
                </Link>
                <Link
                  href="/login"
                  className="rounded-full border border-[#0C535B]/25 px-3 py-2.5 text-[11px] font-semibold tracking-[0.04em] text-[#0C535B] transition-colors duration-200 hover:border-[#0C535B] hover:bg-[#0C535B] hover:text-white lg:px-4 lg:text-xs xl:px-5"
                >
                  Ingresar
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
