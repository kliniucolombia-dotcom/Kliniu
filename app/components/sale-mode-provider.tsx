"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type SaleMode = "cart" | "whatsapp";

const SaleModeContext = createContext<SaleMode>("cart");

export function SaleModeProvider({
  children,
  initialMode = "cart",
}: {
  children: ReactNode;
  initialMode?: SaleMode;
}) {
  const [mode, setMode] = useState<SaleMode>(initialMode);

  useEffect(() => {
    fetch("/api/config/sale-mode")
      .then((r) => r.json())
      .then((d: { mode?: SaleMode }) => {
        if (d.mode === "whatsapp" || d.mode === "cart") setMode(d.mode);
      })
      .catch(() => {});
  }, []);

  return <SaleModeContext.Provider value={mode}>{children}</SaleModeContext.Provider>;
}

export function useSaleMode() {
  return useContext(SaleModeContext);
}
