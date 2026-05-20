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
  },
  {
    id: 2,
    title: "Todo lo que tu espacio",
    titleSecond: "necesita,",
    titleHighlight: "en un solo lugar",
    image: "/hero-banner-b.jpg",
  },
  {
    id: 3,
    title: "Todo lo que tu espacio",
    titleSecond: "necesita,",
    titleHighlight: "en un solo lugar",
    image: "/hero-banner-c.jpg",
  },
];

const AUTO_PLAY_MS = 18000;

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const advanceSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const goToPrev = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, AUTO_PLAY_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <section className="relative overflow-hidden">
      <div
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {slides.map((slide) => (
          <article
            key={slide.id}
            className="relative w-full shrink-0 overflow-hidden bg-[#f4f0ea]"
            style={{ height: "clamp(380px, 32vw, 460px)" }}
          >
            <div className="absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.image}
                alt={slide.title}
                className="h-full w-full"
                style={{ objectFit: "cover", objectPosition: "center center" }}
              />
            </div>

            <div
              className="relative flex h-full flex-col items-start justify-center px-12 sm:px-16 md:px-24 lg:px-36"
              style={{ paddingBottom: "4px" }}
            >
              <h1
                className="mb-5 max-w-[760px] font-extrabold tracking-tight text-[#07131A] md:mb-6"
                style={{ fontSize: "clamp(38px, 4.35vw, 56px)", lineHeight: 1.05 }}
              >
                <span className="block">{slide.title}</span>
                <span className="block">
                  {slide.titleSecond}{" "}
                  <span className="text-[#27B1B8]">{slide.titleHighlight}</span>
                </span>
              </h1>

              <div
                className="flex overflow-hidden rounded-[12px] shadow-[0_14px_32px_rgba(15,23,42,0.12)]"
                style={{ width: "min(88vw, 528px)" }}
              >
                <Link
                  href="/categorias"
                  className="inline-flex flex-1 items-center gap-4 px-6 py-5 text-left text-white transition-opacity hover:opacity-90 md:px-8"
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
                <Link
                  href="/contacto"
                  className="inline-flex flex-1 items-center gap-4 bg-white px-6 py-5 text-left text-[#075f68] transition-colors hover:bg-[#f4fbfb] md:px-8"
                  style={{ minHeight: "122px" }}
                >
                  <svg viewBox="0 0 24 24" className="h-10 w-10 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 18h16" />
                    <path d="M7 18V9h6v9" />
                    <path d="M13 18V6h5v12" />
                    <path d="M7 9h6l-3-4Z" />
                    <path d="M18 6l2 3h-2" />
                  </svg>
                  <span>
                    <span className="block text-[17px] font-extrabold leading-tight">Cotiza ahora</span>
                    <span className="mt-1 block max-w-[150px] text-[11px] font-semibold leading-tight text-[#075f68]">Cotiza en volumen y obtén los mejores productos.</span>
                  </span>
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      <button
        type="button"
        aria-label="Banner anterior"
        onClick={goToPrev}
        className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/20 text-xl transition-colors hover:border-[#27B1B8] hover:text-[#27B1B8]"
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Banner siguiente"
        onClick={advanceSlide}
        className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/20 text-xl transition-colors hover:border-[#27B1B8] hover:text-[#27B1B8]"
      >
        ›
      </button>

      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            aria-label={`Ir al banner ${index + 1}`}
            onClick={() => goToSlide(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              currentSlide === index ? "w-8 bg-[#27B1B8]" : "w-2 bg-white/50 hover:bg-white"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
