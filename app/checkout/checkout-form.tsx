"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
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

type ToastState = {
  tone: "success" | "error";
  message: string;
} | null;

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

type PendingOrderState = {
  id: string;
  totalItems: number;
  subtotal: number;
} | null;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

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
  const hasSavedAddress = Boolean(user.city || user.addressLine1 || user.addressLine2);
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
  const cityOptions = useMemo(
    () => getCitiesForDepartment(form.department),
    [form.department],
  );

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const totalItems = useMemo(
    () => items.reduce((total, item) => total + item.cantidad, 0),
    [items],
  );

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { id, value } = event.target;
    setForm((current) => {
      if (id === "department") {
        return { ...current, department: value, city: "" };
      }

      return { ...current, [id]: value };
    });
  };

  const handleToggleDifferentAddress = () => {
    setUseDifferentAddress((current) => {
      const nextValue = !current;

      setForm((currentForm) => ({
        ...currentForm,
        department: nextValue ? "" : user.department || "",
        city: nextValue ? "" : user.city || "",
        addressLine1: nextValue ? "" : user.addressLine1 || "",
        addressLine2: nextValue ? "" : user.addressLine2 || "",
      }));

      return nextValue;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInlineError("");
    setToast(null);
    setIsSubmitting(true);

    const response = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const payload = (await response.json()) as {
      error?: string;
      message?: string;
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
    setToast({
      tone: "success",
      message:
        payload.message ||
        "Pedido creado correctamente. Confirma el pago demo para completar el flujo.",
    });
  };

  const handleConfirmPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!pendingOrder) return;

    setInlineError("");
    setToast(null);
    setIsConfirmingPayment(true);

    const response = await fetch(`/api/orders/${pendingOrder.id}/pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentCode }),
    });

    const payload = (await response.json()) as {
      error?: string;
      message?: string;
      order?: { id: string };
    };

    setIsConfirmingPayment(false);

    if (!response.ok || !payload.order) {
      const message = payload.error || "No fue posible confirmar el pago.";
      setInlineError(message);
      setToast({ tone: "error", message });
      return;
    }

    setToast({
      tone: "success",
      message: payload.message || "Pago de prueba confirmado correctamente.",
    });

    router.push(`/checkout/exito?pedido=${payload.order.id}&pagado=1`);
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-[#f5f5f5] text-[#111]">
      {pendingOrder && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0f172a]/45 px-6 backdrop-blur-[2px]">
          <div className="w-full max-w-lg rounded-[1.9rem] border border-black/8 bg-white p-7 shadow-[0_30px_80px_rgba(15,23,42,0.28)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#27B1B8]">
              Pago demo
            </p>
            <h2 className="mt-3 text-3xl font-bold text-[#0C535B]">
              Simular pago del pedido
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Mientras conectamos Wompi, este paso te permite mostrar la experiencia completa. Usa el código <span className="font-semibold text-[#0C535B]">1234</span> para aprobar el pago.
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <div className="rounded-[1.2rem] border border-black/8 bg-[#fafaf9] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b8d91]">
                  Pedido
                </p>
                <p className="mt-2 text-sm font-semibold text-[#0C535B]">{pendingOrder.id}</p>
              </div>
              <div className="rounded-[1.2rem] border border-black/8 bg-[#fafaf9] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b8d91]">
                  Total
                </p>
                <p className="mt-2 text-sm font-semibold text-[#0C535B]">
                  {formatCurrency(pendingOrder.subtotal)}
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmPayment} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="paymentCode"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Código de pago demo
                </label>
                <input
                  id="paymentCode"
                  type="password"
                  value={paymentCode}
                  onChange={(event) => setPaymentCode(event.target.value)}
                  placeholder="Ingresa el código"
                  autoFocus
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPendingOrder(null);
                    setPaymentCode("");
                  }}
                  className="flex-1 rounded-xl border border-[#0C535B]/20 px-4 py-3 font-semibold text-[#0C535B] transition-colors duration-200 hover:bg-[#0C535B] hover:text-white"
                >
                  Pagar luego
                </button>
                <button
                  type="submit"
                  disabled={isConfirmingPayment}
                  className="flex-1 rounded-xl bg-[#27B1B8] px-4 py-3 font-semibold text-white transition-colors duration-200 hover:bg-[#1E969B] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isConfirmingPayment ? "Validando..." : "Confirmar pago"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed right-5 top-5 z-[80] w-[min(92vw,380px)]">
          <div
            className={`rounded-[1.4rem] border px-5 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.16)] backdrop-blur-sm ${
              toast.tone === "success"
                ? "border-[#1f8b45]/18 bg-[#effaf2] text-[#1f6b39]"
                : "border-[#27B1B8]/18 bg-[#EAF8F6] text-[#0C535B]"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em]">
                  {toast.tone === "success" ? "Correcto" : "Atención"}
                </p>
                <p className="mt-2 text-sm font-medium leading-6">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="text-lg leading-none opacity-60 transition-opacity duration-200 hover:opacity-100"
                aria-label="Cerrar notificación"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="mx-auto max-w-[1440px] px-6 py-16">
        <div className="mb-10">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.35em] text-[#8b8d91]">
            Checkout
          </p>
          <h1 className="text-4xl font-semibold uppercase tracking-[-0.04em] text-[#4f545a] md:text-6xl">
            Finalizar pedido
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#6e7379]">
            Completa tus datos de entrega. El pedido quedará guardado en tu cuenta
            y luego podremos conectar el pago con Wompi sobre este mismo flujo.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <form
            onSubmit={handleSubmit}
            className="rounded-[2rem] border border-black/8 bg-white p-6 shadow-[0_16px_35px_rgba(15,23,42,0.05)] md:p-8"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="customerName" className="mb-2 block text-sm font-medium text-slate-700">
                  Nombre completo
                </label>
                <input
                  id="customerName"
                  value={form.customerName}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                />
              </div>

              <div>
                <label htmlFor="company" className="mb-2 block text-sm font-medium text-slate-700">
                  Empresa o taller
                </label>
                <input
                  id="company"
                  value={form.company}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                />
              </div>

              <div>
                <label htmlFor="customerEmail" className="mb-2 block text-sm font-medium text-slate-700">
                  Correo electrónico
                </label>
                <input
                  id="customerEmail"
                  type="email"
                  value={form.customerEmail}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                />
              </div>

              <div>
                <label htmlFor="customerPhone" className="mb-2 block text-sm font-medium text-slate-700">
                  Teléfono
                </label>
                <input
                  id="customerPhone"
                  type="tel"
                  value={form.customerPhone}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                />
              </div>

              <div>
                <label htmlFor="department" className="mb-2 block text-sm font-medium text-slate-700">
                  Departamento
                </label>
                <select
                  id="department"
                  value={form.department}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                >
                  <option value="">Selecciona un departamento</option>
                  {departamentosColombia.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="city" className="mb-2 block text-sm font-medium text-slate-700">
                  Ciudad
                </label>
                <input
                  id="city"
                  value={form.city}
                  onChange={handleChange}
                  list="checkout-cities"
                  required
                  disabled={!form.department}
                  placeholder={
                    form.department
                      ? "Busca o escribe tu ciudad"
                      : "Primero selecciona un departamento"
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                />
                <datalist id="checkout-cities">
                  {cityOptions.map((city) => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
              </div>

              <div>
                <label htmlFor="addressLine2" className="mb-2 block text-sm font-medium text-slate-700">
                  Complemento de dirección
                </label>
                <input
                  id="addressLine2"
                  value={form.addressLine2}
                  onChange={handleChange}
                  placeholder="Apto, interior, piso..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                />
              </div>

              {hasSavedAddress && (
                <div className="md:col-span-2 rounded-[1.25rem] border border-black/8 bg-[#fafaf9] p-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={useDifferentAddress}
                      onChange={handleToggleDifferentAddress}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-[#27B1B8] focus:ring-[#27B1B8]"
                    />
                    <div>
                      <p className="text-sm font-semibold text-[#0C535B]">
                        Usar otra dirección para este pedido
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[#6e7379]">
                        Si la activas, este pedido usará una dirección distinta sin cambiar
                        la guardada en tu cuenta.
                      </p>
                    </div>
                  </label>
                </div>
              )}

              <div className="md:col-span-2">
                <label htmlFor="addressLine1" className="mb-2 block text-sm font-medium text-slate-700">
                  Dirección principal
                </label>
                <input
                  id="addressLine1"
                  value={form.addressLine1}
                  onChange={handleChange}
                  required
                  placeholder="Calle, carrera, barrio o punto de entrega"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="notes" className="mb-2 block text-sm font-medium text-slate-700">
                  Notas del pedido
                </label>
                <textarea
                  id="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Indicaciones especiales para la entrega o la compra"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                />
              </div>
            </div>

            {inlineError && (
              <p className="mt-6 rounded-xl border border-[#27B1B8]/20 bg-[#EAF8F6] px-4 py-3 text-sm font-medium text-[#0C535B]">
                {inlineError}
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-[#27B1B8] px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#1E969B] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Guardando pedido..." : "Crear pedido"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/carrito")}
                className="rounded-full border border-[#0C535B]/18 px-6 py-3 text-sm font-semibold text-[#0C535B] transition-colors duration-200 hover:bg-[#0C535B] hover:text-white"
              >
                Volver al carrito
              </button>
            </div>
          </form>

          <aside className="rounded-[1.75rem] border border-black/8 bg-white p-6 shadow-[0_16px_35px_rgba(15,23,42,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8b8d91]">
              Resumen del pedido
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#0C535B]">
              {totalItems} producto{totalItems === 1 ? "" : "s"}
            </h2>

            <div className="mt-6 space-y-4">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="flex items-center gap-3 rounded-[1.2rem] border border-black/8 bg-[#fafaf9] p-3"
                >
                  <Image
                    src={item.imagen}
                    alt={item.nombre}
                    width={88}
                    height={88}
                    className="h-20 w-20 rounded-[1rem] object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold text-[#1f2328]">
                      {item.nombre}
                    </p>
                    <p className="mt-1 text-xs text-[#6e7379]">Cantidad: {item.cantidad}</p>
                    <p className="mt-2 text-sm font-semibold text-[#27B1B8]">
                      {item.precio}
                    </p>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-8 rounded-[1.25rem] border border-black/8 bg-[#fafaf9] p-4">
              <div className="flex items-center justify-between text-sm text-[#5d6167]">
                <span>Subtotal</span>
                <span className="font-semibold text-[#0C535B]">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-[#5d6167]">
                <span>Pago</span>
                <span className="font-semibold text-[#0C535B]">Pendiente</span>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
