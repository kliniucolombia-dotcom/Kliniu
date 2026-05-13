export type CategoriaMeta = {
  nombre: string;
  color: string;
  icono: string;
  iconoImagen?: string;
  bannerImagen?: string;
  bannerCopy?: string;
  heroDestacado?: string;
  beneficiosHero?: { icono: string; texto: string }[];
  comoElegir?: { icono: string; titulo: string; descripcion: string }[];
};

export const categoriasData: readonly CategoriaMeta[] = [
  {
    nombre: "Dispensadores para líquidos",
    color: "#27B1B8",
    icono: "◒",
    bannerImagen: "/category-banner-luces.jpg",
    bannerCopy: "Soluciones de dispensación líquida para higiene eficiente en cualquier espacio.",
    heroDestacado: "de líquidos",
    beneficiosHero: [
      { icono: "💧", texto: "Dosificación exacta" },
      { icono: "💰", texto: "Ahorro de insumos" },
      { icono: "🛡️", texto: "Higiene superior y confiable" },
      { icono: "🔧", texto: "Fáciles de instalar y mantener" },
    ],
    comoElegir: [
      { icono: "👥", titulo: "Capacidad", descripcion: "Elige según el número de personas que lo usarán diariamente." },
      { icono: "💧", titulo: "Tipo de líquido", descripcion: "Asegúrate de que el dispensador sea compatible con el líquido que vas a usar." },
      { icono: "🔩", titulo: "Instalación", descripcion: "Considera el tipo de montaje y el espacio disponible." },
      { icono: "🚦", titulo: "Tipo de uso", descripcion: "Alto tráfico requiere dispensadores automáticos de mayor capacidad." },
    ],
  },
  {
    nombre: "Dispensadores de papel, toalla y servilletas",
    color: "#0C535B",
    icono: "◎",
    bannerImagen: "/category-banner-motor.jpg",
    bannerCopy: "Sistemas de dispensación de papel diseñados para crear higiene, ahorro y eficiencia en cada uso.",
    heroDestacado: "de papel",
    beneficiosHero: [
      { icono: "💰", texto: "Ahorro en consumo" },
      { icono: "📦", texto: "Despacho controlado" },
      { icono: "💪", texto: "Alta resistencia y durabilidad" },
      { icono: "🔧", texto: "Fácil instalación y mantenimiento" },
    ],
    comoElegir: [
      { icono: "👥", titulo: "Capacidad", descripcion: "Elige según el flujo de personas y la frecuencia de uso." },
      { icono: "📄", titulo: "Tipo de papel", descripcion: "Interdoblado, rollo o jumbo según tus necesidades." },
      { icono: "🚦", titulo: "Nivel de uso", descripcion: "Alto tráfico requiere dispensadores más resistentes y de mayor capacidad." },
      { icono: "🔩", titulo: "Instalación", descripcion: "Considera el tipo de montaje y el espacio disponible." },
    ],
  },
  {
    nombre: "KlinOx Acero Inoxidable",
    color: "#555",
    icono: "◍",
    bannerImagen: "/category-banner-mecanizado.jpg",
    bannerCopy: "Dispensadores premium en acero inoxidable diseñados para máxima durabilidad, higiene y elegancia.",
    heroDestacado: "Acero Inoxidable",
    beneficiosHero: [
      { icono: "✨", texto: "Acero inoxidable de alta calidad" },
      { icono: "💧", texto: "Resistente a la corrosión y humedad" },
      { icono: "🎨", texto: "Diseño elegante y moderno" },
      { icono: "🔧", texto: "Fácil instalación y mantenimiento" },
    ],
    comoElegir: [
      { icono: "👥", titulo: "Capacidad", descripcion: "Elige según el flujo de personas y la frecuencia de uso." },
      { icono: "🧴", titulo: "Tipo de producto", descripcion: "Define si necesitas jabón, papel o una solución combinada." },
      { icono: "🚦", titulo: "Nivel de uso", descripcion: "Alto tráfico requiere mayor capacidad y resistencia." },
      { icono: "🔩", titulo: "Instalación", descripcion: "Considera el tipo de montaje y el espacio disponible." },
    ],
  },
  {
    nombre: "Dispensador de crema dental",
    color: "#4caf9a",
    icono: "◇",
    bannerImagen: "/category-banner-cauchos.jpg",
    bannerCopy: "Sistemas de dispensación higiénica de crema dental para instituciones, colegios y empresas.",
    heroDestacado: "de crema dental",
    beneficiosHero: [
      { icono: "🧴", texto: "Dosificación higiénica" },
      { icono: "💰", texto: "Ahorro y control" },
      { icono: "🛡️", texto: "Mayor higiene y seguridad" },
      { icono: "🔧", texto: "Fácil instalación y recarga" },
    ],
    comoElegir: [
      { icono: "🖐️", titulo: "Tipo de dispensador", descripcion: "Manual o automático según el nivel de uso y preferencia." },
      { icono: "👥", titulo: "Capacidad", descripcion: "Elige la capacidad adecuada según la cantidad de usuarios." },
      { icono: "🔩", titulo: "Instalación", descripcion: "Pared o sobreponer, según el espacio disponible." },
      { icono: "🏫", titulo: "Uso recomendado", descripcion: "Institucional, empresarial, colegios y más." },
    ],
  },
  {
    nombre: "Hoteles y Restaurantes",
    color: "#8b6b4a",
    icono: "◓",
    bannerImagen: "/category-banner-electrica.jpg",
    bannerCopy: "Soluciones de higiene y dispensación diseñadas para elevar la experiencia de tus huéspedes y clientes.",
    heroDestacado: "Restaurantes",
    beneficiosHero: [
      { icono: "⭐", texto: "Experiencia superior" },
      { icono: "💰", texto: "Ahorro y eficiencia" },
      { icono: "🛡️", texto: "Higiene garantizada" },
      { icono: "✨", texto: "Diseños que elevan tu marca" },
    ],
    comoElegir: [
      { icono: "👥", titulo: "Capacidad", descripcion: "Elige según el flujo de personas y la frecuencia de uso." },
      { icono: "🧴", titulo: "Tipo de producto", descripcion: "Define si necesitas jabón, papel o una solución combinada." },
      { icono: "🚦", titulo: "Nivel de uso", descripcion: "Alto tráfico requiere mayor capacidad y resistencia." },
      { icono: "🔩", titulo: "Instalación", descripcion: "Considera el tipo de montaje y el espacio disponible." },
    ],
  },
] as const;

