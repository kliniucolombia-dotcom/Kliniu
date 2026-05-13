import Image from "next/image";
import Link from "next/link";

const beneficios = [
  {
    titulo: "Catálogo amplio",
    descripcion: "Miles de referencias disponibles para tus vehículos",
    icono: "/icon-catalogo.png",
  },
  {
    titulo: "Entrega rápida",
    descripcion: "Recibe tus repuestos en el menor tiempo posible",
    icono: "/icon-entrega.png",
  },
  {
    titulo: "Compra segura",
    descripcion: "Protegemos tu información en cada transacción",
    icono: "/icon-segura.png",
  },
];

export default function QuienesSomosPage() {
  return (
    <main className="min-h-screen bg-white text-[#1c2c3a]">
      
      {/* 1. BANNER PRINCIPAL */}
      <section className="relative w-full min-h-[550px] md:min-h-[700px] flex items-center bg-[#f2f2f2] overflow-hidden">
        
        {/* Capa de Imagen (Robot) */}
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url('/robot-kliniu.jpg')`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right center",
            backgroundSize: "contain", 
          }}
        />

        {/* Capa de Degradado */}
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#f2f2f2] via-[#f2f2f2]/90 to-transparent md:via-[#f2f2f2]/30" />

        <div className="relative z-20 mx-auto max-w-[1280px] w-full px-6 md:px-10">
          <div className="max-w-[700px]">
            <p className="text-[14px] font-bold uppercase tracking-[0.25em] text-[#27B1B8]">
              ¿QUIÉNES SOMOS?
            </p>

            <h1 className="mt-6 text-[45px] font-black leading-[1.05] tracking-[-0.03em] text-[#0C535B] md:text-[65px] lg:text-[75px]">
              Impulsamos <br />
              <span className="text-[#27B1B8]">el movimiento</span> <br />
              de miles de vehículos
            </h1>

            <p className="mt-8 max-w-[500px] text-[18px] leading-relaxed text-[#4c6275] md:text-[21px]">
              En <span className="font-bold text-[#0C535B]">Kliniu</span> conectamos calidad, tecnología y confianza para que encuentres el repuesto exacto en toda Colombia.
            </p>

            <div className="mt-10">
              <Link 
                href="/catalogo" 
                className="inline-block bg-[#0C535B] text-white px-8 py-4 rounded-full font-bold hover:bg-[#27B1B8] transition-all shadow-lg hover:-translate-y-1"
              >
                Explorar Catálogo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SECCIÓN DE CONTENIDO */}
      <section className="mx-auto max-w-[1280px] px-6 py-24 md:px-10">
        
        {/* BENEFICIOS */}
        <div className="grid gap-8 md:grid-cols-3">
          {beneficios.map((item) => (
            <article
              key={item.titulo}
              className="group flex flex-col items-center rounded-[40px] border border-[#f0f0f0] bg-white p-10 text-center shadow-[0_15px_45px_rgba(0,0,0,0.05)] transition-all hover:border-[#27B1B8]/30 hover:shadow-[0_25px_60px_rgba(0,0,0,0.1)]"
            >
              <div className="mb-8 flex h-[110px] w-[110px] items-center justify-center rounded-full bg-[#f6f6f6] shadow-inner group-hover:scale-110 transition-transform">
                <div className="flex h-[85px] w-[85px] items-center justify-center rounded-full bg-white shadow-md border border-[#f0f0f0]">
                  <Image
                    src={item.icono}
                    alt={item.titulo}
                    width={40}
                    height={40}
                    style={{ width: "40px", height: "auto" }} // CORRECCIÓN AQUÍ
                    className="object-contain"
                  />
                </div>
              </div>
              <h2 className="text-[24px] font-black tracking-tight text-[#0C535B]">{item.titulo}</h2>
              <div className="my-5 h-[4px] w-14 rounded-full bg-[#27B1B8]" />
              <p className="max-w-[220px] text-[16px] leading-relaxed text-[#5c7285]">{item.descripcion}</p>
            </article>
          ))}
        </div>

        {/* MISIÓN Y VISIÓN */}
        <div className="mt-28 flex flex-col gap-6">
          
          {/* MISIÓN */}
          <div className="grid gap-8 rounded-lg border border-black/8 bg-white px-8 py-8 shadow-[0_18px_42px_rgba(15,23,42,0.06)] transition-all duration-300 hover:shadow-[0_24px_50px_rgba(15,23,42,0.09)] md:grid-cols-[120px_minmax(0,1fr)] md:px-10 md:py-10">
            <div className="flex h-[104px] w-[104px] items-center justify-center rounded-lg bg-[#EAF8F6] shadow-[inset_0_0_0_1px_rgba(237,132,53,0.08)]">
              <Image 
                src="/icon-mision.png" 
                alt="Misión" 
                width={52} 
                height={52} 
                style={{ width: "52px", height: "auto" }}
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#27B1B8]">
                Nuestra esencia
              </p>
              <h3 className="mt-3 text-[2rem] font-semibold tracking-[-0.05em] text-[#0C535B] md:text-[2.5rem]">
                Nuestra Misión
              </h3>
              <div className="mt-4 max-w-[56rem] space-y-3 text-[1.05rem] leading-8 text-[#526474]">
                <p>
                  Ser la empresa lider en el suministro de partes y repuestos de alta calidad para el sector carrocero y automotriz, ofreciendo un servicio excepcional y precios competitivos.
                </p>
                <p>
                  Brindar soluciones integrales a las necesidades de nuestros clientes, contribuyendo al exito de sus negocios.
                </p>
                <p>
                  Fomentar una cultura de excelencia en todos los aspectos de nuestra empresa, basada en la responsabilidad, el trabajo en equipo y la innovacion.
                </p>
              </div>
            </div>
          </div>
          
          {/* VISIÓN */}
          <div className="grid gap-8 rounded-lg border border-black/8 bg-white px-8 py-8 shadow-[0_18px_42px_rgba(15,23,42,0.06)] transition-all duration-300 hover:shadow-[0_24px_50px_rgba(15,23,42,0.09)] md:grid-cols-[120px_minmax(0,1fr)] md:px-10 md:py-10">
            <div className="flex h-[104px] w-[104px] items-center justify-center rounded-lg bg-[#EAF8F6] shadow-[inset_0_0_0_1px_rgba(237,132,53,0.08)]">
              <Image 
                src="/icon-vision.png" 
                alt="Visión" 
                width={52} 
                height={52} 
                style={{ width: "52px", height: "auto" }}
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#27B1B8]">
                Hacia donde vamos
              </p>
              <h3 className="mt-3 text-[2rem] font-semibold tracking-[-0.05em] text-[#0C535B] md:text-[2.5rem]">
                Nuestra Visión
              </h3>
              <div className="mt-4 max-w-[56rem] space-y-3 text-[1.05rem] leading-8 text-[#526474]">
                <p>
                  Ser reconocidos como la empresa mas confiable y respetada del sector carrocero y automotriz, tanto por nuestros clientes como por nuestros proveedores.
                </p>
                <p>
                  Expandir nuestra presencia a nivel nacional e internacional, consolidando nuestra posicion como lideres en el mercado.
                </p>
                <p>
                  Convertirnos en un referente en materia de calidad, innovacion y atencion al cliente.
                </p>
              </div>
            </div>
          </div>
        </div>

      </section>
    </main>
  );
}
