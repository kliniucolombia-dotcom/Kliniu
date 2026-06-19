"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SlideButton =
  | { type: "primary"; label: string; sub?: string; href: string }
  | { type: "advisor"; label: string; sub?: string };

const slides: {
  id: number;
  image: string;
  imageMobile: string;
  buttons: SlideButton[];
}[] = [
  {
    id: 1,
    image: "/banners-web/BANNER FINALES-03.png",
    imageMobile: "/banners-responsive/BANNER-FINALES-22.png",
    buttons: [
      { type: "primary", label: "Comprar Ahora", sub: "Envío a todo Colombia", href: "/categorias" },
      { type: "advisor", label: "Cotiza ahora", sub: "Habla con un asesor" },
    ],
  },
  {
    id: 2,
    image: "/banners-web/BANNER FINALES-02.png",
    imageMobile: "/banners-responsive/BANNER-FINALES-23.png",
    buttons: [
      { type: "primary", label: "Comprar ahora", href: "/categorias" },
    ],
  },
  {
    id: 3,
    image: "/banners-web/BANNER FINALES-01.png",
    imageMobile: "/banners-responsive/BANNER-FINALES-24.png",
    buttons: [
      { type: "primary", label: "Explorar productos", href: "/categorias" },
    ],
  },
];

const AUTO_PLAY_MS = 18000;

function Dots({
  current,
  onSelect,
  light = false,
}: {
  current: number;
  onSelect: (i: number) => void;
  light?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {slides.map((slide, index) => (
        <button
          key={slide.id}
          type="button"
          aria-label={`Ir al banner ${index + 1}`}
          onClick={() => onSelect(index)}
          className={`h-2 rounded-full transition-all duration-300 ${
            current === index
              ? "pulse-ring w-8 bg-[#27B1B8]"
              : light
              ? "w-2 bg-white/60 hover:bg-white"
              : "w-2 bg-black/25 hover:bg-black/40"
          }`}
        />
      ))}
    </div>
  );
}

