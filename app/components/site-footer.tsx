import Image from "next/image";
import Link from "next/link";

const colNuestrosProductos = [
  { label: "Dispensadores", href: "/categorias" },
  { label: "Envases", href: "/categorias?q=envase" },
  { label: "Empaques", href: "/categorias?q=empaque" },
  { label: "Productos para el hogar", href: "/categorias?q=hogar" },
  { label: "Insumos líquidos", href: "/categorias?tipo=insumos&q=jabon" },
];

const colPoliticas = [
  { label: "Políticas de privacidad", href: "/politicas/privacidad" },
  { label: "Garantía de Productos", href: "/politicas/garantia" },
  { label: "Devoluciones", href: "/politicas/devoluciones" },
  { label: "Tratamiento de datos personales", href: "/politicas/tratamiento-datos" },
];

const colContacto = [
  { label: "+57 312 5860921", href: "tel:+573125860921", icon: "/icono-telefono.png" },
  { label: "+57 322 6556454", href: "tel:+573226556454", icon: "/icono-telefono.png" },
  { label: "+57 320 8905307", href: "tel:+573208905307", icon: "/icono-telefono.png" },
  { label: "ventas@kliniu.com", href: "mailto:ventas@kliniu.com", icon: "/icono-correo.png" },
  {
    label: "Av 28 No. 34-43 Barrio la Soledad\nBogotá, Colombia.",
    href: "https://www.google.com/maps/search/?api=1&query=Av+28+No.+34-43+Bogota+Colombia",
    icon: "/icono-ubicacion.png",
  },
];

export default function SiteFooter() {
  return (
    <footer className="relative overflow-hidden" style={{ background: "#050C14", color: "#fff" }}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_46%_34%,rgba(39,177,184,0.34)_0%,rgba(12,83,91,0.24)_24%,rgba(5,12,20,0)_58%)]" />
      <div className="relative z-10 mx-auto max-w-[1440px] px-6 py-10 lg:px-8 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[220px_1fr] lg:gap-10">
          {/* Brand */}
          <div className="flex flex-col">
            <Link href="/" className="inline-flex">
              <Image
                src="/logo-white.png"
                alt="Kliniu"
                width={180}
                height={62}
                style={{ width: "150px", height: "auto" }}
              />
            </Link>
          </div>

          {/* Columns */}
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <p className="mb-5 text-sm font-bold text-white">Nuestros productos</p>
              <ul className="space-y-3">
                {colNuestrosProductos.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-white/55 transition-colors hover:text-white"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="mb-5 text-sm font-bold text-white">Políticas</p>
              <ul className="space-y-3">
                {colPoliticas.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-white/55 transition-colors hover:text-white"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="mb-5 text-sm font-bold text-white">Departamento comercial</p>
              <ul className="space-y-3">
                {colContacto.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      target={item.href.startsWith("http") ? "_blank" : undefined}
                      rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                      className="flex items-start gap-2 whitespace-pre-line text-sm text-white/55 transition-colors hover:text-white"
                    >
                      <Image
                        src={item.icon}
                        alt=""
                        width={16}
                        height={16}
                        className="mt-0.5 shrink-0 brightness-0 invert opacity-55"
                      />
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/8 pt-6 text-xs text-white/35">
          © 2026 Kliniu. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
