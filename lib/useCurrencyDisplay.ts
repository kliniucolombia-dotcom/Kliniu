"use client";
import { useEffect, useState, useCallback } from "react";
import { LATAM_CURRENCIES, type LatamCurrencyCode } from "@/lib/currencies";

const STORAGE_KEY = "calculadora-precio-currency";

export function useCurrencyDisplay() {
  const [currency, setCurrencyState] = useState<LatamCurrencyCode>("COP");
  const [rates, setRates] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && LATAM_CURRENCIES.some((c) => c.code === stored)) {
      setCurrencyState(stored as LatamCurrencyCode);
    }
    fetch("/api/exchange-rates")
      .then((r) => r.json())
      .then((d) => setRates(d.rates ?? {}))
      .catch(() => setRates({}));
  }, []);

  const setCurrency = useCallback((code: LatamCurrencyCode) => {
    setCurrencyState(code);
    localStorage.setItem(STORAGE_KEY, code);
  }, []);

  const factor = (() => {
    if (currency === "COP" || !rates) return 1;
    const target = rates[currency];
    const cop = rates.COP;
    if (!target || !cop) return 1;
    return target / cop;
  })();

  const convert = useCallback((copAmount: number) => (copAmount || 0) * factor, [factor]);

  const locale = LATAM_CURRENCIES.find((c) => c.code === currency)?.locale ?? "es-CO";

  const format = useCallback(
    (copAmount: number) =>
      convert(copAmount).toLocaleString(locale, { style: "currency", currency, maximumFractionDigits: 0 }),
    [convert, locale, currency]
  );

  return { currency, setCurrency, convert, format };
}
