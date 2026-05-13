"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { departamentosColombia, getCitiesForDepartment } from "@/lib/colombia-locations";

type RegisterFormState = {
  fullName: string;
  company: string;
  email: string;
  phone: string;
  department: string;
  city: string;
  addressLine1: string;
  addressLine2: string;
  password: string;
  confirmPassword: string;
};

type ToastState = {
  tone: "success" | "error";
  message: string;
} | null;

const initialState: RegisterFormState = {
  fullName: "",
  company: "",
  email: "",
  phone: "",
  department: "",
  city: "",
  addressLine1: "",
  addressLine2: "",
  password: "",
  confirmPassword: "",
};

export default function RegistroPage() {
  const [form, setForm] = useState<RegisterFormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [inlineError, setInlineError] = useState("");

  const cityOptions = useMemo(
    () => getCitiesForDepartment(form.department),
    [form.department],
  );

  useEffect(() => {
    if (!toast) return;

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 2800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toast]);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = event.target;
    setForm((current) => {
      if (id === "department") {
        return { ...current, department: value, city: "" };
      }

      return { ...current, [id]: value };
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInlineError("");
    setToast(null);

    if (form.password !== form.confirmPassword) {
      const message = "Las contraseñas no coinciden.";
      setInlineError(message);
      setToast({ tone: "error", message });
      return;
    }

    setIsSubmitting(true);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const payload = (await response.json()) as {
      error?: string;
      message?: string;
    };

    setIsSubmitting(false);

    if (!response.ok) {
      const message = payload.error || "No fue posible crear la cuenta.";
      setInlineError(message);
      setToast({ tone: "error", message });
      return;
    }

    setForm(initialState);
    setInlineError("");
    setToast({
      tone: "success",
      message: payload.message || "Cuenta creada correctamente.",
    });
  };

  return (
    <main className="flex min-h-[calc(100vh-88px)] items-center justify-center bg-[#f5f5f5] px-6 py-16">
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

      <section className="w-full max-w-2xl rounded-[2rem] bg-white p-8 shadow-lg shadow-black/10 md:p-10">
        <Link
          href="/"
          className="text-sm font-semibold uppercase tracking-wide text-[#0C535B] transition-colors duration-200 hover:text-[#27B1B8]"
        >
          Volver al inicio
        </Link>

        <div className="mt-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#27B1B8]">
            Kliniu
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#0C535B] md:text-4xl">
            Crear cuenta
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">
            Regístrate para guardar pedidos, explorar categorías y comprar con
            una experiencia más ágil.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="fullName"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Nombre completo
            </label>
            <input
              id="fullName"
              type="text"
              value={form.fullName}
              onChange={handleChange}
              placeholder="Tu nombre"
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-colors duration-200 focus:border-[#27B1B8]"
            />
          </div>

          <div>
            <label
              htmlFor="company"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Empresa o taller
            </label>
            <input
              id="company"
              type="text"
              value={form.company}
              onChange={handleChange}
              placeholder="Nombre de tu negocio"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-colors duration-200 focus:border-[#27B1B8]"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="tu@correo.com"
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-colors duration-200 focus:border-[#27B1B8]"
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Teléfono
            </label>
            <input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              placeholder="Tu número"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-colors duration-200 focus:border-[#27B1B8]"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Mínimo 8 caracteres"
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-colors duration-200 focus:border-[#27B1B8]"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Confirmar contraseña
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Repite tu contraseña"
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-colors duration-200 focus:border-[#27B1B8]"
            />
          </div>

          <div>
            <label
              htmlFor="department"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
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
            <label
              htmlFor="city"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Ciudad
            </label>
            <input
              id="city"
              type="text"
              value={form.city}
              onChange={handleChange}
              list="registro-cities"
              placeholder={
                form.department
                  ? "Busca o escribe tu ciudad"
                  : "Primero selecciona un departamento"
              }
              required
              disabled={!form.department}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-colors duration-200 focus:border-[#27B1B8]"
            />
            <datalist id="registro-cities">
              {cityOptions.map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="addressLine1"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Dirección principal
            </label>
            <input
              id="addressLine1"
              type="text"
              value={form.addressLine1}
              onChange={handleChange}
              placeholder="Calle, carrera, barrio o punto de entrega"
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-colors duration-200 focus:border-[#27B1B8]"
            />
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="addressLine2"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Complemento de dirección
            </label>
            <input
              id="addressLine2"
              type="text"
              value={form.addressLine2}
              onChange={handleChange}
              placeholder="Apto, interior, piso, bodega..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-colors duration-200 focus:border-[#27B1B8]"
            />
          </div>

          {inlineError && (
            <p className="rounded-xl border border-[#27B1B8]/20 bg-[#EAF8F6] px-4 py-3 text-sm font-medium text-[#0C535B] md:col-span-2">
              {inlineError}
            </p>
          )}

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#27B1B8] px-4 py-3 font-semibold text-white transition-colors duration-200 hover:bg-[#1E969B] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </div>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          ¿Ya tienes una cuenta?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#0C535B] transition-colors duration-200 hover:text-[#27B1B8]"
          >
            Inicia sesión
          </Link>
        </p>
      </section>
    </main>
  );
}
