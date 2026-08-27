"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type SaleMode = "cart" | "whatsapp";

type SaleModeContextValue = {
  mode: SaleMode;
  updateMode: (mode: SaleMode) => void;
};

const SALE_MODE_CHANNEL = "kliniu-sale-mode";
const SaleModeContext = createContext<SaleModeContextValue>({
  mode: "cart",
  updateMode: () => {},
});

export function SaleModeProvider({
  children,
  initialMode = "cart",
}: {
  children: ReactNode;
  initialMode?: SaleMode;
}) {
  const [mode, setMode] = useState<SaleMode>(initialMode);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const receivedExternalUpdate = useRef(false);

  const updateMode = useCallback((nextMode: SaleMode) => {
    setMode(nextMode);
    channelRef.current?.postMessage(nextMode);
  }, []);

  useEffect(() => {
    fetch("/api/config/sale-mode")
      .then((r) => r.json())
      .then((d: { mode?: SaleMode }) => {
        if (!receivedExternalUpdate.current && (d.mode === "whatsapp" || d.mode === "cart")) setMode(d.mode);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!("BroadcastChannel" in window)) return;

    const channel = new BroadcastChannel(SALE_MODE_CHANNEL);
    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent<unknown>) => {
      if (event.data === "whatsapp" || event.data === "cart") {
        receivedExternalUpdate.current = true;
        setMode(event.data);
      }
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, []);

  return <SaleModeContext.Provider value={{ mode, updateMode }}>{children}</SaleModeContext.Provider>;
}

export function useSaleMode() {
  return useContext(SaleModeContext).mode;
}

export function useUpdateSaleMode() {
  return useContext(SaleModeContext).updateMode;
}
