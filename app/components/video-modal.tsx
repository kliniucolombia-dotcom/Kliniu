"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

function getReelId(href: string) {
  const match = href.match(/reel\/([^/?]+)/);
  return match ? match[1] : null;
}

interface Video {
  id: number;
  titulo: string;
  href: string;
  thumb?: string;
}

export default function VideoModal({ videos }: { videos: Video[] }) {
  const [activeHref, setActiveHref] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const reelId = activeHref ? getReelId(activeHref) : null;

  const modal = activeHref && reelId && (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4"
      onClick={() => setActiveHref(null)}
    >
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-black"
        style={{ maxHeight: "calc(100vh - 2rem)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setActiveHref(null)}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
        >
          ✕
        </button>
        <iframe
          src={`https://www.instagram.com/reel/${reelId}/embed/`}
          className="block w-full"
          style={{ height: "min(600px, calc(100vh - 2rem))" }}
          frameBorder="0"
          scrolling="no"
          allowTransparency
          allowFullScreen
        />
      </div>
    </div>
  );

  return (
    <>
      <div className="motion-list scrollbar-hidden flex justify-start gap-3 overflow-x-auto px-2 pb-2 sm:justify-center sm:gap-4">
        {videos.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setActiveHref(v.href)}
            className="interactive-lift group flex w-32 shrink-0 cursor-pointer flex-col overflow-hidden rounded-[14px] border border-[#e2e8e8] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#9bdddf] hover:shadow-[0_18px_36px_rgba(10,92,99,0.08)] sm:w-40"
          >
            {v.thumb ? (
              <div className="relative aspect-square w-full shrink-0 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={v.thumb}
                  alt={v.titulo}
                  className="image-lift h-full w-full object-cover object-center"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/15 transition-colors group-hover:bg-black/25">
                  <div className="pulse-ring flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#27B1B8] shadow-md transition-transform group-hover:scale-110 sm:h-12 sm:w-12">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 translate-x-0.5 sm:h-5 sm:w-5" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex aspect-square w-full shrink-0 items-center justify-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#27B1B8] text-[#27B1B8] sm:h-12 sm:w-12">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 translate-x-0.5 sm:h-5 sm:w-5" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
              </div>
            )}
            <p className="flex min-h-11 w-full flex-1 items-center justify-center bg-white px-2 py-1.5 text-center text-[11px] font-bold leading-[1.25] text-[#064f59] sm:text-xs">{v.titulo}</p>
          </button>
        ))}
      </div>

      {/* Portal necesario: el header tiene transform:translateY que rompe fixed positioning */}
      {mounted && modal && createPortal(modal, document.body)}
    </>
  );
}
