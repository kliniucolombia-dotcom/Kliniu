"use client";

import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";

type RouletteOffer = {
  slug: string;
  nombre: string;
  marca: string;
  descuento: string;
  imagen: string;
  precio: string;
};

type OfferRouletteProps = {
  offers: RouletteOffer[];
};

const wheelColors = [
  "#27B1B8",
  "#F57C2D",
  "#0C535B",
  "#F7C948",
];

const SEGMENT_NAMES = ["Yuly", "Bran", "Nico", "Dani"];

export default function OfferRoulette({ offers }: OfferRouletteProps) {
  const [mounted, setMounted] = useState(false);
  const [narrow, setNarrow] = useState(false);

  const rouletteOffers = useMemo(
    () =>
      offers.slice(0, 4).map((offer, index) => ({
        ...offer,
        segmentLabel: SEGMENT_NAMES[index],
      })),
    [offers],
  );

  const [isOpen, setIsOpen] = useState(rouletteOffers.length > 0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    setMounted(true);
    const check = () => setNarrow(window.innerWidth < 760);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!mounted || !isOpen || rouletteOffers.length === 0) return null;

  const selectedOffer =
    selectedIndex === null ? rouletteOffers[0] : rouletteOffers[selectedIndex];
  const segmentAngle = 360 / rouletteOffers.length;
  const wheelGradient = rouletteOffers
    .map((_, i) => {
      const start = i * segmentAngle;
      const end = (i + 1) * segmentAngle;
      return `${wheelColors[i % wheelColors.length]} ${start}deg ${end}deg`;
    })
    .join(", ");

  function spinWheel() {
    if (isSpinning) return;
    const nextIndex = Math.floor(Math.random() * rouletteOffers.length);
    const targetAngle = 360 - (nextIndex * segmentAngle + segmentAngle / 2);
    const currentAngle = rotation % 360;
    const delta = ((targetAngle - currentAngle) + 360) % 360;
    const nextRotation = rotation + 1440 + delta;
    setSelectedIndex(null);
    setIsSpinning(true);
    setRotation(nextRotation);
    window.setTimeout(() => {
      setSelectedIndex(nextIndex);
      setIsSpinning(false);
    }, 2300);
  }

  const wheelSize = narrow ? "240px" : "clamp(240px, 32vw, 320px)";

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "rgba(2,8,23,0.72)",
        backdropFilter: "blur(10px)",
      }}
    >
      <section
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: narrow ? "1fr" : "minmax(0,1.05fr) minmax(320px,0.95fr)",
          width: "min(940px, calc(100vw - 32px))",
          maxHeight: "min(720px, calc(100vh - 32px))",
          overflow: "hidden",
          borderRadius: "28px",
          background: "#ffffff",
          boxShadow: "0 28px 90px rgba(15,23,42,0.32)",
        }}
      >
        {/* Close */}
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="Cerrar ruleta de ofertas"
          style={{
            position: "absolute",
            right: 16,
            top: 16,
            zIndex: 20,
            display: "flex",
            height: 40,
            width: 40,
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid rgba(15,23,42,0.12)",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.94)",
            color: "#4f545a",
            fontSize: 22,
            fontWeight: 700,
            lineHeight: 1,
            boxShadow: "0 8px 20px rgba(15,23,42,0.12)",
            cursor: "pointer",
          }}
        >
          ×
        </button>

        {/* ── Stage (left) ── */}
        <div
          style={{
            position: "relative",
            display: "flex",
            minHeight: narrow ? "auto" : 520,
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            padding: narrow ? "34px 18px 30px" : "38px 24px",
            background: "#071f24",
            color: "#ffffff",
          }}
        >
          {/* bg glow */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 28% 18%, rgba(39,177,184,0.42), transparent 34%), radial-gradient(circle at 82% 82%, rgba(245,124,45,0.28), transparent 38%)",
            }}
          />

          {/* Heading */}
          <div style={{ position: "relative", marginBottom: 24, textAlign: "center" }}>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "#88f4f8",
              }}
            >
              Oferta sorpresa
            </p>
            <h2
              style={{
                margin: "12px 0 0",
                fontSize: "clamp(38px, 5vw, 56px)",
                fontWeight: 950,
                letterSpacing: "-0.04em",
                lineHeight: 0.92,
              }}
            >
              Gira y gana
            </h2>
          </div>

          {/* Wheel wrapper */}
          <div
            style={{
              position: "relative",
              height: wheelSize,
              width: wheelSize,
              flexShrink: 0,
              padding: 12,
              borderRadius: "999px",
              boxShadow: "0 22px 45px rgba(0,0,0,0.24)",
            }}
          >
            {/* Pointer */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: -7,
                zIndex: 10,
                height: 0,
                width: 0,
                transform: "translateX(-50%)",
                borderLeft: "16px solid transparent",
                borderRight: "16px solid transparent",
                borderTop: "30px solid #ffffff",
                filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.18))",
              }}
            />

            {/* Disc */}
            <div
              style={{
                position: "relative",
                height: "100%",
                width: "100%",
                border: "10px solid #ffffff",
                borderRadius: "999px",
                background: `conic-gradient(${wheelGradient})`,
                transform: `rotate(${rotation}deg)`,
                transition: "transform 2300ms cubic-bezier(0.18,0.8,0.18,1)",
              }}
            >
              {rouletteOffers.map((offer, index) => (
                <div
                  key={offer.slug}
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transformOrigin: "left center",
                    color: "#ffffff",
                    fontSize: 13,
                    fontWeight: 950,
                    letterSpacing: "0.04em",
                    textShadow: "0 1px 3px rgba(0,0,0,0.32)",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    transform: `rotate(${index * segmentAngle + segmentAngle / 2 - 90}deg) translateX(58px) rotate(90deg)`,
                  }}
                >
                  {offer.segmentLabel}
                </div>
              ))}

              {/* Center hub */}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  display: "flex",
                  height: 80,
                  width: 80,
                  alignItems: "center",
                  justifyContent: "center",
                  transform: "translate(-50%, -50%)",
                  border: "4px solid #ffffff",
                  borderRadius: "999px",
                  background: "#0c535b",
                  color: "#ffffff",
                  fontSize: 12,
                  fontWeight: 950,
                  textTransform: "uppercase",
                  boxShadow: "0 12px 24px rgba(0,0,0,0.22)",
                }}
              >
                Kliniu
              </div>
            </div>
          </div>

          {/* Spin button */}
          <button
            type="button"
            onClick={spinWheel}
            disabled={isSpinning}
            style={{
              position: "relative",
              display: "inline-flex",
              minWidth: 176,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 28,
              border: 0,
              borderRadius: "999px",
              background: "#f57c2d",
              color: "#ffffff",
              padding: "16px 30px",
              fontSize: 13,
              fontWeight: 950,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              boxShadow: "0 16px 32px rgba(245,124,45,0.35)",
              cursor: isSpinning ? "wait" : "pointer",
              opacity: isSpinning ? 0.72 : 1,
            }}
          >
            {isSpinning ? "Girando..." : "Girar ruleta"}
          </button>
        </div>

        {/* ── Result (right) ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: narrow ? "30px 22px" : "42px 36px",
            overflowY: "auto",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "#27b1b8",
            }}
          >
            Premio de hoy
          </p>
          <h3
            style={{
              margin: "12px 0 0",
              color: "#2f3d49",
              fontSize: "clamp(30px, 3vw, 44px)",
              fontWeight: 950,
              letterSpacing: "-0.04em",
              lineHeight: 0.96,
            }}
          >
            {selectedIndex === null
              ? "Gira para descubrir tu oferta"
              : `¡Le toca a ${selectedOffer.segmentLabel}!`}
          </h3>

          {/* Result body */}
          {selectedIndex === null ? (
            /* ── Antes de girar ── */
            <p style={{ margin: "20px 0 0", color: "#6e7379", fontSize: 14, lineHeight: 1.65 }}>
              Presiona girar y descubre quién es el afortunado de hoy.
            </p>
          ) : selectedOffer.segmentLabel === "Yuly" ? (
            /* ── Ganó Yuly → mensaje especial ── */
            <>
              <div
                style={{
                  marginTop: 28,
                  borderRadius: 22,
                  background: "linear-gradient(135deg, #fff0f6 0%, #ffe4f0 100%)",
                  border: "1px solid rgba(233,85,124,0.18)",
                  padding: "28px 24px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 52, lineHeight: 1 }}>🤰👶🎉</div>
                <p
                  style={{
                    margin: "16px 0 0",
                    fontSize: 28,
                    fontWeight: 950,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.1,
                    color: "#c0175f",
                  }}
                >
                  ¡Felicidades,<br />Yuly!
                </p>
                <p
                  style={{
                    margin: "12px 0 0",
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#2f3d49",
                    lineHeight: 1.4,
                  }}
                >
                  ¡Está embarazada! 🌸
                </p>
                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: 13,
                    color: "#6e7379",
                    lineHeight: 1.6,
                  }}
                >
                  Que sea una etapa llena de salud,<br />amor y muchas bendiciones.
                </p>
              </div>
              <button
                type="button"
                onClick={spinWheel}
                disabled={isSpinning}
                style={{
                  marginTop: 16,
                  display: "inline-flex",
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "999px",
                  padding: "13px 18px",
                  fontSize: 14,
                  fontWeight: 800,
                  border: "1px solid rgba(15,23,42,0.12)",
                  background: "#ffffff",
                  color: "#2f3d49",
                  cursor: isSpinning ? "wait" : "pointer",
                  opacity: isSpinning ? 0.72 : 1,
                }}
              >
                Girar otra vez
              </button>
            </>
          ) : (
            /* ── Ganó otro (Bran / Nico / Dani) ── */
            <>
              <div
                style={{
                  marginTop: 28,
                  border: "1px solid rgba(15,23,42,0.08)",
                  borderRadius: 22,
                  background: "#f7fbfb",
                  padding: 16,
                }}
              >
                <div style={{ display: "flex", gap: 16, flexDirection: narrow ? "column" : "row" }}>
                  <div
                    style={{
                      position: "relative",
                      height: 112,
                      width: narrow ? "100%" : 112,
                      flexShrink: 0,
                      overflow: "hidden",
                      borderRadius: 18,
                      background: "#ffffff",
                    }}
                  >
                    <Image
                      src={selectedOffer.imagen}
                      alt={selectedOffer.nombre}
                      fill
                      sizes="112px"
                      className="object-contain p-3"
                    />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.22em",
                        textTransform: "uppercase",
                        color: "#8b8d91",
                      }}
                    >
                      {selectedOffer.marca}
                    </p>
                    <p
                      style={{
                        margin: "9px 0 0",
                        color: "#2f3d49",
                        fontSize: 18,
                        fontWeight: 800,
                        lineHeight: 1.18,
                      }}
                    >
                      {selectedOffer.nombre}
                    </p>
                    <p
                      style={{
                        margin: "14px 0 0",
                        color: "#27b1b8",
                        fontSize: 26,
                        fontWeight: 950,
                      }}
                    >
                      {selectedOffer.precio}
                    </p>
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginTop: 16,
                  flexDirection: narrow ? "column" : "row",
                }}
              >
                <Link
                  href={`/producto/${selectedOffer.slug}`}
                  onClick={() => setIsOpen(false)}
                  style={{
                    display: "inline-flex",
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "999px",
                    padding: "13px 18px",
                    fontSize: 14,
                    fontWeight: 800,
                    textDecoration: "none",
                    background: "#0c535b",
                    color: "#ffffff",
                  }}
                >
                  Ver oferta
                </Link>
                <button
                  type="button"
                  onClick={spinWheel}
                  disabled={isSpinning}
                  style={{
                    display: "inline-flex",
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "999px",
                    padding: "13px 18px",
                    fontSize: 14,
                    fontWeight: 800,
                    border: "1px solid rgba(15,23,42,0.12)",
                    background: "#ffffff",
                    color: "#2f3d49",
                    cursor: isSpinning ? "wait" : "pointer",
                    opacity: isSpinning ? 0.72 : 1,
                  }}
                >
                  Girar otra vez
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
