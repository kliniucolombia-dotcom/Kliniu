import type { CSSProperties } from "react";
import { preload } from "react-dom";
import { getImageProps } from "next/image";

const EMPTY_GIF = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
// Lo que el optimizador de Next acepta: archivos de /public y Supabase (next.config remotePatterns).
const OPTIMIZABLE = /^\/|^https:\/\/[^/]+\.supabase\.co\//;

export const MOBILE_ONLY = "(max-width: 767px)";
export const DESKTOP_ONLY = "(min-width: 768px)";

/**
 * Banner servido por el optimizador de Next (WebP al ancho de la pantalla) que solo se
 * descarga si `media` coincide: el celular no baja el arte de escritorio ni al revés.
 */
export default function BannerImg({
  src,
  media,
  alt,
  sizes = "100vw",
  eager = false,
  className,
  style,
}: {
  src: string;
  media: string;
  alt: string;
  sizes?: string;
  eager?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const srcSet = OPTIMIZABLE.test(src) ? getImageProps({ src, alt, fill: true, sizes }).props.srcSet : src;
  // La portada llega por streaming y el banner queda al final del HTML: el preload lo adelanta.
  if (eager) preload(src, { as: "image", imageSrcSet: srcSet, imageSizes: sizes, media, fetchPriority: "high" });
  return (
    <picture className="contents">
      <source media={media} srcSet={srcSet} sizes={sizes} />
      <img
        src={EMPTY_GIF}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : undefined}
        decoding="async"
        className={className}
        style={style}
      />
    </picture>
  );
}
