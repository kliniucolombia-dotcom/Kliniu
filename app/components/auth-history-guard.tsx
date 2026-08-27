"use client";

import { useEffect } from "react";

const PROTECTED_PREFIXES = [
  "/admin",
  "/empleado",
  "/empaque",
  "/imprimir-cotizacion",
  "/mi-cuenta",
  "/nomina/desprendible",
  "/panel",
];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export default function AuthHistoryGuard() {
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted && isProtectedPath(window.location.pathname)) {
        window.location.reload();
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return null;
}
