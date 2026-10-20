import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MdDirectionsCar, MdTwoWheeler, MdAirportShuttle, MdLocalShipping } from "react-icons/md";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GMaps = { maps: any };
export type StopResult = "DELIVERED" | "FAILED" | null;

const VEHICLE_ICON = { CAMIONETA: MdDirectionsCar, MOTO: MdTwoWheeler, FURGON: MdAirportShuttle, CAMION: MdLocalShipping };

const svgIcon = (google: GMaps, svg: string, size: number) => ({
  url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
  scaledSize: new google.maps.Size(size, size),
  anchor: new google.maps.Point(size / 2, size / 2),
});

// Marcador redondo con el ícono del tipo de vehículo (los mismos íconos de las tarjetas del panel).
export function vehicleIcon(google: GMaps, type: string, color: string) {
  const Icon = VEHICLE_ICON[type as keyof typeof VEHICLE_ICON] ?? MdLocalShipping;
  const glyph = renderToStaticMarkup(createElement(Icon, { size: 22, color: "#fff" }));
  return svgIcon(google, `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44"><circle cx="22" cy="22" r="20" fill="${color}" stroke="#fff" stroke-width="3"/><g transform="translate(11 11)">${glyph}</g></svg>`, 44);
}

// Parada numerada: verde entregada, ámbar no entregada, turquesa la próxima, gris pendiente.
export const stopColor = (result: StopResult, isNext: boolean) => (result === "DELIVERED" ? "#16A34A" : result === "FAILED" ? "#D97706" : isNext ? "#27B1B8" : "#64748B");
export function stopIcon(google: GMaps, n: number, color: string) {
  return svgIcon(google, `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="14" fill="${color}" stroke="#fff" stroke-width="2.5"/><text x="16" y="21" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" font-weight="700" fill="#fff">${n}</text></svg>`, 32);
}
