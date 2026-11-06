import { DIVIPOLA } from "@/lib/dane-divipola";

function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Nombres que usamos en la tienda (lib/colombia-locations.ts) ≠ nombre oficial DIVIPOLA.
const DEPT_ALIAS: Record<string, string> = {
  "SAN ANDRES Y PROVIDENCIA": "88",
  "BOGOTA": "11",
};
const CITY_ALIAS: Record<string, string> = {
  CARTAGENA: "CARTAGENA DE INDIAS",
  TOLU: "SANTIAGO DE TOLU",
  CODAZZI: "AGUSTIN CODAZZI",
  TUMACO: "SAN ANDRES DE TUMACO",
  CUCUTA: "SAN JOSE DE CUCUTA",
  CALI: "SANTIAGO DE CALI",
  BUGA: "GUADALAJARA DE BUGA",
};

const deptByName = new Map(Object.entries(DIVIPOLA).map(([code, d]) => [d.n, code]));

/** Código DANE de 5 dígitos (DIVIPOLA) o null si no se reconoce la ciudad. */
export function getDaneCode(department: string, city: string): string | null {
  const c = norm(city);
  if (c.startsWith("BOGOTA")) return "11001"; // la tienda lista Bogotá dentro de Cundinamarca
  const dep = norm(department);
  const depCode = DEPT_ALIAS[dep] ?? deptByName.get(dep);
  if (!depCode) return null;
  const cities = DIVIPOLA[depCode].c;
  return cities[c] ?? cities[CITY_ALIAS[c] ?? ""] ?? null;
}

/** Formato de Coordinadora: DANE de 8 dígitos (municipio + "000"). */
export function getCoordinadoraCityCode(department: string, city: string): string | null {
  const code = getDaneCode(department, city);
  return code ? `${code}000` : null;
}
