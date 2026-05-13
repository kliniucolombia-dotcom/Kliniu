"use client";

import { useEffect, useEffectEvent, useState } from "react";
import Image from "next/image";
const slides = [
  {
    id: 1,
    eyebrow: "Banner 01",
    title: "Encuentra el repuesto que necesitas sin saber su nombre",
    description:
      "Busca por placa, modelo o referencia y compara opciones confiables en segundos.",
    image: "/hero-banner-1.jpg",
  },
  {
    id: 2,
    eyebrow: "Banner 02",
    title: "Compra repuestos con apoyo experto y entrega segura",
    description:
      "Explora productos destacados y encuentra aliados cerca de ti para resolverlo rapido.",
    image: "/hero-banner-2.jpg",
  },
  {
    id: 3,
    eyebrow: "Banner 03",
    title: "Descubre ofertas, categorias y soluciones para tu vehiculo",
    description:
      "Deja estos slides listos para reemplazar luego con tus banners finales.",
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
            className="relative aspect-[16/10] w-full shrink-0 bg-[#05070a] sm:aspect-[16/9] md:aspect-[21/8] lg:aspect-[2560/720]"
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
            <div className="absolute inset-0 bg-gradient-to-r from-black/86 via-black/42 to-black/8" />

            <div className="relative mx-auto flex h-full max-w-[1440px] items-center px-6 py-12 sm:py-16 md:py-20">
              <div className="max-w-2xl">
                <p className="mb-4 text-sm font-semibold uppercase tracking-[0.35em] text-[#27B1B8]">
                  {slide.eyebrow}
                </p>
                <h1 className="mb-5 text-4xl font-bold leading-tight md:text-6xl">
                  {slide.title}
                </h1>
                <p className="mb-8 max-w-xl text-base text-slate-100 md:text-lg">
                  {slide.description}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <button
        type="button"
        aria-label="Banner anterior"
        onClick={goToPrev}
        className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/25 text-2xl transition-colors duration-200 hover:border-[#27B1B8] hover:text-[#27B1B8]"
      >
        ‹
      </button>

      <button
        type="button"
        aria-label="Banner siguiente"
        onClick={advanceSlide}
        className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/25 text-2xl transition-colors duration-200 hover:border-[#27B1B8] hover:text-[#27B1B8]"
      >
        ›
      </button>

      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-3">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            aria-label={`Ir al banner ${index + 1}`}
            onClick={() => goToSlide(index)}
            className={`h-3 rounded-full transition-all duration-300 ${
              currentSlide === index
                ? "w-10 bg-[#27B1B8]"
                : "w-3 bg-white/60 hover:bg-white"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
