"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";

const helpOptions = [
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
      </svg>
    ),
    titulo: "Asesoría personalizada",
    desc: "Soluciones para tu espacio",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="13" y2="17" />
      </svg>
    ),
    titulo: "Cotizaciones",
    desc: "Precios y disponibilidad",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="3" width="15" height="13" rx="1" />
        <path d="M16 8h4l3 5v3h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
    titulo: "Distribución",
    desc: "Información para distribuidores",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.5a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .84h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
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
    <section className="home-reveal overflow-hidden bg-white py-12">
      <div className="mx-auto w-full max-w-[1440px] overflow-hidden px-6">
        <div className="interactive-lift mx-auto grid w-full max-w-[1180px] gap-8 rounded-lg bg-[#eaf2f2] px-8 py-6 md:grid-cols-[220px_minmax(0,520px)_240px] md:items-center md:justify-center md:gap-7 xl:px-12">
          {/* Intro */}
          <div className="flex min-h-[235px] flex-col">
            <h2 className="animated-heading max-w-[220px] text-[24px] font-black leading-[0.95] tracking-tight text-[#073F43]">
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
              className="float-soft mt-auto w-[190px] object-contain"
            />
          </div>

          {/* Form */}
          <div className="motion-card interactive-lift min-w-0 rounded-md bg-white px-5 py-5 shadow-sm">
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
                className="shine-sweep hero-pop inline-flex items-center gap-2 rounded bg-[#073F43] px-5 py-2 text-[12px] font-black text-white transition-colors hover:bg-[#0C535B]"
              >
                Enviar mensaje →
              </button>
            </form>
          </div>

          {/* Help options */}
          <div className="min-w-0">
            <h3 className="text-[14px] font-black text-black">¿En que podemos ayudarte?</h3>
            <div className="motion-list mt-5 space-y-4">
              {helpOptions.map((opt) => (
                <div key={opt.titulo} className="motion-card flex items-start gap-3">
                  <span className="feature-icon-pop flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#0C535B]/30 bg-[#d7e6e6] text-[#0C535B]">
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
