import Image from "next/image";
import Link from "next/link";

const colPoliticas = [
  { label: "Políticas de privacidad", href: "/politicas/privacidad" },
  { label: "Garantía de Productos", href: "/politicas/garantia" },
  { label: "Devoluciones", href: "/politicas/devoluciones" },
  { label: "Tratamiento de datos personales", href: "/politicas/tratamiento-datos" },
];

const colContacto = [
  { label: "+57 320 8905307", href: "https://wa.me/573208905307", icon: "/icono-whatsapp.png" },
  { label: "ventas@kliniu.com", href: "mailto:ventas@kliniu.com", icon: "/icono-correo.png" },
  {
    label: "Av 28 No. 34-43 Barrio la Soledad\nBogotá, Colombia.",
    href: "https://www.google.com/maps/search/?api=1&query=Av+28+No.+34-43+Bogota+Colombia",
    icon: "/icono-ubicacion.png",
  },
];

export default function SiteFooter() {
  return (
    <footer className="relative mb-[-4rem] mt-10 overflow-hidden pb-[4rem] md:mt-0 lg:mb-0 lg:pb-0" style={{ background: "#050C14", color: "#fff" }}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_48%_18%,rgba(111,199,195,0.56)_0%,rgba(24,121,121,0.42)_28%,rgba(5,12,20,0)_66%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,#020814_0%,#052c33_33%,#0d6e6d_53%,#062d35_73%,#020814_100%)] opacity-90" />
      <div className="relative z-10 mx-auto max-w-[1440px] px-8 py-14 sm:px-10 md:px-16 md:py-16 lg:px-24">
        <div className="grid gap-10 md:grid-cols-[1.25fr_0.9fr_1.15fr] md:items-start md:gap-16">
          {/* Brand */}
          <div className="flex justify-center md:justify-start md:pt-16">
            <Link href="/" className="inline-flex">
              <Image
                src="/logo-white.png"
                alt="Kliniu"
                width={260}
                height={72}
                className="h-auto w-[210px] sm:w-[260px] md:w-[280px]"
              />
            </Link>
          </div>

          <div className="text-left">
            <p className="mb-6 text-[18px] font-extrabold leading-none text-white">Políticas</p>
            <ul className="space-y-3">
              {colPoliticas.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-[16px] leading-snug text-white transition-colors hover:text-white/75 md:text-[18px]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="text-left">
            <p className="mb-6 text-[18px] font-extrabold leading-none text-white">
              Departamento comercial
            </p>
            <ul className="space-y-3">
              {colContacto.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    target={item.href.startsWith("http") ? "_blank" : undefined}
                    rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                    className="flex items-start gap-4 whitespace-pre-line text-[16px] leading-[1.12] text-white transition-colors hover:text-white/75 md:text-[18px]"
                  >
                    <Image
                      src={item.icon}
                      alt=""
                      width={24}
                      height={24}
                      className="mt-[-2px] h-6 w-6 shrink-0 brightness-0 invert"
                    />
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
