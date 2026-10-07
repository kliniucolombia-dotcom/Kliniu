import type { Instrumentation } from "next";

// Registra cada error de servidor (render, route handlers, server actions) y
// avisa por correo a ERROR_ALERT_EMAIL, como máximo una vez cada 15 min por ruta.
// El correo solo lleva ruta y código de referencia; el detalle queda en los logs.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const error = err as Error & { digest?: string };
  // Sin query string: ahí viajan secretos (?token= de webhooks, enlaces de reset).
  const path = request.path.split("?")[0];
  const route = context.routePath || path;

  console.error(
    JSON.stringify({
      level: "error",
      source: "onRequestError",
      route,
      path,
      method: request.method,
      routeType: context.routeType,
      digest: error.digest,
      message: error.message,
    }),
  );

  const to = process.env.ERROR_ALERT_EMAIL;
  if (!to || !process.env.RESEND_API_KEY) return;

  try {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    if (!(await checkRateLimit(`error-alert:${route}`, 1, 15 * 60 * 1000))) return;

    const { Resend } = await import("resend");
    const { data, error: sendError } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: "Kliniu Alertas <contacto@kliniu.com>",
      to,
      subject: `Error en Kliniu: ${route}`,
      text: [
        `Ruta: ${route}`,
        `URL: ${request.method} ${path}`,
        `Tipo: ${context.routeType}`,
        `Código de referencia: ${error.digest ?? "sin digest"}`,
        "",
        "El mensaje y el stack no se envían por correo; búscalos en los logs de Vercel con el código de referencia.",
        "Se envía como máximo un aviso cada 15 minutos por ruta.",
      ].join("\n"),
    });
    // El SDK de Resend no lanza: devuelve el fallo en `error`.
    if (sendError) console.error("No se pudo enviar el aviso de error:", sendError);
    else console.log(`Aviso de error enviado (${data?.id})`);
  } catch (alertError) {
    console.error("No se pudo enviar el aviso de error:", alertError);
  }
};
