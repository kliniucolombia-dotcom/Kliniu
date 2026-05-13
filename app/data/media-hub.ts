export type MediaPlatform = "YouTube" | "Instagram" | "TikTok";

export type MediaItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  publishedAt: string;
  platform: MediaPlatform;
  href: string;
  embedUrl: string;
  accent: string;
};

const youtubeShortA = {
  href: "https://youtube.com/shorts/H2N36FMFLM4?si=IccmFXnNqh8A_Diq",
  embedUrl: "https://www.youtube.com/embed/H2N36FMFLM4",
};

const youtubeShortB = {
  href: "https://youtube.com/shorts/r3U9S1ipikQ?si=od8vNKwZrkoXl-8o",
  embedUrl: "https://www.youtube.com/embed/r3U9S1ipikQ",
};

export const mediaHubItems: MediaItem[] = [
  {
    id: "media-01",
    title: "Tip técnico para revisar motor y transmisión",
    description:
      "Contenido corto para orientar mejor al cliente cuando llega con una falla o busca una referencia puntual.",
    category: "Motores y ventiladores",
    publishedAt: "2026-04-09",
    platform: "YouTube",
    accent: "#27B1B8",
    ...youtubeShortA,
  },
  {
    id: "media-02",
    title: "Consejo rápido de diagnóstico y mantenimiento",
    description:
      "Ideal para construir confianza y acompañar la compra con contenido útil y fácil de consumir.",
    category: "Tips de taller",
    publishedAt: "2026-04-08",
    platform: "YouTube",
    accent: "#0C535B",
    ...youtubeShortB,
  },
  {
    id: "media-03",
    title: "Cómo detectar una falla antes de desmontar",
    description:
      "Perfecto para clientes que llegan con dudas y necesitan una primera orientación rápida antes de comprar.",
    category: "Diagnóstico",
    publishedAt: "2026-04-07",
    platform: "YouTube",
    accent: "#27B1B8",
    ...youtubeShortA,
  },
  {
    id: "media-04",
    title: "Tip visual para explicar un cambio de repuesto",
    description:
      "Una pieza de contenido útil para vender con contexto, no solo con precio.",
    category: "Ventas y soporte",
    publishedAt: "2026-04-06",
    platform: "YouTube",
    accent: "#0C535B",
    ...youtubeShortB,
  },
  {
    id: "media-05",
    title: "Mini guía para orientar al cliente en segundos",
    description:
      "Pensado para procesos de atención más ágiles y más cercanos desde la web o WhatsApp.",
    category: "Atención al cliente",
    publishedAt: "2026-04-05",
    platform: "YouTube",
    accent: "#27B1B8",
    ...youtubeShortA,
  },
  {
    id: "media-06",
    title: "Error común al revisar una pieza de taller",
    description:
      "Contenido corto para educar y construir confianza con una comunicación más práctica.",
    category: "Tips de taller",
    publishedAt: "2026-04-04",
    platform: "YouTube",
    accent: "#0C535B",
    ...youtubeShortB,
  },
  {
    id: "media-07",
    title: "Qué revisar primero antes de reemplazar una parte",
    description:
      "Una pieza ideal para enganchar clientes que aún no saben exactamente qué necesitan.",
    category: "Diagnóstico",
    publishedAt: "2026-04-03",
    platform: "YouTube",
    accent: "#27B1B8",
    ...youtubeShortA,
  },
  {
    id: "media-08",
    title: "Tip técnico para vender con más seguridad",
    description:
      "Útil para acompañar fichas, productos y conversaciones de soporte con contenido corto.",
    category: "Ventas y soporte",
    publishedAt: "2026-04-02",
    platform: "YouTube",
    accent: "#0C535B",
    ...youtubeShortB,
  },
  {
    id: "media-09",
    title: "Cómo explicar una solución de forma más clara",
    description:
      "Diseñado para que el cliente sienta respaldo y claridad durante el proceso de compra.",
    category: "Atención al cliente",
    publishedAt: "2026-04-01",
    platform: "YouTube",
    accent: "#27B1B8",
    ...youtubeShortA,
  },
  {
    id: "media-10",
    title: "Mantenimiento rápido para evitar fallas repetidas",
    description:
      "Una pieza corta que ayuda a transformar una duda simple en una compra mejor informada.",
    category: "Tips de taller",
    publishedAt: "2026-03-31",
    platform: "YouTube",
    accent: "#0C535B",
    ...youtubeShortB,
  },
];
