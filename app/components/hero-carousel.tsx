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
    image: "/hero-banner-home-3.jpg",
    imageMobile: "/banners-responsive/BANNER FINALES-22.jpg",
    buttons: [
      { type: "primary", label: "Comprar Ahora", sub: "Compra productos individuales con envio a todo colombia", href: "/categorias" },
      { type: "advisor", label: "Cotiza ahora", sub: "Cotiza en volumen y obtén los mejores productos." },
    ],
  },
  {
    id: 2,
    image: "/hero-banner-c.jpg",
    imageMobile: "/banners-responsive/BANNER FINALES-23.jpg",
    buttons: [
      { type: "primary", label: "Comprar ahora", href: "/categorias" },
    ],
  },
  {
    id: 3,
    image: "/hero-banner-b.jpg",
    imageMobile: "/banners-responsive/BANNER FINALES-24.jpg",
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

function CartIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function AdvisorIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
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
                  className={`nav-pulse absolute left-3 ${slide.buttons.length === 1 ? "top-[52%]" : "top-[45%]"} flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/20 text-xl text-white`}
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label="Banner siguiente"
                  onClick={advanceSlide}
                  className={`nav-pulse absolute right-3 ${slide.buttons.length === 1 ? "top-[52%]" : "top-[45%]"} flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/20 text-xl text-white`}
                >
                  ›
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                  <Dots current={currentSlide} onSelect={goToSlide} light />
                </div>
                {/* Botones móvil superpuestos */}
                {slide.buttons.length > 1 ? (
                  /* 2 botones: fila alineada con el arte mobile */
                  <div className="absolute left-[18.5%] right-[15.5%] top-[27.5%] flex gap-4">
                    {slide.buttons.map((btn, i) =>
                      btn.type === "primary" ? (
                        <Link
                          key={i}
                          href={btn.href}
                          className="shine-sweep inline-flex h-[52px] flex-1 items-center gap-1.5 rounded-[3px] px-2 text-white shadow-[0_6px_16px_rgba(15,23,42,0.15)] transition-colors hover:opacity-90"
                          style={{ backgroundColor: "#075f68" }}
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                          <span className="min-w-0">
                            <span className="block whitespace-nowrap text-[11px] font-extrabold leading-tight">{btn.label}</span>
                            {btn.sub && <span className="hidden text-[7px] font-semibold leading-tight text-white/80 sm:block">{btn.sub}</span>}
                          </span>
                        </Link>
                      ) : (
                        <button
                          key={i}
                          type="button"
                          onClick={() => window.dispatchEvent(new CustomEvent("kliniu:open-advisor"))}
                          className="inline-flex h-[52px] flex-1 items-center gap-1.5 rounded-[3px] bg-white px-2 text-[#075f68] shadow-[0_6px_16px_rgba(15,23,42,0.1)] transition-colors hover:bg-[#f4fbfb]"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                          <span className="min-w-0">
                            <span className="block whitespace-nowrap text-[11px] font-extrabold leading-tight">{btn.label}</span>
                            {btn.sub && <span className="hidden text-[7px] font-semibold leading-tight text-[#075f68]/70 sm:block">{btn.sub}</span>}
                          </span>
                        </button>
                      )
                    )}
                  </div>
                ) : (
                  /* 1 botón: arriba de la línea de flechas para que no compitan visualmente */
                  <div className={`absolute ${slide.id === 2 ? "left-[8.5%] top-[31%]" : "left-[10.5%] top-[32.5%]"}`}>
                    {slide.buttons[0].type === "primary" && (
                      <Link
                        href={slide.buttons[0].href}
                        className="shine-sweep inline-flex h-[23px] w-[150px] items-center justify-center rounded-[3px] px-3 text-white shadow-[0_8px_20px_rgba(15,23,42,0.15)] transition-colors hover:opacity-90"
                        style={{ backgroundColor: "#075f68" }}
                      >
                        <span className="block text-[10px] font-extrabold leading-none">{slide.buttons[0].label}</span>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── DESKTOP ── */}
            <div
              className="relative hidden md:block"
              style={{ height: "clamp(380px, 32vw, 460px)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.image}
                alt={`Banner ${slide.id}`}
                className="h-full w-full"
                style={{ objectFit: "cover", objectPosition: "center center" }}
              />
              {slide.id === 1 && (
                <h2 className="absolute left-[7.2%] top-[14%] z-10 max-w-[46rem] text-[clamp(38px,3.4vw,58px)] font-black leading-[0.98] tracking-normal text-[#333]">
                  Todo lo que tu espacio
                  <br />
                  necesita, <span className="text-[#075f68]">en un solo lugar</span>
                </h2>
              )}
              {slide.id === 2 && (
                <h2 className="absolute left-[12.2%] top-[18%] z-10 max-w-[35rem] text-[clamp(36px,3vw,54px)] font-black leading-[0.98] tracking-normal text-[#333]">
                  Lo que tu espacio
                  <br />
                  necesita <span className="text-[#075f68]">esta aqui</span>
                </h2>
              )}
              {slide.id === 3 && (
                <h2 className="absolute left-[12.2%] top-[15%] z-10 max-w-[55rem] text-[clamp(36px,3vw,54px)] font-black leading-[0.98] tracking-normal text-[#333]">
                  Más que productos,
                  <br />
                  <span className="text-[#075f68]">soluciones para cada espacio</span>
                </h2>
              )}
              {slide.buttons[0].type === "primary" && (
                <Link
                  href={slide.buttons[0].href}
                  className={`absolute z-10 inline-flex cursor-pointer items-center justify-center bg-[#075f68] text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)] transition-transform duration-200 hover:scale-[1.045] hover:shadow-[0_18px_36px_rgba(7,95,104,0.24)] focus-visible:scale-[1.045] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#27B1B8] ${
                    slide.id === 1 ? "gap-4 rounded-[8px] px-6 text-left" : "rounded-[6px] px-8"
                  }`}
                  aria-label={slide.buttons[0].label}
                  style={
                    slide.id === 1
                      ? { left: "7.2%", top: "52%", width: "clamp(220px, 24vw, 244px)", height: "27%" }
                      : slide.id === 2
                      ? { left: "12.2%", top: "58%", width: "min(26vw, 390px)", height: "15%" }
                      : { left: "12.2%", top: "58%", width: "min(26vw, 390px)", height: "15%" }
                  }
                >
                  {slide.id === 1 && <CartIcon className="h-[clamp(24px,2.4vw,42px)] w-[clamp(24px,2.4vw,42px)] shrink-0" />}
                  <span className="min-w-0">
                    <span className={`${slide.id === 1 ? "text-[clamp(14px,1.05vw,18px)]" : "text-[clamp(18px,1.55vw,30px)]"} block whitespace-nowrap font-extrabold leading-tight`}>
                      {slide.buttons[0].label}
                    </span>
                    {slide.buttons[0].sub && (
                      <span className="mt-1 block max-w-[16rem] text-[clamp(8px,0.65vw,12px)] font-semibold leading-tight text-white/82">
                        {slide.buttons[0].sub}
                      </span>
                    )}
                  </span>
                </Link>
              )}
              {slide.buttons.some((b) => b.type === "advisor") && (
                <button
                  type="button"
                  aria-label="Cotiza ahora"
                  onClick={() => window.dispatchEvent(new CustomEvent("kliniu:open-advisor"))}
                  className="absolute z-10 inline-flex cursor-pointer items-center justify-center gap-4 rounded-[8px] bg-white px-6 text-left text-[#075f68] shadow-[0_12px_28px_rgba(15,23,42,0.13)] transition-transform duration-200 hover:scale-[1.045] hover:bg-[#f4fbfb] hover:shadow-[0_18px_36px_rgba(15,23,42,0.18)] focus-visible:scale-[1.045] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#27B1B8]"
                  style={{ left: "calc(7.2% + clamp(220px, 24vw, 244px) + 48px)", top: "52%", width: "clamp(220px, 24vw, 244px)", height: "27%" }}
                >
                  <AdvisorIcon className="h-[clamp(24px,2.4vw,42px)] w-[clamp(24px,2.4vw,42px)] shrink-0" />
                  <span className="min-w-0">
                    <span className="block whitespace-nowrap text-[clamp(14px,1.05vw,18px)] font-extrabold leading-tight">
                      Cotiza ahora
                    </span>
                    <span className="mt-1 block max-w-[16rem] text-[clamp(8px,0.65vw,12px)] font-semibold leading-tight text-[#075f68]/72">
                      Cotiza en volumen y obtén los mejores productos.
                    </span>
                  </span>
                </button>
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
