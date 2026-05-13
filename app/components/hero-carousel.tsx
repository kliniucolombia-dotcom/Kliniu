"use client";

import { useEffect, useEffectEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";

const slides = [
  {
    id: 1,
    title: "Todo lo que tu espacio\nnecesita,",
    titleHighlight: "en un solo lugar",
    image: "/hero-banner-1.jpg",
  },
  {
    id: 2,
    title: "Higiene profesional\npara cada espacio,",
    titleHighlight: "siempre disponible",
    image: "/hero-banner-2.jpg",
  },
  {
    id: 3,
    title: "Dispensadores diseñados\npara alto tráfico,",
    titleHighlight: "hechos para durar",
    image: "/hero-banner-3.jpg",
  },
];

const AUTO_PLAY_MS = 5000;

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const advanceSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const syncAdvanceSlide = useEffectEvent(() => {
    advanceSlide();
  });

  const goToPrev = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      syncAdvanceSlide();
    }, AUTO_PLAY_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <section className="relative overflow-hidden text-white">
      <div
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {slides.map((slide) => (
          <article
            key={slide.id}
            className="relative aspect-[16/9] w-full shrink-0 bg-[#05070a] md:aspect-[21/8] lg:aspect-[2560/720]"
          >
            <div className="absolute inset-0">
              <Image
                src={slide.image}
                alt={slide.title}
                fill
                priority={slide.id === 1}
                sizes="100vw"
                className="object-cover object-center"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/38 to-transparent" />

            <div className="relative mx-auto flex h-full max-w-[1440px] items-center px-8 py-12 md:px-12">
              <div className="max-w-xl">
                <h1 className="mb-6 whitespace-pre-line text-4xl font-extrabold leading-tight tracking-tight md:text-5xl lg:text-6xl">
                  {slide.title}{" "}
                  <span className="text-[#27B1B8]">{slide.titleHighlight}</span>
                </h1>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/categorias"
                    className="inline-flex items-center gap-2 rounded-full bg-[#0C535B] px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                    Comprar Ahora
                  </Link>
                  <Link
                    href="/contacto"
                    className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                    </svg>
                    Cotiza ahora
                  </Link>
                </div>
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
