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
    nombre: "Espejos retrovisores y soportes",
    color: "#117f2d",
    icono: "◒",
    iconoImagen: "/category-icon-espejo.png",
    bannerImagen: "/category-banner-espejo-v2.jpg",
    bannerCopy: "Explora espejos, soportes y soluciones listas para una instalación más precisa.",
    heroDestacado: "y soportes",
    beneficiosHero: [
      { icono: "🔭", texto: "Visibilidad optimizada" },
      { icono: "🔧", texto: "Instalación precisa" },
      { icono: "🛡️", texto: "Materiales duraderos" },
      { icono: "🚗", texto: "Alta compatibilidad" },
    ],
    comoElegir: [
      { icono: "🚗", titulo: "Modelo del vehículo", descripcion: "Verifica el modelo y año para asegurar compatibilidad exacta." },
      { icono: "📐", titulo: "Tipo de montaje", descripcion: "Considera si el espejo es manual, eléctrico o con calefacción." },
      { icono: "🎨", titulo: "Acabado", descripcion: "Elige entre negro mate, cromado o pintado según tu preferencia." },
      { icono: "🔧", titulo: "Instalación", descripcion: "Revisa si requiere herramientas especiales o instalación profesional." },
    ],
  },
  {
    nombre: "Motores y ventiladores",
    color: "#7b4bb7",
    icono: "◎",
    iconoImagen: "/category-icon-motor.png",
    bannerImagen: "/category-banner-motor.jpg",
    bannerCopy: "Encuentra motores y ventiladores con foco en rendimiento, ajuste y continuidad de operación.",
    heroDestacado: "y ventiladores",
    beneficiosHero: [
      { icono: "⚡", texto: "Alto rendimiento" },
      { icono: "🌡️", texto: "Control térmico" },
      { icono: "🔩", texto: "Fácil instalación" },
      { icono: "📦", texto: "Entrega rápida" },
    ],
    comoElegir: [
      { icono: "⚡", titulo: "Voltaje", descripcion: "Asegúrate de que el voltaje del motor sea compatible con tu vehículo." },
      { icono: "🌡️", titulo: "Potencia", descripcion: "Elige según las condiciones climáticas y el tamaño del radiador." },
      { icono: "📐", titulo: "Dimensiones", descripcion: "Verifica las medidas para asegurar un ajuste perfecto en el espacio." },
      { icono: "🔧", titulo: "Tipo de conexión", descripcion: "Revisa el tipo de conector eléctrico que requiere tu vehículo." },
    ],
  },
  {
    nombre: "Luces y direccionales",
    color: "#f39a05",
    icono: "◐",
    iconoImagen: "/category-icon-luces.png",
    bannerImagen: "/category-banner-luces.jpg",
    bannerCopy: "Iluminación y direccionales para mejorar visibilidad, seguridad y presencia del vehículo.",
    heroDestacado: "y direccionales",
    beneficiosHero: [
      { icono: "💡", texto: "Mayor visibilidad" },
      { icono: "🔋", texto: "Bajo consumo" },
      { icono: "🛡️", texto: "Larga vida útil" },
      { icono: "🚗", texto: "Fácil instalación" },
    ],
    comoElegir: [
      { icono: "🚗", titulo: "Compatibilidad", descripcion: "Verifica el año y modelo para encontrar la referencia exacta." },
      { icono: "💡", titulo: "Tipo de luz", descripcion: "LED, halógena o xenón según tus necesidades y presupuesto." },
      { icono: "🔧", titulo: "Instalación", descripcion: "Revisa si requiere adaptadores o módulos adicionales." },
      { icono: "🌧️", titulo: "Sellado IP", descripcion: "Asegúrate de que la luz sea resistente al agua y al polvo." },
    ],
  },
  {
    nombre: "Línea inyección y extrusión",
    color: "#2fa8ad",
    icono: "◍",
    iconoImagen: "/category-icon-inyeccion-extrusion.png",
    bannerImagen: "/category-banner-inyeccion-extrusion.jpg",
    bannerCopy: "Una línea pensada para procesos técnicos que exigen control, precisión y estabilidad.",
    heroDestacado: "y extrusión",
    beneficiosHero: [
      { icono: "🎯", texto: "Alta precisión" },
      { icono: "🌡️", texto: "Control térmico" },
      { icono: "⚙️", texto: "Máxima eficiencia" },
      { icono: "🏗️", texto: "Uso industrial" },
    ],
    comoElegir: [
      { icono: "🎯", titulo: "Precisión requerida", descripcion: "Define la tolerancia dimensional que necesita tu proceso." },
      { icono: "🌡️", titulo: "Temperatura de trabajo", descripcion: "Verifica el rango térmico compatible con el material a procesar." },
      { icono: "⚙️", titulo: "Caudal", descripcion: "Calcula el flujo necesario para tu línea de producción." },
      { icono: "🔩", titulo: "Compatibilidad", descripcion: "Asegúrate de que encaje con tu equipo extrusor o inyector." },
    ],
  },
  {
    nombre: "Línea mecanizado",
    color: "#d61f1f",
    icono: "◇",
    iconoImagen: "/category-icon-mecanizado.png",
    bannerImagen: "/category-banner-mecanizado.jpg",
    bannerCopy: "Herramientas y componentes de mecanizado para procesos continuos y acabados más finos.",
    heroDestacado: "mecanizado",
    beneficiosHero: [
      { icono: "⚙️", texto: "Alta precisión" },
      { icono: "🔧", texto: "Durabilidad" },
      { icono: "📏", texto: "Tolerancias exactas" },
      { icono: "🏭", texto: "Uso industrial" },
    ],
    comoElegir: [
      { icono: "📏", titulo: "Tolerancias", descripcion: "Define las especificaciones dimensionales requeridas por tu proceso." },
      { icono: "🔩", titulo: "Material", descripcion: "Elige entre acero, aluminio o aleaciones según la aplicación." },
      { icono: "⚙️", titulo: "Tipo de proceso", descripcion: "Torno, fresado o taladrado según tu maquinaria disponible." },
      { icono: "🏭", titulo: "Volumen", descripcion: "Considera si necesitas piezas en serie o producción unitaria." },
    ],
  },
  {
    nombre: "Línea cauchos",
    color: "#3954b8",
    icono: "◓",
    iconoImagen: "/category-icon-cauchos.png",
    bannerImagen: "/category-banner-cauchos.jpg",
    bannerCopy: "Soluciones en cauchos y sellos para reposición, mantenimiento y trabajo industrial.",
    heroDestacado: "cauchos",
    beneficiosHero: [
      { icono: "🛡️", texto: "Alta resistencia" },
      { icono: "🌡️", texto: "Soporta extremos" },
      { icono: "🔧", texto: "Fácil instalación" },
      { icono: "♻️", texto: "Larga vida útil" },
    ],
    comoElegir: [
      { icono: "🛡️", titulo: "Dureza Shore", descripcion: "Elige el Shore A adecuado según el nivel de compresión requerido." },
      { icono: "🌡️", titulo: "Temperatura", descripcion: "Verifica la resistencia térmica según el entorno de trabajo." },
      { icono: "📐", titulo: "Medidas", descripcion: "Mide el diámetro interior, exterior y la sección del sello." },
      { icono: "⚗️", titulo: "Compatibilidad química", descripcion: "Asegúrate de que el caucho resista los fluidos en contacto." },
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
    slug: "farola-led-pulse-s1",
    categoria: "Luces y direccionales",
    nombre: "Farola LED Pulse S1",
    marca: "Kliniu",
    precio: "$189.900",
    precioAnterior: "$239.900",
    precioValor: 189900,
    descuento: "-21%",
    imagen: "/hero-kliniu.jpg",
    disponibilidad: "Entrega inmediata",
    destacado: true,
    descripcion: "LED de alta potencia · Sellado IP67 · Universal",
  },
  {
    slug: "kit-direccional-orbit-pro",
    categoria: "Luces y direccionales",
    nombre: "Kit direccional Orbit Pro",
    marca: "Original Parts",
    precio: "$154.500",
    precioAnterior: "$198.000",
    precioValor: 154500,
    descuento: "-18%",
    imagen: "/hero-kliniu.jpg",
    disponibilidad: "Entrega inmediata",
  },
  {
    slug: "luz-auxiliar-nexo-beam",
    categoria: "Luces y direccionales",
    nombre: "Luz auxiliar Nexo Beam",
    marca: "ProLine",
    precio: "$267.900",
    precioAnterior: "$329.900",
    precioValor: 267900,
    descuento: "-19%",
    imagen: "/hero-kliniu.jpg",
    disponibilidad: "Disponible por pedido",
  },
  {
    slug: "modulo-trasero-vector-light",
    categoria: "Luces y direccionales",
    nombre: "Módulo trasero Vector Light",
    marca: "MotorTech",
    precio: "$221.000",
    precioAnterior: "$279.000",
    precioValor: 221000,
    descuento: "-20%",
    imagen: "/hero-kliniu.jpg",
    disponibilidad: "Recoger en tienda",
  },
  {
    slug: "juego-exploradoras-nova-led",
    categoria: "Luces y direccionales",
    nombre: "Juego exploradoras Nova LED",
    marca: "Kliniu",
    precio: "$312.400",
    precioAnterior: "$389.000",
    precioValor: 312400,
    descuento: "-20%",
    imagen: "/hero-kliniu.jpg",
    disponibilidad: "Disponible por pedido",
  },
  {
    slug: "motor-ventilador-axis-compact",
    categoria: "Motores y ventiladores",
    nombre: "Motor ventilador Axis Compact",
    marca: "MotorTech",
    precio: "$338.500",
    precioAnterior: "$410.000",
    precioValor: 338500,
    descuento: "-17%",
    imagen: "/motor-ventilador-axis-compact.png",
    disponibilidad: "Entrega inmediata",
    destacado: true,
    descripcion: "12V · Alto torque · Bajo ruido",
  },
  {
    slug: "ventilador-tecnico-flux-one",
    categoria: "Motores y ventiladores",
    nombre: "Ventilador técnico Flux One",
    marca: "Kliniu",
    precio: "$286.000",
    precioAnterior: "$349.000",
    precioValor: 286000,
    descuento: "-18%",
    imagen: "/hero-kliniu.jpg",
    disponibilidad: "Entrega inmediata",
  },
  {
    slug: "rotor-de-enfriamiento-magna-air",
    categoria: "Motores y ventiladores",
    nombre: "Rotor de enfriamiento Magna Air",
    marca: "Original Parts",
    precio: "$452.900",
    precioAnterior: "$525.000",
    precioValor: 452900,
    descuento: "-14%",
    imagen: "/hero-kliniu.jpg",
    disponibilidad: "Disponible por pedido",
  },
  {
    slug: "motor-axial-dynamic-core",
    categoria: "Motores y ventiladores",
    nombre: "Motor axial Dynamic Core",
    marca: "ProLine",
    precio: "$518.000",
    precioAnterior: "$620.000",
    precioValor: 518000,
    descuento: "-16%",
    imagen: "/hero-kliniu.jpg",
    disponibilidad: "Disponible por pedido",
  },
  {
    slug: "sistema-cooler-turbo-grid",
    categoria: "Motores y ventiladores",
    nombre: "Sistema cooler Turbo Grid",
    marca: "Kliniu",
    precio: "$197.900",
    precioAnterior: "$249.000",
    precioValor: 197900,
    descuento: "-21%",
    imagen: "/hero-kliniu.jpg",
    disponibilidad: "Recoger en tienda",
  },
  {
    slug: "juego-de-bujes-exact-mill",
    categoria: "Línea mecanizado",
    nombre: "Juego de bujes Exact Mill",
    marca: "ProLine",
    precio: "$175.500",
    precioAnterior: "$219.000",
    precioValor: 175500,
    descuento: "-19%",
    imagen: "/hero-kliniu.jpg",
    disponibilidad: "Entrega inmediata",
    destacado: true,
    descripcion: "Acero templado · Tolerancia H7 · x6 unidades",
  },
  {
    slug: "pieza-torneada-vector-cut",
    categoria: "Línea mecanizado",
    nombre: "Pieza torneada Vector Cut",
    marca: "Kliniu",
    precio: "$248.000",
    precioAnterior: "$304.000",
    precioValor: 248000,
    descuento: "-18%",
    imagen: "/hero-kliniu.jpg",
    disponibilidad: "Entrega inmediata",
  },
  {
    slug: "modulo-de-ajuste-torque-base",
    categoria: "Línea mecanizado",
    nombre: "Módulo de ajuste Torque Base",
    marca: "MotorTech",
    precio: "$329.000",
    precioAnterior: "$405.000",
    precioValor: 329000,
    descuento: "-19%",
    imagen: "/hero-kliniu.jpg",
    disponibilidad: "Disponible por pedido",
  },
  {
    slug: "set-precision-prime-axis",
    categoria: "Línea mecanizado",
    nombre: "Set precisión Prime Axis",
    marca: "Original Parts",
    precio: "$589.000",
    precioAnterior: "$699.000",
    precioValor: 589000,
    descuento: "-16%",
    imagen: "/hero-kliniu.jpg",
    disponibilidad: "Disponible por pedido",
  },
  {
    slug: "acople-tecnico-linear-fit",
    categoria: "Línea mecanizado",
    nombre: "Acople técnico Linear Fit",
    marca: "Kliniu",
    precio: "$214.700",
    precioAnterior: "$268.000",
    precioValor: 214700,
    descuento: "-19%",
    imagen: "/hero-kliniu.jpg",
    disponibilidad: "Recoger en tienda",
  },
  {
    slug: "boquilla-injet-flow-x",
    categoria: "Línea inyección y extrusión",
    nombre: "Boquilla Injet Flow X",
    marca: "Original Parts",
    precio: "$394.500",
    precioAnterior: "$479.000",
    precioValor: 394500,
    descuento: "-18%",
    imagen: "/hero-kliniu.jpg",
    disponibilidad: "Entrega inmediata",
  },
  {
    slug: "modulo-extrusor-delta-pack",
    categoria: "Línea inyección y extrusión",
    nombre: "Módulo extrusor Delta Pack",
    marca: "Kliniu",
    precio: "$459.000",
    precioAnterior: "$569.000",
    precioValor: 459000,
    descuento: "-19%",
    imagen: "/hero-kliniu.jpg",
    disponibilidad: "Disponible por pedido",
  },
  {
    slug: "camara-de-inyeccion-smart-melt",
    categoria: "Línea inyección y extrusión",
    nombre: "Cámara de inyección Smart Melt",
    marca: "ProLine",
    precio: "$619.000",
    precioAnterior: "$749.000",
    precioValor: 619000,
    descuento: "-17%",
    imagen: "/hero-kliniu.jpg",
    disponibilidad: "Disponible por pedido",
  },
  {
    slug: "set-termico-fusion-gate",
    categoria: "Línea inyección y extrusión",
    nombre: "Set térmico Fusion Gate",
    marca: "MotorTech",
    precio: "$281.900",
    precioAnterior: "$349.000",
    precioValor: 281900,
    descuento: "-19%",
    imagen: "/hero-kliniu.jpg",
    disponibilidad: "Entrega inmediata",
  },
  {
    slug: "unidad-compacta-stream-mold",
    categoria: "Línea inyección y extrusión",
    nombre: "Unidad compacta Stream Mold",
    marca: "Kliniu",
    precio: "$198.000",
    precioAnterior: "$248.000",
    precioValor: 198000,
    descuento: "-20%",
    imagen: "/hero-kliniu.jpg",
    disponibilidad: "Recoger en tienda",
  },
  {
    slug: "kit-sello-flex-guard",
    categoria: "Línea cauchos",
    nombre: "Kit sello Flex Guard",
    marca: "ProLine",
    precio: "$148.000",
    precioAnterior: "$189.000",
    precioValor: 148000,
    descuento: "-22%",
    imagen: "/hero-kliniu.jpg",
    disponibilidad: "Entrega inmediata",
  },
  {
    slug: "juego-cauchos-heavy-grip",
    categoria: "Línea cauchos",
    nombre: "Juego cauchos Heavy Grip",
    marca: "Kliniu",
    precio: "$209.500",
    precioAnterior: "$259.000",
    precioValor: 209500,
    descuento: "-19%",
    imagen: "/hero-kliniu.jpg",
    disponibilidad: "Entrega inmediata",
  },
  {
    slug: "aro-tecnico-black-seal",
    categoria: "Línea cauchos",
    nombre: "Aro técnico Black Seal",
    marca: "Original Parts",
    precio: "$268.900",
    precioAnterior: "$329.000",
    precioValor: 268900,
    descuento: "-18%",
    imagen: "/hero-kliniu.jpg",
    disponibilidad: "Disponible por pedido",
  },
  {
    slug: "componente-elastico-road-flex",
    categoria: "Línea cauchos",
    nombre: "Componente elástico Road Flex",
    marca: "MotorTech",
    precio: "$319.000",
    precioAnterior: "$389.000",
    precioValor: 319000,
    descuento: "-18%",
    imagen: "/hero-kliniu.jpg",
    disponibilidad: "Disponible por pedido",
  },
  {
    slug: "set-industrial-grip-core",
    categoria: "Línea cauchos",
    nombre: "Set industrial Grip Core",
    marca: "Kliniu",
    precio: "$179.000",
    precioAnterior: "$229.000",
    precioValor: 179000,
    descuento: "-22%",
    imagen: "/hero-kliniu.jpg",
    disponibilidad: "Recoger en tienda",
  },
];

export const slugCategoria = (categoria: string) =>
  categoria
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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
    .replace(/[\u0300-\u036f]/g, "")
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
