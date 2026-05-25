import Image from "next/image";
import WhatsAppAsesor from "./whatsapp-asesor";

const BENEFICIOS = [
  { icon: "/iconos/soporte.png", label: "Asesoría gratuita sin compromiso." },
  { icon: "/iconos/whatsapp.png", label: "Respuesta rápida por WhatsApp" },
  { icon: "/iconos/cotizacion.png", label: "Cotizaciones personalizadas" },
];

export default function AsesorBanner() {
  return (
    <div
      className="relative flex items-center rounded-2xl border border-black/8 pr-6 md:pr-8"
      style={{ minHeight: 96, background: "#f8f8f7" }}
    >
      <div className="absolute left-2 top-1/2 h-[272px] w-[238px] -translate-y-1/2">
        <Image
          src="/foca-celular-ayuda.png"
          alt="Foca Kliniu"
          fill
          className="object-contain object-bottom"
        />
      </div>
      <div className="w-[248px] shrink-0" />

      <div className="min-w-0 flex-1 py-5 pl-5">
        <p className="font-bold text-[#0C535B]">¿Necesitas ayuda para elegir?</p>
        <p className="mt-0.5 text-sm text-[#6e7379]">
          Nuestro equipo de expertos está listo para asesorarte sin compromiso
        </p>
      </div>

      <div className="hidden items-center gap-5 lg:flex">
        {BENEFICIOS.map((b) => (
          <div key={b.label} className="flex items-center gap-2 text-xs text-[#555]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.icon} alt="" className="h-8 w-8 shrink-0 object-contain" />
            <span className="max-w-[90px] leading-tight">{b.label}</span>
          </div>
        ))}
      </div>

      <WhatsAppAsesor className="ml-6 shrink-0 rounded-full bg-[#073F43] px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90">
        Hablar con un asesor 💬
      </WhatsAppAsesor>
    </div>
  );
}
