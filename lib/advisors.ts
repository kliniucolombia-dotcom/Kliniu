/**
 * Asesores comerciales.
 *
 * Cada número tiene su correo asociado, para que el sitio nunca muestre el
 * teléfono de un asesor junto al correo de otro. Toda selección aleatoria de
 * asesor (footer, barra de contacto) debe salir de aquí.
 */
export type Advisor = {
  phone: string; // formato internacional sin "+"
  email: string;
};

export const ADVISORS: Advisor[] = [
  { phone: "573105750449", email: "david.avila@kliniu.com" },
  { phone: "573112088806", email: "ventas@kliniu.com" },
  { phone: "573226556454", email: "harold.p@kliniu.com" },
];

export const ADVISOR_PHONES = ADVISORS.map((a) => a.phone);

export function pickAdvisor(): Advisor {
  return ADVISORS[Math.floor(Math.random() * ADVISORS.length)];
}

export function formatAdvisorPhone(phone: string) {
  const country = phone.slice(0, 2);
  const rest = phone.slice(2);
  return `+${country} ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`;
}
