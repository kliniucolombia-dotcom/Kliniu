"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";

const helpOptions = [
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.5a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .84h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
      </svg>
    ),
    titulo: "Asesoría personalizada",
    desc: "Soluciones para tu espacio",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.5a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .84h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
      </svg>
    ),
    titulo: "Cotizaciones",
    desc: "Precios y disponibilidad",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.5a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .84h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
      </svg>
    ),
    titulo: "Distribución",
    desc: "Información para distribuidores",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M22 12h-2M4 12H2M19.07 19.07l-1.41-1.41M5.34 5.34L3.93 3.93" />
      </svg>
    ),
    titulo: "Soporte técnico",
    desc: "Asistencia y mantenimiento",
  },
];

type FormState = {
  nombre: string;
  email: string;
  empresa: string;
  pais: string;
  consulta: string;
};

const initialState: FormState = {
  nombre: "",
  email: "",
  empresa: "",
  pais: "",
  consulta: "",
};

export default function ContactForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [feedback, setFeedback] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = [
      `Nombre: ${form.nombre}`,
      `Email: ${form.email}`,
      form.empresa ? `Empresa: ${form.empresa}` : "",
      form.pais ? `País: ${form.pais}` : "",
      "",
      "Consulta:",
      form.consulta,
    ]
      .filter(Boolean)
      .join("\n");

    window.location.href = `mailto:ventas@kliniu.com?subject=${encodeURIComponent(
      "Consulta desde kliniu.com",
    )}&body=${encodeURIComponent(body)}`;
    setFeedback("¡Mensaje enviado! Abrimos tu correo para completar el envío.");
    setForm(initialState);
  };

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((c) => ({ ...c, [field]: e.target.value }));

  return (
    <section className="bg-white py-12">
      <div className="mx-auto max-w-[1440px] px-6">
        <div className="mx-auto grid max-w-[1180px] gap-8 rounded-lg bg-[#eaf2f2] px-8 py-6 md:grid-cols-[230px_minmax(360px,520px)_250px] md:items-center md:gap-8 xl:px-12">
          {/* Intro */}
          <div className="relative min-h-[235px]">
            <h2 className="max-w-[220px] text-[24px] font-black leading-[0.95] tracking-tight text-[#073F43]">
              Cuéntanos cómo podemos ayudarte
            </h2>
            <p className="mt-4 max-w-[230px] text-[13px] font-semibold leading-[1.15] text-black">
              Completa el formulario y te contactamos lo antes posible.
            </p>
            <Image
              src="/foca-pensativa-contacto.png"
              alt="Foca Kliniu pensativa"
              width={190}
              height={190}
              className="absolute -bottom-8 left-0 w-[190px] object-contain"
            />
          </div>

          {/* Form */}
          <div className="rounded-md bg-white px-5 py-5 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <input
                    required
                    type="text"
                    value={form.nombre}
                    onChange={set("nombre")}
                    placeholder="Nombre completo"
                    className="h-10 w-full rounded border border-black/25 px-4 text-sm outline-none transition placeholder:text-[#9aa3a8] focus:border-[#27B1B8]"
                  />
                </div>
                <div>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    placeholder="Correo electrónico"
                    className="h-10 w-full rounded border border-black/25 px-4 text-sm outline-none transition placeholder:text-[#9aa3a8] focus:border-[#27B1B8]"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <input
                    type="text"
                    value={form.empresa}
                    onChange={set("empresa")}
                    placeholder="Empresa (opcional)"
                    className="h-10 w-full rounded border border-black/25 px-4 text-sm outline-none transition placeholder:text-[#9aa3a8] focus:border-[#27B1B8]"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={form.pais}
                    onChange={set("pais")}
                    placeholder="País"
                    className="h-10 w-full rounded border border-black/25 px-4 text-sm outline-none transition placeholder:text-[#9aa3a8] focus:border-[#27B1B8]"
                  />
                </div>
              </div>

              <div>
                <textarea
                  required
                  rows={4}
                  value={form.consulta}
                  onChange={set("consulta")}
                  placeholder="Cuéntanos tu consulta."
                  className="w-full rounded border border-black/25 px-4 py-3 text-sm outline-none transition placeholder:text-[#9aa3a8] focus:border-[#27B1B8]"
                />
              </div>

              {feedback && (
                <p className="rounded bg-[#eaf8f6] px-4 py-3 text-sm text-[#0C535B]">
                  {feedback}
                </p>
              )}

              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded bg-[#073F43] px-5 py-2 text-[12px] font-black text-white transition-colors hover:bg-[#0C535B]"
              >
                Enviar mensaje →
              </button>
            </form>
          </div>

          {/* Help options */}
          <div>
            <h3 className="text-[14px] font-black text-black">¿En que podemos ayudarte?</h3>
            <div className="mt-5 space-y-4">
              {helpOptions.map((opt) => (
                <div key={opt.titulo} className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#0C535B]/30 bg-[#d7e6e6] text-[#0C535B]">
                    {opt.icon}
                  </span>
                  <div>
                    <p className="text-[13px] font-black leading-none text-[#073F43]">{opt.titulo}</p>
                    <p className="mt-1 text-[11px] font-semibold leading-tight text-black">{opt.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
