export type CategoriaMeta = {
  nombre: string;
  color: string;
  icono: string;
  iconoImagen?: string;
  bannerImagen?: string;
  heroBannerImagen?: string;
  bannerCopy?: string;
  heroTitulo1?: string;
  heroTitulo2?: string;
  heroDestacado?: string;
  textoDark?: boolean;
  beneficiosInline?: boolean;
  beneficiosHero?: { icono: string; texto: string }[];
  comoElegirFoca?: string;
  comoElegirTitulo?: string;
  comoElegirTituloCompleto?: string;
  comoElegirSubtitulo?: string;
  comoElegirDark?: boolean;
  comoElegir?: { icono: string; titulo: string; descripcion: string }[];
};

export const categoriasData: readonly CategoriaMeta[] = [
  {
    nombre: "Dispensadores para líquidos",
    color: "#27B1B8",
    icono: "◒",
    bannerImagen: "/cat-liquidos.png",
    heroBannerImagen: "/category-banner-liquidos.jpg",
    iconoImagen: "/cat-liquidos.png",
    bannerCopy: "Soluciones de dispensación líquida para higiene eficiente en cualquier espacio.",
    heroTitulo1: "Dispensadores para",
    heroTitulo2: "",
    heroDestacado: "líquidos",
    textoDark: true,
    comoElegirFoca: "/foca-como-elegir-liquidos.png",
    comoElegirTitulo: "dispensador de líquidos ideal",
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
    bannerImagen: "/cat-papel.png",
    heroBannerImagen: "/category-banner-papel.jpg",
    iconoImagen: "/cat-papel.png",
    bannerCopy: "Sistemas de dispensación de papel diseñados para crear higiene, ahorro y eficiencia en cada uso.",
    heroTitulo1: "Dispensadores de",
    heroTitulo2: "",
    heroDestacado: "papel y toalla",
    textoDark: true,
    comoElegirFoca: "/foca-como-elegir-papel.png",
    comoElegirTitulo: "papel y toalla ideal",
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
    bannerImagen: "/cat-klinox.png",
    heroBannerImagen: "/category-banner-klinox.jpg",
    iconoImagen: "/cat-klinox.png",
    bannerCopy: "Dispensadores premium en acero inoxidable diseñados para máxima durabilidad.",
    heroTitulo1: "Dispensadores en",
    heroTitulo2: "",
    heroDestacado: "acero inoxidable 304",
    textoDark: true,
    comoElegirFoca: "/foca-como-elegir-klinox.png",
    comoElegirTitulo: "dispensador inoxidable ideal",
    beneficiosInline: true,
    beneficiosHero: [
      { icono: "🏷️", texto: "Acero inoxidable de alta calidad" },
      { icono: "🛡️", texto: "Resistente a la corrosión y humedad" },
      { icono: "💎", texto: "Diseño elegante y moderno" },
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
    bannerImagen: "/cat-crema-dental.png",
    heroBannerImagen: "/category-banner-crema-dental.jpg",
    iconoImagen: "/cat-crema-dental.png",
    bannerCopy: "Sistemas de dispensación higiénica de crema dental para instituciones, colegios y empresas.",
    heroTitulo1: "Dispensador de",
    heroTitulo2: "",
    heroDestacado: "crema dental",
    textoDark: true,
    comoElegirFoca: "/foca-como-elegir-crema-dental.png",
    comoElegirTitulo: "dispensador de crema dental ideal",
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
    bannerImagen: "/cat-hoteles.png",
    heroBannerImagen: "/category-banner-hoteles.jpg",
    iconoImagen: "/cat-hoteles.png",
    bannerCopy: "Sistemas de dispensación de papel diseñados para crear higiene, ahorro y eficiencia en cada uso.",
    heroTitulo1: "Dispensadores para",
    heroTitulo2: "Hoteles/",
    heroDestacado: "Restaurantes",
    textoDark: true,
    comoElegirFoca: "/foca-como-elegir-hoteles.png",
    comoElegirDark: true,
    comoElegirTituloCompleto: "¿Por qué elegir KLINIU para tu negocio?",
    comoElegirSubtitulo: "Soluciones pensadas para mejorar la experiencia de tus clientes y la eficiencia de tu operación.",
    beneficiosHero: [
      { icono: "⭐", texto: "Experiencia superior" },
      { icono: "💰", texto: "Ahorro y eficiencia" },
      { icono: "🛡️", texto: "Higiene garantizada" },
      { icono: "✨", texto: "Diseños que elevan tu marca" },
    ],
    comoElegir: [
      { icono: "💰", titulo: "Ahorro en consumo", descripcion: "Reduce el gasto en insumos con sistemas de dosificación controlada." },
      { icono: "🛡️", titulo: "Higiene profesional", descripcion: "Garantiza estándares de higiene para tus clientes y colaboradores." },
      { icono: "🔧", titulo: "Fácil mantenimiento", descripcion: "Diseñados para una recarga y limpieza rápida y sin complicaciones." },
      { icono: "🤝", titulo: "Soporte especializado", descripcion: "Acompañamiento técnico y comercial en todo momento." },
    ],
  },
  {
    nombre: "Insumos/Repuesto",
    color: "#5a8a6a",
    icono: "◈",
    bannerImagen: "/cat-insumos.png",
    heroBannerImagen: "/category-banner-insumos.jpg",
    iconoImagen: "/cat-insumos.png",
    bannerCopy: "Insumos y repuestos originales para mantener tus dispensadores KLINIU siempre en óptimas condiciones.",
    heroTitulo1: "Insumos y",
    heroTitulo2: "",
    heroDestacado: "Repuestos",
    textoDark: true,
    comoElegirTituloCompleto: "¿Por qué usar repuestos originales KLINIU?",
    comoElegirSubtitulo: "Garantiza el correcto funcionamiento y vida útil de tu dispensador.",
    beneficiosHero: [
      { icono: "🔧", texto: "Compatibilidad garantizada" },
      { icono: "💰", texto: "Ahorro a largo plazo" },
      { icono: "🛡️", texto: "Durabilidad y calidad" },
      { icono: "⚡", texto: "Reposición rápida" },
    ],
    comoElegir: [
      { icono: "🔍", titulo: "Identifica tu modelo", descripcion: "Revisa el modelo de tu dispensador antes de elegir el repuesto." },
      { icono: "🧴", titulo: "Tipo de insumo", descripcion: "Jabón, papel, repuestos mecánicos o kits de mantenimiento." },
      { icono: "📦", titulo: "Cantidad", descripcion: "Compra en mayor cantidad para reducir costos de reposición." },
      { icono: "🤝", titulo: "Asesoría", descripcion: "Nuestro equipo te ayuda a encontrar el repuesto correcto." },
    ],
  },
  {
    nombre: "Outlet",
    color: "#27B1B8",
    icono: "%",
    bannerImagen: "/banner-outlet-kliniu.jpg",
    heroBannerImagen: "/banner-outlet-kliniu.jpg",
    iconoImagen: "/banner-outlet-kliniu.jpg",
    bannerCopy: "Mejores dispensadores al mejor precio. Encuentra ofertas especiales con descuentos de hasta 70% OFF.",
    heroTitulo1: "Outlet Virtual",
    heroTitulo2: "de",
    heroDestacado: "Dispensadores",
    textoDark: false,
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

export type VariacionColor = {
  color: string;
  label: string;
  image: string;
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
  variacionesColor?: VariacionColor[];
  destacado?: boolean;
};

export const productosCatalogo: ProductoCatalogo[] = [
  // ── Dispensadores para líquidos ──────────────────────────────
  {
    slug: "dispensador-automatico-1000ml",
    sku: "DO.AT.JB1.000ML-036",
    categoria: "Dispensadores para líquidos",
    nombre: "Dispensador automático 1.000 ml",
    marca: "Kliniu",
    precio: "$60.900",
    precioAnterior: "$75.000",
    precioValor: 60900,
    descuento: "-19%",
    imagen: "/motor-ventilador-axis-compact.png",
    disponibilidad: "Entrega inmediata",
    destacado: true,
    descripcion: "Automático · 1.000 ml · Policarbonato y ABS",
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
    slug: "xpert-professional",
    sku: "DISP.R.B-059",
    categoria: "Dispensadores para líquidos",
    nombre: "Xpert Professional",
    marca: "Kliniu",
    precio: "$55.900",
    precioAnterior: "$69.000",
    precioValor: 55900,
    descuento: "-19%",
    imagen: "/motor-ventilador-axis-compact.png",
    disponibilidad: "Entrega inmediata",
    descripcion: "Manual · 1.000 ml · ABS",
    especificacionesTecnicas: [
      { etiqueta: "Capacidad", valor: "1.000 ml" },
      { etiqueta: "Alto", valor: "26 cm" },
      { etiqueta: "Ancho", valor: "13 cm" },
      { etiqueta: "Peso", valor: "470 grs" },
      { etiqueta: "Material", valor: "ABS" },
      { etiqueta: "Instalación", valor: "Pared" },
      { etiqueta: "Garantía", valor: "1 año fabricación" },
    ],
  },
  {
    slug: "dispensador-jabon-1000ml",
    sku: "DO PC JB1.000-006",
    categoria: "Dispensadores para líquidos",
    nombre: "Dispensador de Jabón de 1.000 ml",
    marca: "Kliniu",
    precio: "$49.900",
    precioAnterior: "$62.000",
    precioValor: 49900,
    descuento: "-19%",
    imagen: "/motor-ventilador-axis-compact.png",
    disponibilidad: "Entrega inmediata",
    descripcion: "Manual · 1.000 ml · Polipropileno",
    especificacionesTecnicas: [
      { etiqueta: "Capacidad", valor: "1.000 ml" },
      { etiqueta: "Alto", valor: "20 cm" },
      { etiqueta: "Ancho", valor: "12 cm" },
      { etiqueta: "Profundidad", valor: "10.1 cm" },
      { etiqueta: "Peso", valor: "270 grs" },
      { etiqueta: "Material", valor: "Polipropileno" },
      { etiqueta: "Instalación", valor: "Pared" },
    ],
  },
  {
    slug: "dispensador-jabon-600ml",
    sku: "DO PC 700-003",
    categoria: "Dispensadores para líquidos",
    nombre: "Dispensador de Jabón de 600 ml",
    marca: "Kliniu",
    precio: "$42.900",
    precioAnterior: "$53.000",
    precioValor: 42900,
    descuento: "-19%",
    imagen: "/motor-ventilador-axis-compact.png",
    disponibilidad: "Entrega inmediata",
    descripcion: "Manual · 600 ml · Polipropileno",
    especificacionesTecnicas: [
      { etiqueta: "Capacidad", valor: "600 ml" },
      { etiqueta: "Alto", valor: "17.5 cm" },
      { etiqueta: "Ancho", valor: "10.5 cm" },
      { etiqueta: "Profundidad", valor: "9 cm" },
      { etiqueta: "Peso", valor: "170.5 grs" },
      { etiqueta: "Material", valor: "Polipropileno" },
      { etiqueta: "Instalación", valor: "Pared" },
    ],
  },
  {
    slug: "dispensador-jabon-500ml",
    sku: "DO 500B-002",
    categoria: "Dispensadores para líquidos",
    nombre: "Dispensador de Jabón de 500 ml",
    marca: "Kliniu",
    precio: "$38.900",
    precioAnterior: "$48.000",
    precioValor: 38900,
    descuento: "-19%",
    imagen: "/motor-ventilador-axis-compact.png",
    disponibilidad: "Entrega inmediata",
    descripcion: "Manual · 500 ml · Negro",
    especificacionesTecnicas: [
      { etiqueta: "Capacidad", valor: "500 ml" },
      { etiqueta: "Alto", valor: "11 cm" },
      { etiqueta: "Ancho", valor: "16.5 cm" },
      { etiqueta: "Peso", valor: "155 grs" },
      { etiqueta: "Material", valor: "Polipropileno y poliestireno cristal" },
      { etiqueta: "Color", valor: "Negro" },
      { etiqueta: "Instalación", valor: "Pared" },
    ],
  },
  {
    slug: "dispensador-black-jabon-500ml",
    sku: "DO 500-001",
    categoria: "Dispensadores para líquidos",
    nombre: "Dispensador BLACK de Jabón de 500 ml",
    marca: "Kliniu",
    precio: "$38.900",
    precioAnterior: "$48.000",
    precioValor: 38900,
    descuento: "-19%",
    imagen: "/motor-ventilador-axis-compact.png",
    disponibilidad: "Entrega inmediata",
    descripcion: "Manual · 500 ml · Negro",
    especificacionesTecnicas: [
      { etiqueta: "Capacidad", valor: "500 ml" },
      { etiqueta: "Alto", valor: "11 cm" },
      { etiqueta: "Ancho", valor: "16.5 cm" },
      { etiqueta: "Peso", valor: "155 grs" },
      { etiqueta: "Material", valor: "Polipropileno y poliestireno cristal" },
      { etiqueta: "Color", valor: "Negro" },
      { etiqueta: "Instalación", valor: "Pared" },
    ],
  },
  {
    slug: "dispensador-black-doble-jabon-800ml",
    sku: "DO-800-035",
    categoria: "Dispensadores para líquidos",
    nombre: "Dispensador BLACK doble de Jabón 800 ml",
    marca: "Kliniu",
    precio: "$52.900",
    precioAnterior: "$65.000",
    precioValor: 52900,
    descuento: "-19%",
    imagen: "/motor-ventilador-axis-compact.png",
    disponibilidad: "Entrega inmediata",
    descripcion: "Manual · 800 ml · Negro · Válvula anti-goteo",
    especificacionesTecnicas: [
      { etiqueta: "Capacidad", valor: "800 ml" },
      { etiqueta: "Alto", valor: "17.5 cm" },
      { etiqueta: "Ancho", valor: "11.3 cm" },
      { etiqueta: "Peso", valor: "256 grs" },
      { etiqueta: "Material", valor: "Polipropileno alto impacto" },
      { etiqueta: "Color", valor: "Negro" },
      { etiqueta: "Instalación", valor: "Pared" },
    ],
  },
  {
    slug: "dispensador-doble-jabon-300ml",
    sku: "DLDC-103",
    categoria: "Dispensadores para líquidos",
    nombre: "Dispensador doble de Jabón 300 ml",
    marca: "Kliniu",
    precio: "$45.900",
    precioAnterior: "$57.000",
    precioValor: 45900,
    descuento: "-19%",
    imagen: "/motor-ventilador-axis-compact.png",
    disponibilidad: "Entrega inmediata",
    descripcion: "Manual · 300 ml/cámara · ABS alto impacto",
    especificacionesTecnicas: [
      { etiqueta: "Capacidad", valor: "300 ml por cámara (600 ml total)" },
      { etiqueta: "Alto", valor: "22 cm" },
      { etiqueta: "Ancho", valor: "13.5 cm" },
      { etiqueta: "Profundidad", valor: "7 cm" },
      { etiqueta: "Peso", valor: "494 grs" },
      { etiqueta: "Material", valor: "ABS alto impacto" },
      { etiqueta: "Instalación", valor: "Pared" },
    ],
  },
  // ── Dispensadores de papel ────────────────────────────────────
  {
    slug: "dispensador-toallas-ecotowel",
    sku: "DTEW-106",
    categoria: "Dispensadores de papel, toalla y servilletas",
    nombre: "Dispensador de Toallas EcoTowel",
    marca: "Kliniu",
    precio: "$49.900",
    precioAnterior: "$62.000",
    precioValor: 49900,
    descuento: "-19%",
    imagen: "/motor-ventilador-axis-compact.png",
    disponibilidad: "Entrega inmediata",
    destacado: true,
    descripcion: "Interdobladas · 450 hojas · ABS alto impacto",
    especificacionesTecnicas: [
      { etiqueta: "Capacidad", valor: "450 hojas interfoliadas" },
      { etiqueta: "Papel máx.", valor: "25.5 × 8.5 cm" },
      { etiqueta: "Alto", valor: "33 cm" },
      { etiqueta: "Ancho", valor: "27 cm" },
      { etiqueta: "Profundidad", valor: "12 cm" },
      { etiqueta: "Peso", valor: "950 grs" },
      { etiqueta: "Material", valor: "ABS alto impacto" },
      { etiqueta: "Instalación", valor: "Pared" },
    ],
  },
  {
    slug: "dispensador-toallas-interfoliadas-luxury",
    sku: "DTILX-102",
    categoria: "Dispensadores de papel, toalla y servilletas",
    nombre: "Dispensador de Toallas Interfoliadas Luxury",
    marca: "Kliniu",
    precio: "$54.900",
    precioAnterior: "$68.000",
    precioValor: 54900,
    descuento: "-19%",
    imagen: "/motor-ventilador-axis-compact.png",
    disponibilidad: "Entrega inmediata",
    descripcion: "Interfoliadas · 470 toallas · ABS",
    especificacionesTecnicas: [
      { etiqueta: "Capacidad", valor: "470 toallas interfoliadas" },
      { etiqueta: "Alto", valor: "36 cm" },
      { etiqueta: "Ancho", valor: "26.5 cm" },
      { etiqueta: "Profundidad", valor: "8.5 cm" },
      { etiqueta: "Peso", valor: "853 grs" },
      { etiqueta: "Material", valor: "ABS alto impacto" },
      { etiqueta: "Instalación", valor: "Pared" },
    ],
  },
  {
    slug: "dispensador-papel-higienico-institucional",
    sku: "DCPINTS-015",
    categoria: "Dispensadores de papel, toalla y servilletas",
    nombre: "Dispensador de Papel Higiénico Institucional",
    marca: "Kliniu",
    precio: "$39.900",
    precioAnterior: "$49.000",
    precioValor: 39900,
    descuento: "-18%",
    imagen: "/motor-ventilador-axis-compact.png",
    disponibilidad: "Entrega inmediata",
    descripcion: "Rollo institucional · Polipropileno · Alto tráfico",
    especificacionesTecnicas: [
      { etiqueta: "Alto", valor: "28.5 cm" },
      { etiqueta: "Ancho", valor: "27 cm" },
      { etiqueta: "Peso", valor: "585 grs" },
      { etiqueta: "Material", valor: "Polipropileno alto impacto" },
      { etiqueta: "Instalación", valor: "Pared" },
    ],
  },
  {
    slug: "dispensador-toallas-mano-acero-inoxidable",
    sku: "DTM-100",
    categoria: "Dispensadores de papel, toalla y servilletas",
    nombre: "Dispensador de Toallas de Mano Acero Inoxidable",
    marca: "KlinOx",
    precio: "$89.900",
    precioAnterior: "$109.000",
    precioValor: 89900,
    descuento: "-17%",
    imagen: "/motor-ventilador-axis-compact.png",
    disponibilidad: "Entrega inmediata",
    descripcion: "Acero inoxidable 304 · Toallas C/Z · Cerradura de seguridad",
    especificacionesTecnicas: [
      { etiqueta: "Alto", valor: "26 cm" },
      { etiqueta: "Ancho", valor: "28.5 cm" },
      { etiqueta: "Profundidad", valor: "10 cm" },
      { etiqueta: "Peso", valor: "1.215 kg" },
      { etiqueta: "Material", valor: "Acero inoxidable 304" },
      { etiqueta: "Tipo papel", valor: "Toallas C o Z" },
      { etiqueta: "Instalación", valor: "Pared" },
    ],
  },
  // ── KlinOx Acero Inoxidable ──────────────────────────────────
  {
    slug: "dispensador-papel-higienico-jumbo-acero-inoxidable",
    sku: "DTJINOX-120",
    categoria: "KlinOx Acero Inoxidable",
    nombre: "Dispensador de Papel Higiénico Jumbo Acero Inoxidable",
    marca: "KlinOx",
    precio: "$99.900",
    precioAnterior: "$125.000",
    precioValor: 99900,
    descuento: "-20%",
    imagen: "/motor-ventilador-axis-compact.png",
    disponibilidad: "Entrega inmediata",
    destacado: true,
    descripcion: "Acero inoxidable 304 · Papel jumbo · Cerradura",
    especificacionesTecnicas: [
      { etiqueta: "Material", valor: "Acero inoxidable 304" },
      { etiqueta: "Tipo papel", valor: "Rollo jumbo institucional" },
      { etiqueta: "Instalación", valor: "Pared" },
    ],
  },
  // ── Dispensador de crema dental ──────────────────────────────
  {
    slug: "dispensador-crema-dental-2-cepillos",
    sku: "DO PC JB1-000-005",
    categoria: "Dispensador de crema dental",
    nombre: "Dispensador de crema dental para 2 cepillos",
    marca: "Kliniu",
    precio: "$32.900",
    precioAnterior: "$40.000",
    precioValor: 32900,
    descuento: "-17%",
    imagen: "/motor-ventilador-axis-compact.png",
    disponibilidad: "Entrega inmediata",
    destacado: true,
    descripcion: "Manual · 2 cepillos · 75 ml pasta",
    especificacionesTecnicas: [
      { etiqueta: "Capacidad", valor: "2 cepillos + 75 ml pasta" },
      { etiqueta: "Alto", valor: "19.5 cm" },
      { etiqueta: "Ancho", valor: "9.5 cm" },
      { etiqueta: "Profundidad", valor: "9 cm" },
      { etiqueta: "Peso", valor: "106 grs" },
      { etiqueta: "Material", valor: "Polipropileno y poliestireno cristal" },
      { etiqueta: "Instalación", valor: "Pared (cinta adhesiva o tornillos)" },
    ],
  },
  {
    slug: "dispensador-crema-dental-4-cepillos",
    sku: "DC 4-010",
    categoria: "Dispensador de crema dental",
    nombre: "Dispensador de Crema Dental para 4 cepillos",
    marca: "Kliniu",
    precio: "$38.900",
    precioAnterior: "$48.000",
    precioValor: 38900,
    descuento: "-19%",
    imagen: "/motor-ventilador-axis-compact.png",
    disponibilidad: "Entrega inmediata",
    descripcion: "Manual · 4 cepillos · 150 ml pasta",
    especificacionesTecnicas: [
      { etiqueta: "Capacidad", valor: "4 cepillos + 150 ml pasta" },
      { etiqueta: "Alto", valor: "19.8 cm" },
      { etiqueta: "Ancho", valor: "9 cm" },
      { etiqueta: "Profundidad", valor: "9 cm" },
      { etiqueta: "Peso", valor: "145 grs" },
      { etiqueta: "Material", valor: "Polipropileno y poliestireno cristal" },
      { etiqueta: "Instalación", valor: "Pared (cinta adhesiva o tornillos)" },
    ],
  },
  {
    slug: "dispensador-crema-dental-kids",
    categoria: "Dispensador de crema dental",
    nombre: "Dispensador de crema dental KIDS",
    marca: "Kliniu",
    precio: "$28.900",
    precioAnterior: "$36.000",
    precioValor: 28900,
    descuento: "-19%",
    imagen: "/motor-ventilador-axis-compact.png",
    disponibilidad: "Entrega inmediata",
    descripcion: "Manual · Diseño infantil · Compact",
    especificacionesTecnicas: [
      { etiqueta: "Alto", valor: "12.2 cm" },
      { etiqueta: "Ancho", valor: "6.5 cm" },
      { etiqueta: "Profundidad", valor: "5.5 cm" },
      { etiqueta: "Peso", valor: "67 grs" },
      { etiqueta: "Material", valor: "Polipropileno y poliestireno cristal" },
      { etiqueta: "Instalación", valor: "Pared (cinta adhesiva o tornillos)" },
    ],
  },
  // ── Hoteles y Restaurantes ───────────────────────────────────
  {
    slug: "dispensador-doble-jabon-800ml",
    sku: "DO-800-034",
    categoria: "Hoteles y Restaurantes",
    nombre: "Dispensador doble de Jabón 800 ml",
    marca: "Kliniu",
    precio: "$52.900",
    precioAnterior: "$65.000",
    precioValor: 52900,
    descuento: "-19%",
    imagen: "/motor-ventilador-axis-compact.png",
    disponibilidad: "Entrega inmediata",
    destacado: true,
    descripcion: "Manual · 800 ml · Válvula anti-goteo",
    especificacionesTecnicas: [
      { etiqueta: "Capacidad", valor: "800 ml" },
      { etiqueta: "Alto", valor: "17.5 cm" },
      { etiqueta: "Ancho", valor: "11.3 cm" },
      { etiqueta: "Peso", valor: "256 grs" },
      { etiqueta: "Material", valor: "Polipropileno alto impacto" },
      { etiqueta: "Instalación", valor: "Pared" },
    ],
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
