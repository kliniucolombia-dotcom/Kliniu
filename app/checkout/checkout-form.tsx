"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { departamentosColombia, getCitiesForDepartment } from "@/lib/colombia-locations";
import { getShippingForLocation, formatShippingPrice } from "@/lib/shipping-rates";

type CheckoutItem = {
  id: string;
  nombre: string;
  precio: string;
  imagen: string;
  cantidad: number;
  sku?: string;
  isCombo?: boolean;
  comboItems?: { nombre: string; cantidad: number }[];
};

type CheckoutUser = {
  fullName: string;
  company: string | null;
  email: string;
  phone: string | null;
  department: string | null;
  city: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
};

type ToastState = { tone: "success" | "error"; message: string } | null;

type FormState = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  company: string;
  department: string;
  city: string;
  addressLine1: string;
  addressLine2: string;
  notes: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

const steps = [
  { n: 1, label: "Información", sub: "Tus datos de contacto" },
  { n: 2, label: "Dirección", sub: "Dirección y método" },
  { n: 3, label: "Pago", sub: "Elige tu método" },
  { n: 4, label: "Finalizar", sub: "Revisa y finaliza" },
];

const trustItems = [
  { label: "Compra\n100% segura" },
  { label: "Devoluciones\nfáciles" },
  { label: "Soporte\nexperto" },
];

