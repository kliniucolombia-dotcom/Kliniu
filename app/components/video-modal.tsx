"use client";

import { useState } from "react";

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

  const reelId = activeHref ? getReelId(activeHref) : null;

  return (
    <>
      <div className="motion-list scrollbar-hidden flex justify-center gap-4 overflow-x-auto px-2 pb-2">
        {videos.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setActiveHref(v.href)}
            className="motion-card interactive-lift group flex h-44 w-40 shrink-0 cursor-pointer flex-col items-center justify-end overflow-hidden rounded-2xl border border-black/8 bg-white transition-shadow hover:shadow-md"
          >
            {v.thumb ? (
              <div className="relative flex flex-1 w-full items-center justify-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={v.thumb}
                  alt={v.titulo}
                  className="image-lift h-full w-full object-cover object-center"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/15 transition-colors group-hover:bg-black/25">
                  <div className="pulse-ring flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-[#27B1B8] shadow-md transition-transform group-hover:scale-110">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 translate-x-0.5" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#27B1B8] text-[#27B1B8]">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 translate-x-0.5" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
              </div>
            )}
            <p className="w-full bg-white px-2 py-2 text-center text-xs font-medium text-[#0C535B]">{v.titulo}</p>
          </button>
        ))}
      </div>

      {activeHref && reelId && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
          onClick={() => setActiveHref(null)}
        >
          <div
            className="relative w-full max-w-sm overflow-hidden rounded-t-2xl bg-black sm:rounded-2xl"
            style={{ maxHeight: "90dvh" }}
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
              className="w-full"
              style={{ height: "min(600px, 88dvh)" }}
              frameBorder="0"
              scrolling="no"
              allowTransparency
              allowFullScreen
            />
          </div>
        </div>
      )}
    </>
  );
}