function SlideButtons({
  buttons,
  size,
}: {
  buttons: SlideButton[];
  size: "sm" | "lg";
}) {
  const isLg = size === "lg";
  return (
    <div
      className={`hero-pop home-reveal home-delay-1 flex gap-8 ${isLg ? "" : "mt-4"}`}
      style={isLg ? { width: "min(88vw, 528px)" } : undefined}
    >
      {buttons.map((btn, i) => {
        const baseClass = isLg
          ? `inline-flex flex-1 cursor-pointer items-center gap-4 rounded-[12px] px-6 py-5 text-left shadow-[0_14px_32px_rgba(15,23,42,0.12)] transition-colors ${isLg ? "md:px-8" : ""}`
          : "inline-flex flex-1 cursor-pointer items-center gap-3 rounded-[10px] px-4 py-4 text-left shadow-[0_8px_20px_rgba(15,23,42,0.1)] transition-colors";
        const minH = isLg ? { minHeight: "122px" } : undefined;
        const iconSize = isLg ? "h-10 w-10" : "h-7 w-7";
        const labelSize = isLg ? "text-[17px]" : "text-[14px]";
        const subSize = isLg ? "text-[11px]" : "text-[10px]";

        if (btn.type === "primary") {
          return (
            <Link
              key={i}
              href={btn.href}
              className={`shine-sweep ${baseClass} text-white hover:opacity-90`}
              style={{ backgroundColor: "#075f68", ...minH }}
            >
              <svg viewBox="0 0 24 24" className={`${iconSize} shrink-0`} fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              <span>
                <span className={`block ${labelSize} font-extrabold leading-tight`}>{btn.label}</span>
                {btn.sub && <span className={`mt-0.5 block max-w-[150px] ${subSize} font-semibold leading-tight text-white/80`}>{btn.sub}</span>}
              </span>
            </Link>
          );
        }

        return (
          <button
            key={i}
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("kliniu:open-advisor"))}
            className={`${baseClass} bg-white text-[#075f68] hover:bg-[#f4fbfb]`}
            style={minH}
          >
            <svg viewBox="0 0 24 24" className={`${iconSize} shrink-0`} fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>
              <span className={`block ${labelSize} font-extrabold leading-tight`}>{btn.label}</span>
              {btn.sub && <span className={`mt-0.5 block max-w-[150px] ${subSize} font-semibold leading-tight text-[#075f68]/70`}>{btn.sub}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const advanceSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const goToPrev = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  const goToSlide = (index: number) => setCurrentSlide(index);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, AUTO_PLAY_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <section className="hero-energy relative overflow-hidden home-reveal-soft">
      <div
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {slides.map((slide) => (
          <article key={slide.id} className="w-full shrink-0 bg-[#f4f0ea]">

            {/* ── MÓVIL ── */}
            <div className="md:hidden">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.imageMobile}
                  alt={`Banner ${slide.id}`}
                  className="w-full"
                  style={{ aspectRatio: "4/3", objectFit: "cover", objectPosition: "center", display: "block" }}
                />
                <button
                  type="button"
                  aria-label="Banner anterior"
                  onClick={goToPrev}
                  className="nav-pulse absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/20 text-xl text-white"
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label="Banner siguiente"
                  onClick={advanceSlide}
                  className="nav-pulse absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/20 text-xl text-white"
                >
                  ›
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                  <Dots current={currentSlide} onSelect={goToSlide} light />
                </div>
                {/* Overlays transparentes sobre botones baked-in en imagen mobile */}
                {slide.buttons.length === 1 && slide.buttons[0].type === "primary" ? (
                  /* Slide con un solo botón: imagen entera clickeable */
                  <Link
                    href={slide.buttons[0].href}
                    className="absolute inset-0 cursor-pointer"
                    aria-label={slide.buttons[0].label}
                  />
                ) : (
                  /* Slide con 2 botones: overlays precisos */
                  <>
                    {slide.buttons[0].type === "primary" && (
                      <Link
                        href={slide.buttons[0].href}
                        className="absolute cursor-pointer"
                        aria-label={slide.buttons[0].label}
                        style={{ left: "5%", top: "28%", width: "42%", height: "13%" }}
                      />
                    )}
                    {slide.buttons.some((b) => b.type === "advisor") && (
                      <button
                        type="button"
                        aria-label="Cotiza ahora"
                        onClick={() => window.dispatchEvent(new CustomEvent("kliniu:open-advisor"))}
                        className="absolute cursor-pointer"
                        style={{ left: "52%", top: "28%", width: "42%", height: "13%" }}
                      />
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ── DESKTOP ── */}
            <div
              className="relative hidden md:block"
              style={{ height: "clamp(380px, 32vw, 460px)" }}
            >
              <Link
                href={slide.buttons[0].type === "primary" ? slide.buttons[0].href : "/categorias"}
                className="block h-full w-full"
                aria-label={`Banner ${slide.id}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.image}
                  alt={`Banner ${slide.id}`}
                  className="h-full w-full"
                  style={{ objectFit: "cover", objectPosition: "center center" }}
                />
              </Link>
              {/* Overlay sobre botón "Cotiza ahora" baked-in en banner 03 */}
              {slide.buttons.some((b) => b.type === "advisor") && (
                <button
                  type="button"
                  aria-label="Cotiza ahora"
                  onClick={() => window.dispatchEvent(new CustomEvent("kliniu:open-advisor"))}
                  className="absolute cursor-pointer"
                  style={{ left: "23%", bottom: "10%", width: "16%", height: "25%" }}
                />
              )}
            </div>

          </article>
        ))}
      </div>

      {/* Flechas desktop */}
      <button
        type="button"
        aria-label="Banner anterior"
        onClick={goToPrev}
        className="nav-pulse absolute left-4 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/20 text-xl transition-colors hover:border-[#27B1B8] hover:text-[#27B1B8] md:flex"
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Banner siguiente"
        onClick={advanceSlide}
        className="nav-pulse absolute right-4 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/20 text-xl transition-colors hover:border-[#27B1B8] hover:text-[#27B1B8] md:flex"
      >
        ›
      </button>

      {/* Dots desktop */}
      <div className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 md:flex">
        <Dots current={currentSlide} onSelect={goToSlide} light />
      </div>
    </section>
  );
}
