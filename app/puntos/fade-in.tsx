"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function FadeIn({
  children,
  delay = 0,
  direction = "up",
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  direction?: "up" | "left" | "right" | "none";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const translateMap = { up: "translateY(32px)", left: "translateX(-32px)", right: "translateX(32px)", none: "none" };
    const initial = translateMap[direction];

    el.style.opacity = "0";
    el.style.transform = initial === "none" ? "" : initial;
    el.style.transition = `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = "1";
          el.style.transform = "";
          observer.disconnect();
        }
      },
      { threshold: 0.12 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, direction]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

export function StaggerList({
  children,
  baseDelay = 0,
  step = 80,
  direction = "up",
}: {
  children: ReactNode[];
  baseDelay?: number;
  step?: number;
  direction?: "up" | "left" | "right" | "none";
}) {
  return (
    <>
      {children.map((child, i) => (
        <FadeIn key={i} delay={baseDelay + i * step} direction={direction}>
          {child}
        </FadeIn>
      ))}
    </>
  );
}