export type Categoria = (typeof categoriasData)[number]["nombre"];
export const categorias = categoriasData.map((item) => item.nombre) as Categoria[];
export const disponibilidades = [
  "Entrega inmediata",
  "Disponible por pedido",
  "Recoger en tienda",
  "Agotado",
] as const;
export type Disponibilidad = (typeof disponibilidades)[number];

export type ProductoEspecificacion = {
  etiqueta: string;
  valor: string;
};

export type ProductoCatalogo = {
  slug: string;
  sku?: string;
  oemReferencia?: string;
  referenciasAlternas?: string[];
  categoria: Categoria;
  nombre: string;
  marca: string;
  precio: string;
  precioAnterior: string;
  precioValor: number;
  stock?: number;
  stockMinimo?: number;
  estadoInventario?: "in-stock" | "low-stock" | "out-of-stock";
  puedeComprar?: boolean;
  descuento: string;
  imagen: string;
  imagenesExtra?: string[];
  disponibilidad: Disponibilidad;
  descripcion?: string;
  aplicacion?: string;
  compatibilidad?: string[];
  garantia?: string;
  especificacionesTecnicas?: ProductoEspecificacion[];
  destacado?: boolean;
};

export const productosCatalogo: ProductoCatalogo[] = [
  {
    slug: "dispensador-jabon-automatico-1000ml",
    sku: "DO.AT.JB1.000ML-036",
    categoria: "Dispensadores para líquidos",
    nombre: "Dispensador de jabón automático 1000 ml",
    marca: "Kliniu",
    precio: "$60.900",
    precioAnterior: "$75.000",
    precioValor: 60900,
    descuento: "-19%",
    imagen: "/motor-ventilador-axis-compact.png",
    disponibilidad: "Entrega inmediata",
    destacado: true,
    descripcion: "Sensor automático · 1.000 ml · Hecho en Colombia",
    especificacionesTecnicas: [
      { etiqueta: "Capacidad", valor: "1.000 ml" },
      { etiqueta: "Alto", valor: "20.3 cm" },
      { etiqueta: "Ancho", valor: "11.5 cm" },
      { etiqueta: "Profundidad", valor: "7 cm" },
      { etiqueta: "Peso", valor: "300.5 grs" },
      { etiqueta: "Material", valor: "Policarbonato y ABS" },
      { etiqueta: "Baterías", valor: "4 AA (1.5V alcalinas)" },
      { etiqueta: "Fuente de poder", valor: "6V – 1A" },
      { etiqueta: "Instalación", valor: "Mesa o pared" },
    ],
  },
  {
    slug: "dispensador-jabon-automatico-500ml",
    categoria: "Dispensadores para líquidos",
    nombre: "Dispensador de jabón automático 500 ml",
    marca: "Kliniu",
    precio: "$49.900",
    precioAnterior: "$62.000",
    precioValor: 49900,
    descuento: "-19%",
    imagen: "/motor-ventilador-axis-compact.png",
    disponibilidad: "Entrega inmediata",
  },
  {
    slug: "dispensador-alcohol-gel-automatico-1000ml",
    categoria: "Dispensadores para líquidos",
    nombre: "Dispensador alcohol gel automático 1000 ml",
    marca: "Kliniu",
    precio: "$55.900",
    precioAnterior: "$69.000",
    precioValor: 55900,
    descuento: "-19%",
    imagen: "/motor-ventilador-axis-compact.png",
    disponibilidad: "Entrega inmediata",
  },
  {
    slug: "dispensador-espuma-manual-800ml",
    categoria: "Dispensadores para líquidos",
    nombre: "Dispensador de espuma manual 800 ml",
    marca: "Kliniu",
    precio: "$44.900",
    precioAnterior: "$55.000",
    precioValor: 44900,
    descuento: "-18%",
    imagen: "/motor-ventilador-axis-compact.png",
    disponibilidad: "Entrega inmediata",
  },
  {
    slug: "dispensador-jabon-pared-doble-1200ml",
    categoria: "Dispensadores para líquidos",
    nombre: "Dispensador de jabón pared doble 1200 ml",
    marca: "Kliniu",
    precio: "$72.900",
    precioAnterior: "$89.000",
    precioValor: 72900,
    descuento: "-18%",
    imagen: "/motor-ventilador-axis-compact.png",
    disponibilidad: "Disponible por pedido",
  },
  {
    slug: "dispensador-toallas-ecotowel-interdobladas",
    categoria: "Dispensadores de papel, toalla y servilletas",
    nombre: "Dispensador de toallas ECOTOWEL Interdobladas",
    marca: "Kliniu",
    precio: "$49.900",
    precioAnterior: "$62.000",
    precioValor: 49900,
    descuento: "-19%",
    imagen: "/motor-ventilador-axis-compact.png",
    disponibilidad: "Entrega inmediata",
    destacado: true,
    descripcion: "Interdobladas · 600 toallas · Alto tráfico",
  },
  {
    slug: "dispensador-toallas-ecotowel-jumbo",
    categoria: "Dispensadores de papel, toalla y servilletas",
    nombre: "Dispensador de toallas ECOTOWEL Jumbo",
    marca: "Kliniu",
    precio: "$54.900",
    precioAnterior: "$68.000",
    precioValor: 54900,
    descuento: "-19%",
    imagen: "/motor-ventilador-axis-compact.png",
    disponibilidad: "Entrega inmediata",
  },
  {
    slug: "dispensador-papel-higienico-jumbo",
    categoria: "Dispensadores de papel, toalla y servilletas",
    nombre: "Dispensador papel higiénico jumbo",
    marca: "Kliniu",
    precio: "$39.900",
    precioAnterior: "$49.000",
    precioValor: 39900,
    descuento: "-18%",
    imagen: "/motor-ventilador-axis-compact.png",
    disponibilidad: "Entrega inmediata",
  },
  {
    slug: "dispensador-servilletas-sobremesa",
    categoria: "Dispensadores de papel, toalla y servilletas",
    nombre: "Dispensador de servilletas sobremesa",
    marca: "Kliniu",
    precio: "$29.900",
    precioAnterior: "$37.000",
    precioValor: 29900,
    descuento: "-19%",
    imagen: "/motor-ventilador-axis-compact.png",
    disponibilidad: "Entrega inmediata",
  },
  {
    slug: "dispensador-espuma-1200ml-acero-inoxidable",
    categoria: "KlinOx Acero Inoxidable",
    nombre: "Dispensador de espuma 1200 ml acero inoxidable",
    marca: "KlinOx",
    precio: "$89.900",
    precioAnterior: "$109.000",
    precioValor: 89900,
    descuento: "-17%",
    imagen: "/motor-ventilador-axis-compact.png",
    disponibilidad: "Entrega inmediata",
    destacado: true,
    descripcion: "Acero inoxidable 304 · 1.200 ml · Manual",
  },
  {
    slug: "dispensador-toallas-mano-acero-inoxidable",
    categoria: "KlinOx Acero Inoxidable",
    nombre: "Dispensador de toallas de mano acero inoxidable",
    marca: "KlinOx",
    precio: "$99.900",
    precioAnterior: "$125.000",
    precioValor: 99900,
    descuento: "-20%",
    imagen: "/motor-ventilador-axis-compact.png",
    disponibilidad: "Entrega inmediata",
  },
  {
    slug: "dispensador-pared-acero-inoxidable-304",
    categoria: "KlinOx Acero Inoxidable",
    nombre: "Dispensador con soporte de pared acero inoxidable 304",
    marca: "KlinOx",
    precio: "$79.900",
    precioAnterior: "$99.000",
    precioValor: 79900,
    descuento: "-19%",
    imagen: "/motor-ventilador-axis-compact.png",
    disponibilidad: "Entrega inmediata",
  },
  {
    slug: "dispensador-crema-dental-2-cepillos-manual",
    categoria: "Dispensador de crema dental",
    nombre: "Dispensador de crema dental para 2 cepillos manual",
    marca: "Kliniu",
    precio: "$49.900",
    precioAnterior: "$62.000",
    precioValor: 49900,
    descuento: "-19%",
    imagen: "/motor-ventilador-axis-compact.png",
    disponibilidad: "Entrega inmediata",
    destacado: true,
    descripcion: "2 cepillos · Manual · Alto tráfico",
  },
  {
    slug: "dispensador-crema-dental-pared-interdoblado",
    categoria: "Dispensador de crema dental",
    nombre: "Dispensador de crema dental pared interdoblado",
    marca: "Kliniu",
    precio: "$44.900",
    precioAnterior: "$56.000",
    precioValor: 44900,
    descuento: "-19%",
    imagen: "/motor-ventilador-axis-compact.png",
    disponibilidad: "Entrega inmediata",
  },
  {
    slug: "dispensador-hotel-shampoo-pared-300ml",
    categoria: "Hoteles y Restaurantes",
    nombre: "Dispensador hotel shampoo pared 300 ml",
    marca: "Kliniu",
    precio: "$49.900",
    precioAnterior: "$62.000",
    precioValor: 49900,
    descuento: "-19%",
    imagen: "/motor-ventilador-axis-compact.png",
    disponibilidad: "Entrega inmediata",
    destacado: true,
    descripcion: "Acero inoxidable · 300 ml · Medio tráfico",
  },
  {
    slug: "dispensador-hotel-triple-shampoo-acondicionador-gel",
    categoria: "Hoteles y Restaurantes",
    nombre: "Dispensador hotel triple shampoo/acondicionador/gel",
    marca: "Kliniu",
    precio: "$89.900",
    precioAnterior: "$115.000",
    precioValor: 89900,
    descuento: "-21%",
    imagen: "/motor-ventilador-axis-compact.png",
    disponibilidad: "Entrega inmediata",
  },
];

export const slugCategoria = (categoria: string) =>
  categoria
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const categoriaDesdeSlug = (slug: string | null) =>
  categorias.find((categoria) => slugCategoria(categoria) === slug) ?? null;

export const categoriaMeta = (categoria: string) =>
  categoriasData.find((item) => item.nombre === categoria) ?? categoriasData[0];

export const productoPorSlug = (slug: string) =>
  productosCatalogo.find((producto) => producto.slug === slug) ?? null;

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function formatearMoneda(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatearDescuento(
  precioActual: number,
  precioAnterior: number,
) {
  const precioBase = Math.max(precioActual, precioAnterior, 1);
  const descuento = Math.max(
    0,
    Math.round(((precioBase - precioActual) / precioBase) * 100),
  );

  return `-${descuento}%`;
}

export function descripcionProducto({
  nombre,
  categoria,
  marca,
}: {
  nombre: string;
  categoria: string;
  marca: string;
}) {
  return `${nombre} de la línea ${categoria}, marca ${marca}, pensado para reposición confiable y operación continua.`;
}
