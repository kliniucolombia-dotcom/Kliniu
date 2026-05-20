"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import WhatsAppAsesor from "../components/whatsapp-asesor";
import { useRouter } from "next/navigation";
import { departamentosColombia, getCitiesForDepartment } from "@/lib/colombia-locations";

type CheckoutItem = {
  id: string;
  nombre: string;
  precio: string;
  imagen: string;
  cantidad: number;
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

type PendingOrderState = { id: string; totalItems: number; subtotal: number } | null;

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
  { label: "Garantía\n2 años" },
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
  const router = useRouter();
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
  const [pendingOrder, setPendingOrder] = useState<PendingOrderState>(null);
  const [paymentCode, setPaymentCode] = useState("");
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const cityOptions = useMemo(() => getCitiesForDepartment(form.department), [form.department]);

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

    setIsSubmitting(false);

    if (!response.ok || !payload.order) {
      const message = payload.error || "No fue posible crear el pedido.";
      setInlineError(message);
      setToast({ tone: "error", message });
      return;
    }

    setPendingOrder(payload.order);
    setPaymentCode("");
    setToast({ tone: "success", message: payload.message || "Pedido creado. Confirma el pago demo." });
  };

  const handleConfirmPayment = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!pendingOrder) return;

    setInlineError("");
    setToast(null);
    setIsConfirmingPayment(true);

    const response = await fetch(`/api/orders/${pendingOrder.id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentCode }),
    });

    const payload = (await response.json()) as {
      error?: string; message?: string; order?: { id: string };
    };

    setIsConfirmingPayment(false);

    if (!response.ok || !payload.order) {
      const message = payload.error || "No fue posible confirmar el pago.";
      setInlineError(message);
      setToast({ tone: "error", message });
      return;
    }

    setToast({ tone: "success", message: payload.message || "Pago confirmado." });
    router.push(`/checkout/exito?pedido=${payload.order.id}&pagado=1`);
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-white text-[#111]">
      {/* Payment demo modal */}
      {pendingOrder && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0f172a]/45 px-6 backdrop-blur-[2px]">
          <div className="w-full max-w-lg rounded-2xl border border-black/8 bg-white p-7 shadow-[0_30px_80px_rgba(15,23,42,0.28)]">
            <p className="text-sm font-bold uppercase tracking-wider text-[#27B1B8]">Pago demo</p>
            <h2 className="mt-2 text-2xl font-extrabold text-[#0C535B]">Simular pago del pedido</h2>
            <p className="mt-2 text-sm leading-6 text-[#555]">
              Usa el código <span className="font-bold text-[#0C535B]">1234</span> para aprobar el pago demo.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-black/8 bg-[#f8f8f7] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#aaa]">Pedido</p>
                <p className="mt-1 text-sm font-semibold text-[#0C535B]">{pendingOrder.id}</p>
              </div>
              <div className="rounded-xl border border-black/8 bg-[#f8f8f7] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#aaa]">Total</p>
                <p className="mt-1 text-sm font-semibold text-[#0C535B]">{formatCurrency(pendingOrder.subtotal)}</p>
              </div>
            </div>
            <form onSubmit={handleConfirmPayment} className="mt-5 space-y-4">
              <input
                type="password"
                value={paymentCode}
                onChange={(e) => setPaymentCode(e.target.value)}
                placeholder="Código de pago demo"
                autoFocus required
                className="h-11 w-full rounded-xl border border-black/10 px-4 text-sm outline-none transition focus:border-[#27B1B8]"
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => { setPendingOrder(null); setPaymentCode(""); }}
                  className="flex-1 rounded-full border border-[#0C535B]/20 py-3 text-sm font-bold text-[#0C535B] hover:bg-[#0C535B] hover:text-white transition-colors">
                  Pagar luego
                </button>
                <button type="submit" disabled={isConfirmingPayment}
                  className="flex-1 rounded-full bg-[#27B1B8] py-3 text-sm font-bold text-white hover:bg-[#1E969B] transition-colors disabled:opacity-60">
                  {isConfirmingPayment ? "Validando..." : "Confirmar pago"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      <div className="mx-auto max-w-[1100px] px-6 py-10">
        {/* Back link */}
        <div className="mb-6 flex justify-end">
          <Link href="/carrito" className="text-sm text-[#27B1B8] hover:underline">
            ← Volver al carrito
          </Link>
        </div>

        {/* Stepper */}
        <div className="mb-10 flex items-center justify-center gap-0">
          {steps.map((step, i) => (
            <div key={step.n} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  step.n === 1 ? "bg-[#27B1B8] text-white" : "border-2 border-black/10 text-[#aaa]"
                }`}>
                  {step.n}
                </div>
                <div className="mt-1 text-center">
                  <p className={`text-xs font-bold ${step.n === 1 ? "text-[#27B1B8]" : "text-[#aaa]"}`}>
                    {step.label}
                  </p>
                  <p className="text-[10px] text-[#aaa]">{step.sub}</p>
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className="mx-3 mb-5 h-px w-16 bg-black/10 sm:w-24" />
              )}
            </div>
          ))}
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
                <div>
                  <label htmlFor="city" className="mb-1.5 block text-sm font-medium text-[#333]">
                    Ciudad*
                  </label>
                  <input id="city" value={form.city} onChange={handleChange} required list="checkout-cities"
                    disabled={!form.department}
                    placeholder={form.department ? "Busca o escribe tu ciudad" : "Selecciona departamento primero"}
                    className="h-11 w-full rounded-xl border border-black/10 px-4 text-sm outline-none transition focus:border-[#27B1B8] disabled:bg-[#f8f8f7]" />
                  <datalist id="checkout-cities">
                    {cityOptions.map((c) => <option key={c} value={c} />)}
                  </datalist>
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
              <div className="space-y-3">
                {["Tarjeta de crédito o débito", "PSE - Débito bancario", "Efectivo / Contraentrega"].map((method, i) => (
                  <label key={method} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                    i === 0 ? "border-[#27B1B8] bg-[#f0fafa]" : "border-black/10 hover:border-[#27B1B8]/40"
                  }`}>
                    <input type="radio" name="paymentMethod" defaultChecked={i === 0}
                      className="h-4 w-4 text-[#27B1B8]" />
                    <div>
                      <p className="text-sm font-semibold text-[#111]">{method}</p>
                      {i === 0 && <p className="text-xs text-[#6e7379]">Visa, Mastercard</p>}
                    </div>
                    {i === 0 && (
                      <svg viewBox="0 0 48 16" className="ml-auto h-4" fill="none">
                        <rect x="0" y="0" width="22" height="16" rx="3" fill="#1A1F71" />
                        <text x="11" y="12" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">VISA</text>
                        <rect x="26" y="0" width="22" height="16" rx="3" fill="#EB001B" />
                        <circle cx="37" cy="8" r="6" fill="#F79E1B" opacity="0.8" />
                      </svg>
                    )}
                  </label>
                ))}
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
                {isSubmitting ? "Procesando..." : "Finalizar compra"}
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
              <div className="flex items-start gap-3">
                <Image src="/kliniu-loader-logo.png" alt="Kliniu" width={52} height={52} className="shrink-0 object-contain" />
                <div>
                  <p className="font-extrabold text-[#0C535B]">¿Necesitas ayuda?</p>
                  <p className="mt-1 text-xs leading-5 text-[#6e7379]">
                    Nuestro equipo está listo para ayudarte en lo que necesites.
                  </p>
                </div>
              </div>
              <WhatsAppAsesor className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#0C535B] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.073.528 4.024 1.455 5.726L.057 24l6.434-1.383C8.055 23.507 9.987 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.883 0-3.655-.506-5.183-1.393l-.372-.22-3.819.822.839-3.701-.243-.381A9.937 9.937 0 012 12c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10z" />
                </svg>
                Escribir por WhatsApp
              </WhatsAppAsesor>

              <div className="mt-4 grid grid-cols-2 gap-2">
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
                    <span className="flex-1 truncate text-[#111]">{item.nombre}</span>
                    <span className="shrink-0 font-semibold text-[#27B1B8]">{item.precio}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-between border-t border-black/8 pt-3 text-sm font-bold">
                <span>Total</span>
                <span className="text-[#27B1B8]">{formatCurrency(subtotal)}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
