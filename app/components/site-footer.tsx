import Image from "next/image";
import Link from "next/link";

const colNuestrosProductos = [
  { label: "Dispensadores", href: "/categorias" },
  { label: "Envases", href: "/categorias" },
  { label: "Empaques", href: "/categorias" },
  { label: "Productos para el hogar", href: "/categorias" },
  { label: "Insumos líquidos", href: "/categorias" },
];

const colPoliticas = [
  { label: "Políticas de privacidad", href: "/contacto" },
  { label: "Garantía de Productos", href: "/contacto" },
  { label: "Devoluciones", href: "/contacto" },
  { label: "Tratamiento de datos personales", href: "/contacto" },
];

const colContacto = [
  { label: "+57 312 5860921", href: "tel:+573125860921" },
  { label: "+57 322 6556454", href: "tel:+573226556454" },
  { label: "+57 320 8905307", href: "tel:+573208905307" },
  { label: "ventas@kliniu.com", href: "mailto:ventas@kliniu.com" },
  {
    label: "Av 28 No. 34-43 Barrio la Soledad\nBogotá, Colombia.",
    href: "https://www.google.com/maps/search/?api=1&query=Av+28+No.+34-43+Bogota+Colombia",
  },
];

export default function SiteFooter() {
  return (
    <footer className="bg-[#081018] text-white">
      <div className="mx-auto max-w-[1440px] px-6 py-14 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="inline-flex">
              <Image
                src="/logo-white.png"
                alt="Kliniu"
                width={140}
                height={48}
                style={{ width: "140px", height: "auto" }}
              />
            </Link>
            <p className="text-xs font-medium tracking-wider text-white/45">
              Dispensing and cleaning smart
            </p>
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
                      className="whitespace-pre-line text-sm text-white/55 transition-colors hover:text-white"
                    >
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
