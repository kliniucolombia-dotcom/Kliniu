"use client";

import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";

function describeArc(
  cx: number, cy: number, r: number,
  startDeg: number, endDeg: number,
): string {
  const rad = (d: number) => ((d - 90) * Math.PI) / 180;
  const sx = cx + r * Math.cos(rad(startDeg));
  const sy = cy + r * Math.sin(rad(startDeg));
  const ex = cx + r * Math.cos(rad(endDeg));
  const ey = cy + r * Math.sin(rad(endDeg));
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M${cx},${cy} L${sx},${sy} A${r},${r},0,${large},1,${ex},${ey}Z`;
}

const prizes = [
  { label: "20%",    detail: "de descuento", color: "#073F43", text: "#ffffff", isBlank: false },
  { label: "😔",     detail: "Sin premio",   color: "#d4d4d4", text: "#888888", isBlank: true  },
  { label: "30%",    detail: "de descuento", color: "#1B9CA1", text: "#ffffff", isBlank: false },
  { label: "😔",     detail: "Sin premio",   color: "#e8e8e8", text: "#999999", isBlank: true  },
  { label: "25%",    detail: "de descuento", color: "#073F43", text: "#ffffff", isBlank: false },
  { label: "😔",     detail: "Sin premio",   color: "#d4d4d4", text: "#888888", isBlank: true  },
  { label: "Envío",  detail: "gratis",       color: "#BFEFF0", text: "#073F43", isBlank: false },
  { label: "18%",    detail: "de descuento", color: "#1B9CA1", text: "#ffffff", isBlank: false },
  { label: "😔",     detail: "Sin premio",   color: "#e8e8e8", text: "#999999", isBlank: true  },
  { label: "15%",    detail: "de descuento", color: "#FFFFFF", text: "#073F43", isBlank: false },
];

export default function OfferRoulette() {
  const [mounted, setMounted] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const launchConfetti = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const colors = ["#27B1B8", "#0C535B", "#FFD000", "#FF6B00", "#ffffff", "#BFEFF0", "#073F43", "#FF9500"];
    const count = 160;
    const particles = Array.from({ length: count }, () => ({
      x: canvas.width * (0.2 + Math.random() * 0.6),
      y: canvas.height * 0.45,
      vx: (Math.random() - 0.5) * 14,
      vy: -(Math.random() * 18 + 6),
      color: colors[Math.floor(Math.random() * colors.length)],
      w: Math.random() * 10 + 5,
      h: Math.random() * 5 + 3,
      rot: Math.random() * 360,
      rotV: (Math.random() - 0.5) * 8,
      alpha: 1,
    }));

    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.45;
        p.rot += p.rotV;
        p.alpha = Math.max(0, 1 - frame / 120);
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (frame < 130) rafRef.current = requestAnimationFrame(animate);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    cancelAnimationFrame(rafRef.current);
    animate();
  }, []);

  useEffect(() => {
    setMounted(true);
    const update = () => setIsNarrow(window.innerWidth < 820);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const segmentAngle = 360 / prizes.length;

  if (!mounted || !isOpen) return null;

  const wheelSize = isNarrow ? "min(72vw, 320px)" : 360;
  const selectedPrize = selectedIndex === null ? null : prizes[selectedIndex];
  const noMoreAttempts = attemptsLeft === 0 && !isSpinning;

  function spinWheel() {
    if (isSpinning || attemptsLeft === 0) return;

    const nextIndex = Math.floor(Math.random() * prizes.length);
    const targetAngle = (360 - nextIndex * segmentAngle) % 360;
    const currentAngle = rotation % 360;
    const delta = (targetAngle - currentAngle + 360) % 360;

    setSelectedIndex(null);
    setIsSpinning(true);
    setRotation(rotation + 1800 + delta);

    window.setTimeout(() => {
      const prize = prizes[nextIndex];
      setSelectedIndex(nextIndex);
      setIsSpinning(false);
      setAttemptsLeft((prev) => prev - 1);
      if (!prize.isBlank) {
        launchConfetti();
        const isShipping = prize.detail === "gratis";
        const labelClean = prize.label
          .normalize("NFD").replace(/[̀-ͯ]/g, "")
          .replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        const code = isShipping ? "KLINIU-ENVIOGRATIS" : `KLINIU-${labelClean}OFF`;
        localStorage.setItem("kliniu_prize", JSON.stringify({
          label: prize.label,
          detail: prize.detail,
          code,
          expiresAt: Date.now() + 12 * 60 * 60 * 1000,
        }));
      }
    }, 2800);
  }

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflowY: "auto",
        padding: "24px",
        background: "rgba(5,16,23,0.78)",
        backdropFilter: "blur(10px)",
      }}
    >
      <section
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: isNarrow ? "1fr" : "0.9fr 1.1fr",
          gap: 20,
          width: "min(920px, calc(100vw - 48px))",
          maxHeight: "calc(100vh - 48px)",
          overflow: "hidden",
          borderRadius: 24,
          background: "#ffffff",
          padding: isNarrow ? 20 : 28,
          boxShadow: "0 30px 90px rgba(5,16,23,0.28)",
        }}
      >
        {/* Canvas confeti */}
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 30,
          }}
        />
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="Cerrar ruleta"
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-2xl font-bold leading-none text-[#4f545a] shadow-sm transition-colors hover:text-[#0C535B]"
        >
          ×
        </button>

        <div className="flex min-h-0 flex-col items-center justify-center md:order-2">
          <div
            className="relative shrink-0"
            style={{ width: wheelSize, height: wheelSize }}
          >
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: 4,
                zIndex: 20,
                width: 56,
                height: 56,
                transform: "translate(-50%, -8px)",
                clipPath: "polygon(50% 100%, 0 0, 100% 0)",
                border: "6px solid #ffffff",
                borderRadius: 14,
                background: "#1B9CA1",
                boxShadow: "0 8px 18px rgba(5,16,23,0.22)",
              }}
            />

            <svg
              viewBox="0 0 360 360"
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                transform: `rotate(${rotation}deg)`,
                transition: "transform 2800ms cubic-bezier(0.16, 0.84, 0.22, 1)",
                filter: "drop-shadow(0 18px 38px rgba(5,16,23,0.18))",
                overflow: "visible",
              }}
            >
              {prizes.map((prize, i) => (
                <path
                  key={i}
                  d={describeArc(180, 180, 180, i * segmentAngle - segmentAngle / 2, (i + 1) * segmentAngle - segmentAngle / 2)}
                  fill={prize.color}
                  stroke="white"
                  strokeWidth="2.5"
                />
              ))}
              {prizes.map((prize, i) => {
                const cA = i * segmentAngle;
                const rT = 118;
                const tx = 180 + rT * Math.sin((cA * Math.PI) / 180);
                const ty = 180 - rT * Math.cos((cA * Math.PI) / 180);
                return (
                  <g key={`lbl-${i}`} transform={`translate(${tx},${ty}) rotate(${cA})`}>
                    <text x="0" y="-6" textAnchor="middle" dominantBaseline="middle" fill={prize.text} fontSize="13" fontWeight="800" fontFamily="system-ui,sans-serif">
                      {prize.label}
                    </text>
                    <text x="0" y="8" textAnchor="middle" dominantBaseline="middle" fill={prize.text} fontSize="7.5" fontFamily="system-ui,sans-serif">
                      {prize.detail}
                    </text>
                  </g>
                );
              })}
              <circle cx="180" cy="180" r="171" fill="none" stroke="rgba(255,255,255,0.96)" strokeWidth="4" />
              <circle cx="180" cy="180" r="79" fill="white" />
              <circle cx="180" cy="180" r="175" fill="none" stroke="#1B9CA1" strokeWidth="10" />
            </svg>

            <div
              className="flex items-center justify-center overflow-hidden"
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                zIndex: 10,
                width: "36%",
                height: "36%",
                transform: "translate(-50%, -50%)",
                borderRadius: "999px",
                background: "#ffffff",
              }}
            >
              <Image
                src="/foca-ok-kliniu-original.png"
                alt="Foca Kliniu"
                width={260}
                height={230}
                className="h-[115%] w-[115%] object-contain object-bottom"
                priority
              />
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-col justify-center pr-0 md:order-1 md:pr-4">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#27B1B8]">
            Oferta sorpresa
          </p>
          <h2 className="mt-3 text-4xl font-black leading-[0.95] tracking-tight text-[#073F43] md:text-[44px]">
            Gira la ruleta
            <span className="block text-[#27B1B8]">y gana</span>
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-6 text-[#607175]">
            Descubre tu beneficio de bienvenida para productos Kliniu.
          </p>

          {/* Indicador de intentos */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs font-bold text-[#607175]">Intentos:</span>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`h-3 w-3 rounded-full transition-all duration-300 ${
                  i < attemptsLeft
                    ? "bg-[#27B1B8] shadow-[0_0_6px_rgba(39,177,184,0.6)]"
                    : "bg-black/10"
                }`}
              />
            ))}
            <span className="ml-1 text-xs text-[#607175]">
              {attemptsLeft === 0 ? "Sin intentos" : `${attemptsLeft} restante${attemptsLeft !== 1 ? "s" : ""}`}
            </span>
          </div>

          {/* Panel resultado */}
          {selectedPrize && !selectedPrize.isBlank ? (
            /* ── GANÓ ── */
            <div className="mt-5 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg,#073F43,#0C535B)", boxShadow: "0 16px 40px rgba(7,63,67,0.45)" }}>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <div className="flex items-center gap-1.5">
                  <span className="animate-bounce text-base">🎉</span>
                  <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.24em", color: "#27B1B8", textTransform: "uppercase" }}>¡Felicidades! Ganaste</span>
                  <span className="animate-bounce text-base" style={{ animationDelay: "0.2s" }}>🎊</span>
                </div>
                <span style={{ fontSize: 10, fontWeight: 900, background: "rgba(39,177,184,0.25)", color: "#BFEFF0", borderRadius: 999, padding: "3px 10px" }}>✓ ACTIVO</span>
              </div>
              {/* Premio */}
              <div className="px-4 py-4">
                {selectedPrize.detail === "gratis" ? (
                  <div className="flex items-center gap-3">
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>🚚</div>
                    <div>
                      <p style={{ fontSize: 24, fontWeight: 900, color: "#fff", lineHeight: 1.1 }}>Envío gratis</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#BFEFF0", marginTop: 2 }}>en tu próxima compra</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: 52, fontWeight: 900, color: "#fff", lineHeight: 1, letterSpacing: "-1px" }}>{selectedPrize.label}</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "#BFEFF0", marginTop: 2 }}>{selectedPrize.detail}</p>
                  </div>
                )}
                {/* Urgencia */}
                <div style={{ marginTop: 14, background: "rgba(255,209,0,0.12)", borderRadius: 12, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14 }}>⏰</span>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.8)", margin: 0 }}>
                    Válido por <span style={{ color: "#FFD000" }}>12 horas</span> · Regístrate para no perderlo
                  </p>
                </div>
              </div>
            </div>
          ) : selectedPrize?.isBlank ? (
            /* ── SIN PREMIO ── */
            <div className="mt-5 rounded-2xl border border-black/8 bg-white p-5">
              <div className="flex items-center gap-3">
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>😔</div>
                <div>
                  <p style={{ fontWeight: 800, fontSize: 15, color: "#222" }}>Esta vez no fue</p>
                  <p style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                    {attemptsLeft > 0
                      ? `Aún tienes ${attemptsLeft} intento${attemptsLeft !== 1 ? "s" : ""}. ¡Sigue intentándolo!`
                      : "Se acabaron los intentos. ¡Suerte la próxima!"}
                  </p>
                </div>
              </div>
            </div>
          ) : noMoreAttempts ? (
            /* ── SIN INTENTOS ── */
            <div className="mt-5 rounded-2xl border border-black/8 bg-white p-5">
              <div className="flex items-center gap-3">
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>🎯</div>
                <div>
                  <p style={{ fontWeight: 800, fontSize: 15, color: "#222" }}>Se acabaron los intentos</p>
                  <p style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Regístrate para participar la próxima vez.</p>
                </div>
              </div>
            </div>
          ) : (
            /* ── ESTADO INICIAL ── */
            <div className="mt-5 rounded-2xl p-4" style={{ background: "#EAF8F6", border: "1px solid rgba(39,177,184,0.2)" }}>
              <div className="flex items-center gap-3">
                <div style={{ width: 42, height: 42, borderRadius: 12, background: "#27B1B8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🎁</div>
                <p style={{ fontSize: 13, color: "#0C535B", fontWeight: 600, lineHeight: 1.5 }}>
                  Presiona el botón y gira la ruleta.<br />
                  <span style={{ fontWeight: 800 }}>Tienes 3 intentos</span> para ganar un descuento.
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={spinWheel}
              disabled={isSpinning || attemptsLeft === 0 || (!selectedPrize?.isBlank && !!selectedPrize)}
              className="inline-flex flex-1 items-center justify-center rounded-full bg-[#27B1B8] px-6 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(39,177,184,0.28)] transition-colors hover:bg-[#1E969B] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSpinning ? "Girando..." : attemptsLeft === 0 ? "Sin intentos" : selectedPrize?.isBlank ? "Girar otra vez" : selectedPrize ? "¡Ya ganaste!" : "Girar ruleta"}
            </button>
            <Link
              href="/registro"
              onClick={() => setIsOpen(false)}
              className="inline-flex flex-1 items-center justify-center rounded-full px-6 py-3 text-sm font-black transition-opacity hover:opacity-90"
              style={
                selectedPrize && !selectedPrize.isBlank
                  ? { background: "linear-gradient(90deg, #FF6B00, #FFD000)", color: "#fff", boxShadow: "0 10px 28px rgba(255,107,0,0.35)" }
                  : { border: "1px solid rgba(0,0,0,0.1)", background: "#fff", color: "#0C535B" }
              }
            >
              {selectedPrize && !selectedPrize.isBlank ? "¡Reclamar premio!" : "Regístrate"}
            </Link>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}
