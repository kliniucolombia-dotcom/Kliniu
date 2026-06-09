"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const slides = [
  {
    id: 1,
    title: "Todo lo que tu espacio",
    titleSecond: "necesita,",
    titleHighlight: "en un solo lugar",
    image: "/hero-banner-home-3.jpg",
    imageMobile: "/resp-banner-home-1.jpg",
  },
  {
    id: 2,
    title: "Todo lo que tu espacio",
    titleSecond: "necesita,",
    titleHighlight: "en un solo lugar",
    image: "/hero-banner-b.jpg",
    imageMobile: "/resp-banner-home-2.jpg",
  },
  {
    id: 3,
    title: "Todo lo que tu espacio",
    titleSecond: "necesita,",
    titleHighlight: "en un solo lugar",
    image: "/hero-banner-c.jpg",
    imageMobile: "/resp-banner-home-3.jpg",
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

            {/* ── MÓVIL: imagen arriba, texto + botones abajo ── */}
            <div className="md:hidden">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.imageMobile}
                  alt={slide.title}
                  className="w-full hero-drift"
                  style={{ aspectRatio: "4/3", objectFit: "cover", objectPosition: "center", display: "block" }}
                />
                {/* Flechas sobre la imagen en móvil */}
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
                {/* Dots sobre la imagen */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                  <Dots current={currentSlide} onSelect={goToSlide} light />
                </div>
              </div>

              {/* Texto y botones debajo */}
              <div className="bg-[#f4f0ea] px-5 py-5">
                <h1 className="home-reveal text-[24px] font-extrabold leading-[1.05] tracking-tight text-[#07131A]">
                  <span className="block">{slide.title}</span>
                  <span className="block">
                    {slide.titleSecond}{" "}
                    <span className="text-[#27B1B8]">{slide.titleHighlight}</span>
                  </span>
                </h1>
                <div className="hero-pop home-reveal home-delay-1 mt-4 flex overflow-hidden rounded-[10px] shadow-[0_8px_20px_rgba(15,23,42,0.1)]">
                  <Link
                    href="/categorias"
                    className="shine-sweep inline-flex flex-1 items-center gap-3 px-4 py-4 text-left text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: "#075f68" }}
                  >
                    <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                    <span>
                      <span className="block text-[14px] font-extrabold leading-tight">Comprar Ahora</span>
                      <span className="mt-0.5 block text-[10px] font-semibold leading-tight text-white/80">Envío a todo Colombia</span>
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent("kliniu:open-advisor"))}
                    className="inline-flex flex-1 cursor-pointer items-center gap-3 bg-white px-4 py-4 text-left text-[#075f68] transition-colors hover:bg-[#f4fbfb]"
                  >
                    <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <span>
                      <span className="block text-[14px] font-extrabold leading-tight">Cotiza ahora</span>
                      <span className="mt-0.5 block text-[10px] font-semibold leading-tight text-[#075f68]/70">Habla con un asesor</span>
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* ── DESKTOP: imagen con overlay ── */}
            <div
              className="relative hidden md:block"
              style={{ height: "clamp(380px, 32vw, 460px)" }}
            >
              <div className="absolute inset-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="h-full w-full hero-drift"
                  style={{ objectFit: "cover", objectPosition: "center center" }}
                />
              </div>
              <div
                className="relative flex h-full flex-col items-start justify-center px-16 md:px-24 lg:px-36"
                style={{ paddingBottom: "4px" }}
              >
                <h1
                  className="home-reveal mb-5 max-w-[760px] font-extrabold tracking-tight text-[#07131A] md:mb-6"
                  style={{ fontSize: "clamp(38px, 4.35vw, 56px)", lineHeight: 1.05 }}
                >
                  <span className="block">{slide.title}</span>
                  <span className="block">
                    {slide.titleSecond}{" "}
                    <span className="text-[#27B1B8]">{slide.titleHighlight}</span>
                  </span>
                </h1>
                <div
                  className="hero-pop home-reveal home-delay-1 flex overflow-hidden rounded-[12px] shadow-[0_14px_32px_rgba(15,23,42,0.12)]"
                  style={{ width: "min(88vw, 528px)" }}
                >
                  <Link
                    href="/categorias"
                    className="shine-sweep inline-flex flex-1 items-center gap-4 px-6 py-5 text-left text-white transition-opacity hover:opacity-90 md:px-8"
                    style={{ backgroundColor: "#075f68", minHeight: "122px" }}
                  >
                    <svg viewBox="0 0 24 24" className="h-10 w-10 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                    <span>
                      <span className="block text-[17px] font-extrabold leading-tight">Comprar Ahora</span>
                      <span className="mt-1 block max-w-[150px] text-[11px] font-semibold leading-tight text-white">Compra productos individuales con envío a todo colombia</span>
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent("kliniu:open-advisor"))}
                    className="inline-flex flex-1 cursor-pointer items-center gap-4 bg-white px-6 py-5 text-left text-[#075f68] transition-colors hover:bg-[#f4fbfb] md:px-8"
                    style={{ minHeight: "122px" }}
                  >
                    <svg viewBox="0 0 24 24" className="h-10 w-10 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <span>
                      <span className="block text-[17px] font-extrabold leading-tight">Cotiza ahora</span>
                      <span className="mt-1 block max-w-[150px] text-[11px] font-semibold leading-tight text-[#075f68]">Habla con nuestro asesor y encuentra el producto ideal.</span>
                    </span>
                  </button>
                </div>
              </div>
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
