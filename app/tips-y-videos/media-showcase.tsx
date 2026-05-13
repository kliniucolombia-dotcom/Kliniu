"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { MediaItem, MediaPlatform } from "../data/media-hub";

type MediaShowcaseProps = {
  items: MediaItem[];
};

const platforms: Array<{ label: string; value: MediaPlatform }> = [
  { label: "YouTube", value: "YouTube" },
  { label: "Instagram", value: "Instagram" },
  { label: "TikTok", value: "TikTok" },
];

const showcaseOffsets = [-2, -1, 0, 1, 2] as const;

function formatDate(date: string) {
  const [year, month, day] = date.split("-");
  const months = [
    "ene.",
    "feb.",
    "mar.",
    "abr.",
    "may.",
    "jun.",
    "jul.",
    "ago.",
    "sep.",
    "oct.",
    "nov.",
    "dic.",
  ];
  const monthIndex = Number(month) - 1;
  return `${day} de ${months[monthIndex] ?? month} de ${year}`;
}

function getWrappedIndex(length: number, center: number, offset: number) {
  return (center + offset + length) % length;
}

function ShowcaseCard({
  item,
  state,
}: {
  item: MediaItem;
  state: "far" | "near" | "main";
}) {
  const isMain = state === "main";
  const width = isMain ? "w-[248px]" : state === "near" ? "w-[184px]" : "w-[138px]";
  const scale = isMain ? "scale-100" : state === "near" ? "scale-[0.9]" : "scale-[0.78]";
  const opacity = isMain ? "opacity-100" : state === "near" ? "opacity-80" : "opacity-50";
  const translate = isMain ? "translate-y-0" : state === "near" ? "translate-y-10" : "translate-y-16";

  return (
    <div
      className={`relative ${width} ${scale} ${opacity} ${translate} transform transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]`}
    >
      <div
        className={`rounded-[2rem] border p-3 ${
          isMain
            ? "border-[#3D8D86] bg-[linear-gradient(180deg,#1D5F5B,#2C7770)] shadow-[0_26px_70px_rgba(0,0,0,0.34)]"
            : "border-white/10 bg-[linear-gradient(180deg,#183A38,#214A47)]"
        }`}
      >
        <div className="relative overflow-hidden rounded-[1.45rem] border border-white/10 bg-[linear-gradient(180deg,#e5ebf1,#f7fbff)]">
          <div className="aspect-[9/16]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(6,18,29,0.72),transparent)]" />

          <div className="absolute left-3 top-3 right-3 flex items-center justify-between gap-2">
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white"
              style={{ backgroundColor: item.accent }}
            >
              {item.platform}
            </span>
            {isMain ? (
              <span className="rounded-full border border-white/16 bg-white/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                Activo
              </span>
            ) : null}
          </div>

          {isMain ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#27B1B8] text-2xl text-white shadow-[0_18px_38px_rgba(237,132,53,0.34)]">
                ▶
              </div>
            </div>
          ) : null}

          <div className="absolute inset-x-0 bottom-0 p-3">
            <div className="rounded-[1rem] border border-white/12 bg-[#101819]/82 p-3 backdrop-blur">
              <p
                className={`font-semibold leading-tight text-white ${
                  isMain ? "text-sm" : "line-clamp-2 text-xs"
                }`}
              >
                {item.title}
              </p>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/56">
                {formatDate(item.publishedAt)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MediaShowcase({ items }: MediaShowcaseProps) {
  const [activePlatform, setActivePlatform] = useState<MediaPlatform>("YouTube");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const dragStartX = useRef<number | null>(null);

  const filteredItems = useMemo(
    () => items.filter((item) => item.platform === activePlatform),
    [items, activePlatform],
  );

  const activeItem = filteredItems[activeIndex] ?? filteredItems[0] ?? null;

  const move = (direction: "left" | "right") => {
    if (filteredItems.length === 0) return;
    setActiveIndex((current) =>
      direction === "right"
        ? (current + 1) % filteredItems.length
        : (current - 1 + filteredItems.length) % filteredItems.length,
    );
  };

  const startDrag = (clientX: number) => {
    dragStartX.current = clientX;
  };

  const endDrag = (clientX: number) => {
    if (dragStartX.current === null) return;
    const delta = clientX - dragStartX.current;
    if (Math.abs(delta) > 70) {
      move(delta < 0 ? "right" : "left");
    }
    dragStartX.current = null;
  };

  return (
    <section className="relative mx-auto max-w-[1440px] px-6 pb-20">
      <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.24)] backdrop-blur">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#35C7C0]">
              Tips y videos
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-[0.92] tracking-[-0.07em] text-white md:text-6xl">
              Contenido vertical para seguir descubriendo
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/68 md:text-lg">
              Título arriba, plataformas al frente y un showcase vertical con
              navegación por swipe para que se sienta más vivo.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {platforms.map((platform) => {
              const isActive = platform.value === activePlatform;

              return (
                <button
                  key={platform.value}
                  type="button"
                  onClick={() => {
                    setActivePlatform(platform.value);
                    setActiveIndex(0);
                  }}
                  className={`rounded-full px-5 py-3 text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-[#27B1B8] text-white shadow-[0_16px_36px_rgba(237,132,53,0.28)]"
                      : "border border-white/10 bg-white/6 text-white/78 hover:bg-white hover:text-[#0C535B]"
                  }`}
                >
                  {platform.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-[#35C7C0]/18 bg-[#35C7C0]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A7D8D3]">
              {activePlatform}
            </span>
            <span className="text-sm text-white/58">
              {filteredItems.length > 0
                ? `${filteredItems.length} publicaciones visibles`
                : "Sin publicaciones por ahora"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => move("left")}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white transition-colors duration-200 hover:bg-white hover:text-[#0C535B]"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => move("right")}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white transition-colors duration-200 hover:bg-white hover:text-[#0C535B]"
            >
              →
            </button>
          </div>
        </div>

        {activeItem ? (
          <div className="mt-10">
            <div
              className="hidden select-none items-start justify-center gap-5 rounded-[2.2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] px-6 py-10 md:flex"
              onPointerDown={(event) => {
                startDrag(event.clientX);
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerUp={(event) => endDrag(event.clientX)}
              onPointerCancel={() => {
                dragStartX.current = null;
              }}
              style={{ touchAction: "pan-y" }}
            >
              {showcaseOffsets.map((offset) => {
                const item = filteredItems[getWrappedIndex(filteredItems.length, activeIndex, offset)];
                if (!item) return null;

                const state =
                  offset === 0 ? "main" : Math.abs(offset) === 1 ? "near" : "far";

                return (
                  <button
                    key={`${item.id}-${offset}`}
                    type="button"
                    onClick={() => {
                      if (offset === 0) {
                        setIsPlayerOpen(true);
                        return;
                      }
                      setActiveIndex(getWrappedIndex(filteredItems.length, activeIndex, offset));
                    }}
                    className="block"
                  >
                    <ShowcaseCard item={item} state={state} />
                  </button>
                );
              })}
            </div>

            <div className="mt-6 hidden md:block">
              <div className="mx-auto max-w-[720px] rounded-[1.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] px-6 py-4 text-center shadow-[0_20px_50px_rgba(0,0,0,0.16)]">
                <div className="flex flex-wrap justify-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/78">
                    {activeItem.platform}
                  </span>
                  <span className="rounded-full border border-[#35C7C0]/18 bg-[#35C7C0]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A7D8D3]">
                    {activeItem.category}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">
                    {formatDate(activeItem.publishedAt)}
                  </span>
                </div>

                <h2 className="mt-3 text-xl font-semibold leading-[1.08] tracking-[-0.04em] text-white">
                  {activeItem.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/58">
                  {activeItem.description}
                </p>

                <div className="mt-4 flex justify-center gap-3">
                  <Link
                    href={activeItem.href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-[#27B1B8] px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#1E969B]"
                  >
                    Ver publicación
                  </Link>
                  <button
                    type="button"
                    onClick={() => setIsPlayerOpen(true)}
                    className="rounded-full border border-white/10 bg-white/6 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white hover:text-[#0C535B]"
                  >
                    Reproducir aquí
                  </button>
                </div>
              </div>
            </div>

            <div className="md:hidden">
              <div className="flex gap-4 overflow-x-auto pb-3">
                {filteredItems.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveIndex(index);
                      setIsPlayerOpen(true);
                    }}
                    className="shrink-0"
                  >
                    <ShowcaseCard item={item} state="main" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 rounded-[1.8rem] border border-dashed border-white/10 bg-white/4 px-6 py-12 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/46">
              {activePlatform}
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">
              Próximamente
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-8 text-white/62">
              Dejé la estructura lista para esta plataforma. Apenas me pases los
              enlaces reales, aparece aquí con el mismo formato vertical.
            </p>
          </div>
        )}
      </div>

      {activeItem && isPlayerOpen ? (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-[#020812]/82 px-4 py-6 backdrop-blur-sm">
          <div className="relative w-full max-w-[360px] rounded-[2rem] border border-white/10 bg-[#091726] p-3 shadow-[0_28px_90px_rgba(0,0,0,0.42)]">
            <button
              type="button"
              onClick={() => setIsPlayerOpen(false)}
              className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white transition-colors duration-200 hover:bg-white hover:text-[#0C535B]"
            >
              Cerrar
            </button>

            <div className="overflow-hidden rounded-[1.7rem] bg-[#050d16] p-3 pt-12">
              <div className="aspect-[9/16] overflow-hidden rounded-[1.3rem] bg-black">
                <iframe
                  src={`${activeItem.embedUrl}?autoplay=1&rel=0`}
                  title={activeItem.title}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="eager"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
