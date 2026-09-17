export type ProductionArea = {
  key: string;
  name: string;
  description: string;
};

export const PRODUCTION_AREAS: ProductionArea[] = [
  {
    key: "DIRECCION",
    name: "Dirección",
    description: "Dirección y control de las operaciones de la compañía.",
  },
  {
    key: "ALMACENAMIENTO",
    name: "Almacenamiento y Logística",
    description: "Administración de inventario, almacenamiento y despacho de productos.",
  },
  {
    key: "PRODUCCION",
    name: "Producción",
    description: "Control de materia prima, inyección y ensamble de productos.",
  },
  {
    key: "SOPORTE",
    name: "Soporte",
    description: "Áreas de soporte y servicios complementarios.",
  },
];

export function getArea(key: string | null | undefined): ProductionArea | undefined {
  return PRODUCTION_AREAS.find((a) => a.key === key);
}

export type DocDepartmentMember = {
  name: string;
  title: string;
  email: string;
  kind: "holder" | "backup";
};

export type DocDepartment = {
  code: string;
  name: string;
  area: string;
  description: string;
  members: DocDepartmentMember[];
};

export const DOC_DEPARTMENTS: DocDepartment[] = [
  {
    code: "DIR_OPERACIONES",
    name: "Dirección de Operaciones",
    area: "DIRECCION",
    description: "Dirige las operaciones de la compañía.",
    members: [
      { name: "Maureen Blandon", title: "Director de operaciones", email: "direcciondeoperaciones@kliniu.com", kind: "holder" },
    ],
  },
  {
    code: "JEF_OPERACIONES",
    name: "Jefatura de Operaciones",
    area: "DIRECCION",
    description: "Supervisa la operación general del área.",
    members: [
      { name: "Cristian Beltrán", title: "Jefe de operaciones", email: "jefeoperaciones@kliniu.com", kind: "holder" },
    ],
  },
  {
    code: "LOGISTICA",
    name: "Logística",
    area: "ALMACENAMIENTO",
    description:
      "Planificar, coordinar y controlar todas las actividades logísticas garantizando entregas oportunas, reducción de costos y satisfacción de los clientes internos y externos.",
    members: [
      { name: "Daniela Martínez", title: "Analista de logística", email: "logistica@kliniu.com", kind: "holder" },
      { name: "Andrea", title: "Respaldo", email: "logistica.respaldo@kliniu.com", kind: "backup" },
    ],
  },
  {
    code: "ALMACEN_BODEGAS",
    name: "Almacén y Bodegas",
    area: "ALMACENAMIENTO",
    description: "Administrar el inventario y garantizar su disponibilidad, conservación y trazabilidad.",
    members: [
      { name: "Cristian Beltrán", title: "Líder", email: "jefeoperaciones@kliniu.com", kind: "holder" },
      { name: "Esteban Arcila", title: "Respaldo", email: "despacho@kliniu.com", kind: "backup" },
    ],
  },
  {
    code: "BODEGA_ENSAMBLE",
    name: "Bodega Ensamble",
    area: "ALMACENAMIENTO",
    description:
      "Administrar el inventario de producto inyectado destinado al ensamble, garantizando su disponibilidad, conservación y trazabilidad.",
    members: [
      { name: "Wilmar Pulido", title: "Encargado", email: "bodegaensamble@kliniu.com", kind: "holder" },
      { name: "Esteban Arcila", title: "Respaldo", email: "despacho@kliniu.com", kind: "backup" },
    ],
  },
  {
    code: "DESPACHO",
    name: "Despacho",
    area: "ALMACENAMIENTO",
    description: "Garantizar la disponibilidad y despacho oportuno del producto terminado.",
    members: [
      { name: "Esteban Arcila", title: "Encargado", email: "despacho@kliniu.com", kind: "holder" },
      { name: "Wilmar Pulido", title: "Respaldo", email: "bodegaensamble@kliniu.com", kind: "backup" },
    ],
  },
  {
    code: "INYECCION",
    name: "Inyección",
    area: "PRODUCCION",
    description: "Coordinar la producción de inyección asegurando eficiencia, calidad y continuidad operativa.",
    members: [
      { name: "Julian Pintor", title: "Líder planta inyección", email: "inyeccion@kliniu.com", kind: "holder" },
      { name: "Kevin Pedraza", title: "Respaldo", email: "bodegainyeccion@kliniu.com", kind: "backup" },
    ],
  },
  {
    code: "ENSAMBLE",
    name: "Ensamble",
    area: "PRODUCCION",
    description:
      "Dirigir la operación de ensamble asegurando productividad, calidad y cumplimiento del programa de producción.",
    members: [
      { name: "Helver Díaz", title: "Líder planta ensamble", email: "ensamble@kliniu.com", kind: "holder" },
      { name: "Cristian Beltrán", title: "Respaldo", email: "jefeoperaciones@kliniu.com", kind: "backup" },
    ],
  },
  {
    code: "BODEGA_INYECCION",
    name: "Bodega Inyección",
    area: "PRODUCCION",
    description: "Controlar el inventario de materia prima y producto inyectado.",
    members: [
      { name: "Kevin Pedraza", title: "Encargado", email: "bodegainyeccion@kliniu.com", kind: "holder" },
      { name: "Jairo Aldana", title: "Respaldo", email: "bodegainyeccion.respaldo@kliniu.com", kind: "backup" },
    ],
  },
  {
    code: "MANTENIMIENTO",
    name: "Mantenimiento",
    area: "SOPORTE",
    description:
      "Garantizar la disponibilidad y confiabilidad de equipos, moldes e infraestructura mediante un mantenimiento eficaz.",
    members: [
      { name: "Enrique Moreno", title: "Líder de mantenimiento", email: "mantenimiento@kliniu.com", kind: "holder" },
      { name: "Osvaldo", title: "Respaldo", email: "mantenimiento.respaldo@kliniu.com", kind: "backup" },
    ],
  },
];

export function getDocDepartment(code: string): DocDepartment | undefined {
  return DOC_DEPARTMENTS.find((d) => d.code === code);
}
