// API REST de Coordinadora v3.2.0 (developers.coordinadora.com → Guías Coordinadora).
// COORDINADORA_ENV=production usa las credenciales de producción; cualquier otro valor, sandbox.

const isProd = process.env.COORDINADORA_ENV === "production";
const HOST = isProd ? "https://api.coordinadora.tech" : "https://api-test.coordinadora.tech";
const GUIAS = `${HOST}/suite/guias`;

export class CoordinadoraError extends Error {}

function env(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new CoordinadoraError(`Falta configurar ${name}`);
  return value;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const key = env(isProd ? "COORDINADORA_CONSUMER_KEY" : "COORDINADORA_SANDBOX_CONSUMER_KEY");
  const secret = env(isProd ? "COORDINADORA_CONSUMER_SECRET" : "COORDINADORA_SANDBOX_CONSUMER_SECRET");
  const res = await fetch(`${HOST}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as { access_token?: string; expires_in?: string } | null;
  if (!res.ok || !json?.access_token) throw new CoordinadoraError(`Coordinadora rechazó las credenciales (${res.status})`);
  cachedToken = { value: json.access_token, expiresAt: Date.now() + Number(json.expires_in ?? 3600) * 1000 };
  return cachedToken.value;
}

async function call<T>(path: string, init: RequestInit = {}, base = GUIAS): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${await getToken()}`,
      ...init.headers,
    },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as { isError?: boolean; message?: string; data?: T } | null;
  if (!res.ok || !json || json.isError) {
    throw new CoordinadoraError(json?.message ? `Coordinadora: ${json.message}` : `Coordinadora respondió ${res.status}`);
  }
  return json.data as T;
}

export type GuidePackage = { pesoKg: number; largoCm: number; anchoCm: number; altoCm: number; unidades: number };

export type GuideInput = {
  orderId: string;
  valor: number;
  contenido: string;
  observaciones?: string | null;
  destinatario: { nombre: string; direccion: string; codigoCiudad: string; celular: string };
  paquete: GuidePackage;
};

/** Crea la guía y devuelve el código de remisión (número de guía). */
export async function createGuide(input: GuideInput) {
  const p = input.paquete;
  // Ojo: la doc dice /suite/guias/guias pero el gateway responde 404; el POST real es a /suite/guias.
  const data = await call<{ codigo_remision: string }>("", {
    method: "POST",
    body: JSON.stringify({
      identificacion: env("COORDINADORA_NIT"),
      idProceso: Number(env("COORDINADORA_ID_PROCESO")),
      divisionCliente: env("COORDINADORA_DIVISION"),
      tipoCuenta: Number(env("COORDINADORA_TIPO_CUENTA")),
      usuario: env("COORDINADORA_USUARIO"),
      fuente: "integracion",
      codigoPais: 170,
      valoracion: String(Math.round(input.valor)),
      contenido: input.contenido,
      observaciones: input.observaciones ?? undefined,
      nivelServicio: 1,
      quienPagaEnvio: "1",
      tipoGuia: 1,
      referenciaGuia: input.orderId,
      detalle: [
        {
          pesoReal: p.pesoKg,
          largo: p.largoCm,
          ancho: p.anchoCm,
          alto: p.altoCm,
          unidades: p.unidades,
          ubl: 0,
          valorDeclarado: Math.round(input.valor),
        },
      ],
      datosRemitente: {
        nombreRemitente: env("COORDINADORA_REMITENTE_NOMBRE"),
        direccionRemitente: env("COORDINADORA_REMITENTE_DIRECCION"),
        codigoCiudadRemitente: env("COORDINADORA_REMITENTE_CIUDAD_DANE"),
        celularRemitente: env("COORDINADORA_REMITENTE_CELULAR"),
      },
      datosDestinatario: {
        nombreDestinatario: input.destinatario.nombre,
        direccionDestinatario: input.destinatario.direccion,
        codigoCiudadDestinatario: input.destinatario.codigoCiudad,
        celularDestinatario: input.destinatario.celular,
      },
    }),
  });
  if (!data?.codigo_remision) throw new CoordinadoraError("Coordinadora no devolvió número de guía");
  return data.codigo_remision;
}

/**
 * PDF de la etiqueta que va pegada a la caja. Formato 58 = media página en papel carta
 * (2 por hoja), para impresora normal. Ojo: /digitales es el comprobante de entrega, no la etiqueta.
 */
export async function getGuidePdf(codigoRemision: string) {
  const data = await call<{ pdfBase64?: string }[]>(
    "/etiquetas/imprimir",
    { method: "POST", body: JSON.stringify({ tipo_etiqueta: "58", guias: [codigoRemision] }) },
    HOST,
  );
  const pdf = data?.[0]?.pdfBase64;
  if (!pdf) throw new CoordinadoraError("Coordinadora no devolvió la etiqueta de la guía");
  return Buffer.from(pdf, "base64");
}