export default function CheckoutForm({
  user,
  items,
  subtotal,
}: {
  user: CheckoutUser;
  items: CheckoutItem[];
  subtotal: number;
}) {
  const hasSavedAddress = Boolean(user.city || user.addressLine1);
  const [form, setForm] = useState<FormState>({
    customerName: user.fullName,
    customerEmail: user.email,
    customerPhone: user.phone || "",
    company: user.company || "",
    department: user.department || "",
    city: user.city || "",
    addressLine1: user.addressLine1 || "",
    addressLine2: user.addressLine2 || "",
    notes: "",
  });
  const [useDifferentAddress, setUseDifferentAddress] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [cityMenuOpen, setCityMenuOpen] = useState(false);
  const cityOptions = useMemo(() => getCitiesForDepartment(form.department), [form.department]);
  const filteredCityOptions = useMemo(() => {
    const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const query = normalize(form.city.trim());
    return cityOptions.filter((c) => normalize(c).includes(query));
  }, [cityOptions, form.city]);
  const shipping = useMemo(() => getShippingForLocation(form.department, form.city), [form.department, form.city]);

  const step1Done = Boolean(form.customerName.trim() && form.customerEmail.trim() && form.customerPhone.trim());
  const step2Done = Boolean(form.department.trim() && form.addressLine1.trim() && form.city.trim());
  const step3Done = step1Done && step2Done; // método de pago siempre seleccionado por defecto
  const currentStep = !step1Done ? 1 : !step2Done ? 2 : !step3Done ? 3 : 4;

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(id);
  }, [toast]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setForm((c) => (id === "department" ? { ...c, department: value, city: "" } : { ...c, [id]: value }));
  };

  const handleToggleDifferentAddress = () => {
    setUseDifferentAddress((cur) => {
      const next = !cur;
      setForm((f) => ({
        ...f,
        department: next ? "" : user.department || "",
        city: next ? "" : user.city || "",
        addressLine1: next ? "" : user.addressLine1 || "",
        addressLine2: next ? "" : user.addressLine2 || "",
      }));
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setInlineError("");
    setToast(null);
    setIsSubmitting(true);

    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const payload = (await response.json()) as {
      error?: string; message?: string;
      order?: { id: string; totalItems: number; subtotal: number };
    };

    if (!response.ok || !payload.order) {
      setIsSubmitting(false);
      const message = payload.error || "No fue posible crear el pedido.";
      setInlineError(message);
      setToast({ tone: "error", message });
      return;
    }

    const orderId = payload.order.id;
    const payResponse = await fetch(`/api/orders/${orderId}/pay`, { method: "POST" });
    const payPayload = (await payResponse.json()) as { error?: string; checkoutUrl?: string };

    setIsSubmitting(false);

    if (!payResponse.ok || !payPayload.checkoutUrl) {
      const message = payPayload.error || "No fue posible iniciar el pago.";
      setInlineError(message);
      setToast({ tone: "error", message });
      return;
    }

    window.location.href = payPayload.checkoutUrl;
  };

  return (
    <main className="min-h-screen bg-white text-[#111]">
      {/* Toast */}
      {toast && (
        <div className="fixed right-5 top-5 z-[80] w-[min(92vw,380px)]">
          <div className={`rounded-2xl border px-5 py-4 shadow-lg backdrop-blur-sm ${
            toast.tone === "success" ? "border-green-200 bg-green-50 text-green-800" : "border-[#27B1B8]/20 bg-[#EAF8F6] text-[#0C535B]"
          }`}>
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm font-medium">{toast.message}</p>
              <button type="button" onClick={() => setToast(null)} className="opacity-60 hover:opacity-100">×</button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 sm:py-10">
        {/* Back link */}
        <div className="mb-6 flex justify-end">
          <Link href="/carrito" className="text-sm text-[#27B1B8] hover:underline">
            ← Volver al carrito
          </Link>
        </div>

        {/* Stepper */}
        <div className="scrollbar-hidden -mx-4 mb-10 flex items-start justify-start gap-0 overflow-x-auto px-4 sm:-mx-6 sm:justify-center sm:px-6">
          {steps.map((step, i) => {
            const isDone = step.n < currentStep;
            const isActive = step.n === currentStep;
            return (
            <div key={step.n} className="flex shrink-0 items-center">
              <div className="flex flex-col items-center">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                  isDone ? "bg-[#0C535B] text-white" : isActive ? "bg-[#27B1B8] text-white" : "border-2 border-black/10 text-[#aaa]"
                }`}>
                  {isDone ? "✓" : step.n}
                </div>
                <div className="mt-1 text-center">
                  <p className={`text-[11px] font-bold sm:text-xs ${isDone ? "text-[#0C535B]" : isActive ? "text-[#27B1B8]" : "text-[#aaa]"}`}>
                    {step.label}
                  </p>
                  <p className="hidden text-[10px] text-[#aaa] sm:block">{step.sub}</p>
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className={`mx-2 mb-5 h-px w-10 shrink-0 transition-colors sm:mx-3 sm:w-24 ${step.n < currentStep ? "bg-[#0C535B]" : "bg-black/10"}`} />
              )}
            </div>
          );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-8 rounded-2xl border border-black/8 bg-white p-6 md:p-8">

            {/* 1. Información de contacto */}
            <div>
              <h2 className="mb-4 text-base font-extrabold text-[#111]">
                1. Información de contacto
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="customerName" className="mb-1.5 block text-sm font-medium text-[#333]">
                    Nombre completo*
                  </label>
                  <input id="customerName" value={form.customerName} onChange={handleChange} required
                    className="h-11 w-full rounded-xl border border-black/10 px-4 text-sm outline-none transition focus:border-[#27B1B8]" />
                </div>
                <div>
                  <label htmlFor="company" className="mb-1.5 block text-sm font-medium text-[#333]">
                    Empresa <span className="font-normal text-[#aaa]">(opcional)</span>
                  </label>
                  <input id="company" value={form.company} onChange={handleChange}
                    className="h-11 w-full rounded-xl border border-black/10 px-4 text-sm outline-none transition focus:border-[#27B1B8]" />
                </div>
                <div>
                  <label htmlFor="customerEmail" className="mb-1.5 block text-sm font-medium text-[#333]">
                    Correo electrónico*
                  </label>
                  <input id="customerEmail" type="email" value={form.customerEmail} onChange={handleChange} required
                    className="h-11 w-full rounded-xl border border-black/10 px-4 text-sm outline-none transition focus:border-[#27B1B8]" />
                </div>
                <div>
                  <label htmlFor="customerPhone" className="mb-1.5 block text-sm font-medium text-[#333]">
                    Teléfono / WhatsApp*
                  </label>
                  <div className="flex overflow-hidden rounded-xl border border-black/10 transition focus-within:border-[#27B1B8]">
                    <span className="flex items-center gap-1 border-r border-black/10 bg-[#f8f8f7] px-3 text-sm">
                      🇨🇴 +57
                    </span>
                    <input id="customerPhone" type="tel" value={form.customerPhone} onChange={handleChange} required
                      className="h-11 flex-1 px-4 text-sm outline-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Dirección de envío */}
            <div>
              <h2 className="mb-4 text-base font-extrabold text-[#111]">
                2. Dirección de envío
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="department" className="mb-1.5 block text-sm font-medium text-[#333]">
                    País*
                  </label>
                  <input value="Colombia" readOnly
                    className="h-11 w-full rounded-xl border border-black/10 bg-[#f8f8f7] px-4 text-sm outline-none" />
                </div>
                <div>
                  <label htmlFor="department" className="mb-1.5 block text-sm font-medium text-[#333]">
                    Departamento*
                  </label>
                  <select id="department" value={form.department} onChange={handleChange} required
                    className="h-11 w-full rounded-xl border border-black/10 bg-white px-4 text-sm outline-none transition focus:border-[#27B1B8]">
                    <option value="">Selecciona un departamento</option>
                    {departamentosColombia.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="addressLine1" className="mb-1.5 block text-sm font-medium text-[#333]">
                    Dirección*
                  </label>
                  <input id="addressLine1" value={form.addressLine1} onChange={handleChange} required
                    placeholder="Calle, carrera, barrio o punto de entrega"
                    className="h-11 w-full rounded-xl border border-black/10 px-4 text-sm outline-none transition focus:border-[#27B1B8]" />
                </div>
                <div className="relative">
                  <label htmlFor="city" className="mb-1.5 block text-sm font-medium text-[#333]">
                    Ciudad*
                  </label>
                  <input id="city" value={form.city} onChange={handleChange} required
                    autoComplete="off"
                    disabled={!form.department}
                    onFocus={() => setCityMenuOpen(true)}
                    onBlur={() => window.setTimeout(() => setCityMenuOpen(false), 150)}
                    placeholder={form.department ? "Busca o escribe tu ciudad" : "Selecciona departamento primero"}
                    className="h-11 w-full rounded-xl border border-black/10 px-4 text-sm outline-none transition focus:border-[#27B1B8] disabled:bg-[#f8f8f7]" />
                  {cityMenuOpen && filteredCityOptions.length > 0 && (
                    <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-black/10 bg-white py-1 shadow-lg">
                      {filteredCityOptions.map((c) => (
                        <li key={c}>
                          <button type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { setForm((f) => ({ ...f, city: c })); setCityMenuOpen(false); }}
                            className="block w-full px-4 py-2 text-left text-sm text-[#333] hover:bg-[#f0fbfc]">
                            {c}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <label htmlFor="addressLine2" className="mb-1.5 block text-sm font-medium text-[#333]">
                    Apartamento, oficina etc. <span className="font-normal text-[#aaa]">(opcional)</span>
                  </label>
                  <input id="addressLine2" value={form.addressLine2} onChange={handleChange}
                    placeholder="Apto, interior, piso..."
                    className="h-11 w-full rounded-xl border border-black/10 px-4 text-sm outline-none transition focus:border-[#27B1B8]" />
                </div>

                {hasSavedAddress && (
                  <div className="sm:col-span-2">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-[#555]">
                      <input type="checkbox" checked={useDifferentAddress} onChange={handleToggleDifferentAddress}
                        className="h-4 w-4 rounded border-black/20 text-[#27B1B8] focus:ring-[#27B1B8]" />
                      Guardar esta dirección para futuras compras
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Método de pago */}
            <div>
              <h2 className="mb-4 text-base font-extrabold text-[#111]">
                3. Método de pago
              </h2>
              <div className="flex items-center gap-3 rounded-xl border border-[#27B1B8] bg-[#f0fafa] px-4 py-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#111]">Pago seguro con Wompi</p>
                  <p className="text-xs text-[#6e7379]">Tarjeta, PSE, Nequi y más</p>
                </div>
                <svg viewBox="0 0 48 16" className="h-4" fill="none">
                  <rect x="0" y="0" width="22" height="16" rx="3" fill="#1A1F71" />
                  <text x="11" y="12" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">VISA</text>
                  <rect x="26" y="0" width="22" height="16" rx="3" fill="#EB001B" />
                  <circle cx="37" cy="8" r="6" fill="#F79E1B" opacity="0.8" />
                </svg>
              </div>
            </div>

            {inlineError && (
              <p className="rounded-xl border border-[#27B1B8]/20 bg-[#EAF8F6] px-4 py-3 text-sm text-[#0C535B]">
                {inlineError}
              </p>
            )}

            <div>
              <button type="submit" disabled={isSubmitting}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#0C535B] text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                {isSubmitting ? "Redirigiendo a Wompi..." : "Ir a pagar"}
              </button>
              <p className="mt-3 text-center text-xs text-[#aaa]">
                Al continuar, aceptas nuestros{" "}
                <Link href="/contacto" className="text-[#27B1B8] hover:underline">Términos y Condiciones</Link>
                {" "}y la{" "}
                <Link href="/contacto" className="text-[#27B1B8] hover:underline">Política de privacidad</Link>.
              </p>
            </div>
          </form>

          {/* Sidebar */}
          <aside className="h-fit space-y-4">
            <div className="rounded-2xl border border-black/8 bg-[#f8fafa] p-5">
              <div className="grid grid-cols-2 gap-2">
                {trustItems.map((t) => (
                  <div key={t.label} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[#27B1B8]" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span className="whitespace-pre-line text-[10px] font-semibold leading-tight text-[#0C535B]">{t.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Order mini-summary */}
            <div className="rounded-2xl border border-black/8 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#aaa]">Tu pedido</p>
              <div className="mt-3 space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-sm">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#f8f8f7]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.imagen} alt={item.nombre}
                        className="h-full w-full object-contain p-0.5"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/product-placeholder.png"; }} />
                    </div>
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-[#111]">
                        {item.nombre}
                        {item.isCombo && (
                          <span className="ml-1.5 rounded-full bg-[#DCFCE7] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#16A34A]">
                            Combo
                          </span>
                        )}
                      </span>
                      {item.sku && (
                        <span className="block truncate text-xs text-[#999]">Cód: {item.sku}</span>
                      )}
                      {item.isCombo && item.comboItems && item.comboItems.length > 0 && (
                        <span className="block truncate text-[10px] text-[#aaa]">
                          Incluye: {item.comboItems.map((ci) => `${ci.cantidad}× ${ci.nombre}`).join(", ")}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 font-semibold text-[#27B1B8]">{item.precio}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2 border-t border-black/8 pt-3 text-sm">
                <div className="flex justify-between text-[#555]">
                  <span>Envío{form.city ? "" : " (según tu ciudad)"}</span>
                  <span className={`font-semibold ${shipping.price === 0 ? "text-green-600" : "text-[#111]"}`}>
                    {formatShippingPrice(shipping.price)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-black/8 pt-2 font-bold">
                  <span>Total</span>
                  <span className="text-[#27B1B8]">{formatCurrency(subtotal + shipping.price)}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
