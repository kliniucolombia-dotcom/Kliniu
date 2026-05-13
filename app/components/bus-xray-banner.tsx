"use client";

import Image from "next/image";
import { useMemo, useRef, useState, type FormEvent, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import { categoriasData, slugCategoria, type Categoria } from "../data/catalog";

type DiagnosticRule = {
  keywords: string[];
  category: Categoria;
  title: string;
  reply: string;
  suggestions: string[];
};

const diagnosticRules: DiagnosticRule[] = [
  {
    keywords: ["luz", "farola", "direccional", "stop", "bombillo", "iluminacion"],
    category: "Luces y direccionales",
    title: "La señal apunta a luces y direccionales",
    reply:
      "Cuando el problema está en iluminación, stop o direccionales, la línea más útil para empezar a buscar es Luces y direccionales. Desde ahí encuentras farolas, módulos y piezas de visibilidad.",
    suggestions: ["Farolas", "Direccionales", "Módulos traseros"],
  },
  {
    keywords: ["espejo", "retrovisor", "soporte", "vibracion lateral"],
    category: "Espejos retrovisores y soportes",
    title: "Puede venir de espejos y soportes",
    reply:
      "Si el retrovisor está flojo, vibra o necesitas cambiar el soporte, la línea correcta es Espejos retrovisores y soportes. Es el punto más directo para ubicar el repuesto exacto.",
    suggestions: ["Espejos", "Soportes", "Bases"],
  },
  {
    keywords: ["motor", "calienta", "ventilador", "recalienta", "enfria", "arranque"],
    category: "Motores y ventiladores",
    title: "Hay señales de motor o ventilación",
    reply:
      "Si notas recalentamiento, bajo rendimiento o fallas en el ventilador, la categoría más cercana es Motores y ventiladores. Desde ahí puedes afinar la búsqueda según el sistema afectado.",
    suggestions: ["Ventiladores", "Motores", "Rotores"],
  },
  {
    keywords: ["caucho", "goma", "sello", "empaque", "vibracion", "ruido goma"],
    category: "Línea cauchos",
    title: "Suena a línea cauchos",
    reply:
      "Cuando hay desgaste de goma, sellos vencidos o vibraciones por piezas flexibles, lo más útil es revisar la línea cauchos. Allí encuentras referencias de reposición y sellado.",
    suggestions: ["Sellos", "Empaques", "Cauchos técnicos"],
  },
  {
    keywords: ["inyeccion", "extrusion", "plastico", "boquilla", "moldeo"],
    category: "Línea inyección y extrusión",
    title: "Esto encaja mejor en inyección y extrusión",
    reply:
      "Cuando el problema está relacionado con procesos de inyección, extrusión o piezas técnicas de ese frente, la línea correcta para entrar es Inyección y extrusión.",
    suggestions: ["Boquillas", "Piezas técnicas", "Accesorios"],
  },
  {
    keywords: ["mecanizado", "torno", "corte", "fresa", "ajuste metalico"],
    category: "Línea mecanizado",
    title: "Puede resolverse desde línea mecanizado",
    reply:
      "Si el caso tiene que ver con mecanizado, ajuste fino o piezas de trabajo industrial, te conviene entrar por Línea mecanizado para revisar herramientas y componentes.",
    suggestions: ["Herramientas", "Bujes", "Piezas de ajuste"],
  },
];

const quickPrompts = [
  "No me prenden las luces",
  "El retrovisor está flojo",
  "El motor se recalienta",
  "Necesito sellos de caucho",
];

const defaultCategory = "Luces y direccionales" as Categoria;
const defaultHeroImage = "/category-xray-vista-principal.jpg";
const defaultXrayImage = "/category-xray-total.jpg";

const categoryXrayImages: Record<Categoria, string> = {
  "Espejos retrovisores y soportes": "/category-xray-retrovisores.jpg",
  "Motores y ventiladores": "/category-xray-motor.jpg",
  "Luces y direccionales": "/category-xray-luces.jpg",
  "Línea inyección y extrusión": "/category-xray-inyeccion.jpg",
  "Línea mecanizado": "/category-xray-mecanizado.jpg",
  "Línea cauchos": "/category-xray-cauchos.jpg",
};

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

function getAssistantState(message: string) {
  const normalized = normalize(message);
  const match = diagnosticRules.find((rule) =>
    rule.keywords.some((keyword) => normalized.includes(keyword)),
  );

  if (!match) {
    return {
      category: defaultCategory,
      title: "Te oriento a la línea más probable",
      reply:
        "Cuéntame el síntoma principal del vehículo y te sugiero la categoría donde vale la pena empezar a buscar. Puedes escribir algo como “no prenden las luces”, “el motor se recalienta” o “necesito sellos de caucho”.",
      suggestions: ["Luces", "Motores", "Cauchos"],
    };
  }

  return match;
}

export default function BusXrayBanner() {
  const router = useRouter();
  const visualRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Categoria | null>(null);
  const [isLensVisible, setIsLensVisible] = useState(false);
  const [lensPosition, setLensPosition] = useState({ x: 0, y: 0 });

  const assistantState = useMemo(
    () => getAssistantState(userMessage),
    [userMessage],
  );

  const activeCategory = selectedCategory ?? assistantState.category;
  const activeVisual =
    categoriasData.find((category) => category.nombre === activeCategory) ??
    categoriasData[0];
  const isInitialVisual = !selectedCategory && !userMessage;
  const heroImage = selectedCategory
    ? categoryXrayImages[activeCategory]
    : defaultHeroImage;
  const displayReply = !userMessage
    ? "Describe el síntoma principal de tu vehículo y el asistente te va a orientar hacia la categoría más útil, cambiando también la imagen central según la línea recomendada."
    : assistantState.category === activeCategory
    ? assistantState.reply
    : activeVisual.bannerCopy ||
      "Entra por esta línea para revisar los repuestos y referencias relacionadas con esa necesidad.";

  const applyDiagnosis = (message: string) => {
    const diagnosis = getAssistantState(message);
    setUserMessage(message);
    setSelectedCategory(diagnosis.category);
    setDraft("");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();

    if (!text) return;
    applyDiagnosis(text);
  };

  const handleCategorySelect = (category: Categoria) => {
    if (category === activeCategory) {
      router.push(`/categorias?categoria=${slugCategoria(category)}`);
      return;
    }

    setSelectedCategory(category);
  };

  const handleRestoreInitialVisual = () => {
    setSelectedCategory(null);
    setUserMessage("");
    setDraft("");
    setIsLensVisible(false);
  };

  const handleVisualPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isInitialVisual || !visualRef.current) return;

    const bounds = visualRef.current.getBoundingClientRect();
    if (!isLensVisible) {
      setIsLensVisible(true);
    }
    setLensPosition({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  };

  return (
    <section className="overflow-hidden rounded-[8px] border border-black/8 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
      <div className="px-5 pb-8 pt-8 md:px-8 lg:px-10">
        <div className="overflow-hidden rounded-[8px] bg-white">
          <div className="px-4 pb-0 pt-6 md:px-6 lg:px-8">
            <div
              ref={visualRef}
              onPointerEnter={() => isInitialVisual && setIsLensVisible(true)}
              onPointerLeave={() => setIsLensVisible(false)}
              onPointerMove={handleVisualPointerMove}
              className={`relative mt-4 min-h-[360px] overflow-hidden rounded-[8px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),rgba(238,240,243,0.95)_40%,rgba(228,231,235,0.98)_100%)] lg:min-h-[540px] ${
                isInitialVisual ? "cursor-crosshair" : ""
              }`}
            >
              <div className="absolute inset-y-0 left-0 w-24 bg-[linear-gradient(90deg,rgba(243,244,245,0.95),rgba(243,244,245,0.25),transparent)]" />
              <div className="absolute inset-y-0 right-0 w-24 bg-[linear-gradient(270deg,rgba(243,244,245,0.95),rgba(243,244,245,0.25),transparent)]" />
              {heroImage ? (
                <Image
                  src={heroImage}
                  alt={selectedCategory ? activeCategory : "Vista principal del sistema"}
                  fill
                  priority
                  sizes="100vw"
                  className="object-cover object-center"
                />
              ) : null}

              {isInitialVisual && isLensVisible ? (
                <div className="pointer-events-none absolute inset-0 z-[15]">
                  <div
                    className="absolute h-[136px] w-[136px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/85 shadow-[0_20px_40px_rgba(15,23,42,0.18),inset_0_0_0_1px_rgba(22,56,79,0.12)]"
                    style={{
                      left: `${lensPosition.x}px`,
                      top: `${lensPosition.y}px`,
                      backgroundImage: `url(${defaultXrayImage})`,
                      backgroundRepeat: "no-repeat",
                      backgroundSize: `${visualRef.current?.clientWidth ?? 0}px ${visualRef.current?.clientHeight ?? 0}px`,
                      backgroundPosition: `${-(lensPosition.x - 68)}px ${-(lensPosition.y - 68)}px`,
                    }}
                  />

                  <div
                    className="absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/92 text-[#0C535B] shadow-[0_10px_22px_rgba(15,23,42,0.14)]"
                    style={{
                      left: `${lensPosition.x + 52}px`,
                      top: `${lensPosition.y + 54}px`,
                    }}
                  >
                    <div className="flex h-full w-full items-center justify-center">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="11" cy="11" r="6.5" />
                        <path d="m16 16 4.5 4.5" />
                      </svg>
                    </div>
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleRestoreInitialVisual}
                disabled={isInitialVisual}
                className={`absolute bottom-4 left-4 z-20 inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] shadow-[0_10px_22px_rgba(15,23,42,0.12)] backdrop-blur-[4px] transition-all duration-200 ${
                  isInitialVisual
                    ? "cursor-default border-white/55 bg-white/60 text-[#0C535B]/45"
                    : "border-white/75 bg-white/92 text-[#0C535B] hover:bg-white"
                }`}
              >
                Restore
              </button>

              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0.76)_42%,rgba(255,255,255,0.18)_78%,rgba(255,255,255,0)_100%)] px-5 pb-7 pt-8 text-center md:px-10 lg:px-12 lg:pb-8 lg:pt-10">
                <div className="mx-auto max-w-[760px]">
                  <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[#3e4349] md:text-5xl">
                    {selectedCategory ? activeCategory : "Habla con Kliniu y encuentra la línea correcta"}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-[#5f666d] md:text-base">
                    {displayReply}
                  </p>
                </div>
              </div>

              <div className="absolute right-5 top-20 z-10 hidden w-[172px] lg:grid lg:grid-cols-2 lg:gap-2.5">
                {categoriasData.map((category) => {
                  const isActive = category.nombre === activeCategory;

                  return (
                    <button
                      key={category.nombre}
                      type="button"
                      onClick={() => handleCategorySelect(category.nombre)}
                      className={`flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-[8px] border px-2 py-2 text-center transition-all duration-200 ${
                        isActive
                          ? "border-[#27B1B8]/38 bg-white shadow-[0_10px_24px_rgba(237,132,53,0.12)]"
                          : "border-black/5 bg-white/72 opacity-42 backdrop-blur-[2px] hover:opacity-72"
                      }`}
                    >
                      <div className="relative flex h-7 w-10 items-center justify-center overflow-hidden">
                        {category.iconoImagen ? (
                          <Image
                            src={category.iconoImagen}
                            alt={category.nombre}
                            width={40}
                            height={24}
                            sizes="40px"
                            className="h-6 w-10 object-contain"
                          />
                        ) : null}
                      </div>
                      <p className="text-[8px] font-semibold leading-[1.15] text-[#3e4349]">
                        {category.nombre}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="border-t border-black/6 bg-white px-4 py-5 md:px-6 lg:px-8">
            <div className="rounded-[8px] border border-black/8 bg-white px-5 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-12 shrink-0">
                    <Image
                      src="/chatbot/kliniu-bot.png"
                      alt="Kliniu"
                      fill
                      sizes="48px"
                      className="object-contain object-bottom"
                    />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7f8790]">
                      Asistente Kliniu
                    </p>
                    <h3 className="mt-1 text-[1.5rem] font-semibold leading-[0.96] tracking-[-0.05em] text-[#0C535B]">
                      Que tiene tu vehiculo?
                    </h3>
                  </div>
                </div>
                <div className="mt-4 h-[3px] w-full max-w-[320px] rounded-full bg-[#D8F1EE]">
                  <div className="h-full w-24 rounded-full bg-[#27B1B8]" />
                </div>
              </div>

              <form
                onSubmit={handleSubmit}
                className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px]"
              >
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={2}
                  placeholder="Ej. el bus se apaga, casi no frena o no prenden las luces"
                  className="min-h-[64px] w-full resize-none rounded-[8px] border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                />
                <button
                  type="submit"
                  className="rounded-[8px] bg-[#27B1B8] px-4 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#1E969B]"
                >
                  Enviar
                </button>
              </form>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:hidden">
              {categoriasData.map((category) => {
                const isActive = category.nombre === activeCategory;

                return (
                  <button
                    key={category.nombre}
                    type="button"
                    onClick={() => handleCategorySelect(category.nombre)}
                    className={`flex flex-col items-center justify-center gap-2 rounded-[8px] border px-3 py-3 text-center transition-all duration-200 ${
                      isActive
                        ? "border-[#27B1B8]/38 bg-[#EAF8F6] opacity-100 shadow-[0_10px_24px_rgba(237,132,53,0.12)]"
                        : "border-black/6 bg-[#fbfbfa] opacity-35 hover:opacity-70"
                    }`}
                  >
                    <div className="relative flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-[#eef1f3]">
                      {category.iconoImagen ? (
                        <Image
                          src={category.iconoImagen}
                          alt={category.nombre}
                          width={54}
                          height={36}
                          sizes="64px"
                          className="h-9 w-12 object-contain"
                        />
                      ) : null}
                    </div>
                    <p className="text-xs font-semibold leading-4 text-[#3e4349]">
                      {category.nombre}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-white px-5 py-6 md:px-8 lg:px-10">
          <h3 className="text-3xl font-semibold tracking-[-0.04em] text-[#3e4349] md:text-4xl">
            {selectedCategory ? activeCategory : "Empieza escribiendo el síntoma"}
          </h3>
          <p className="mt-3 max-w-[52rem] text-sm leading-7 text-[#5f666d] md:text-base">
            {displayReply}
          </p>
        </div>
      </div>
    </section>
  );
}
