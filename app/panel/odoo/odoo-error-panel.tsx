import Link from "next/link";

export function getOdooErrorMessage(error: unknown) {
  if (error instanceof Error && error.message === "ODOO_NOT_CONFIGURED") {
    return "Falta configurar ODOO_URL, ODOO_DB, ODOO_USERNAME y ODOO_API_KEY en .env.local.";
  }

  if (error instanceof Error && error.message === "ODOO_AUTH_FAILED") {
    return "Odoo rechazó las credenciales. Revisa la base de datos, el usuario y la API key configurados en .env.local.";
  }

  if (error instanceof Error && error.message === "ODOO_HTTP_429") {
    return "Odoo está limitando las consultas por unos segundos. Espera un momento y vuelve a intentar.";
  }

  return "No fue posible conectar con Odoo en este momento.";
}

export function OdooErrorPanel({
  title = "No pudimos conectar con Odoo",
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <div className="rounded-2xl border border-[#FCA5A5] bg-[#FEF2F2] p-6">
      <p className="text-xs font-black uppercase tracking-widest text-[#DC2626]">
        Odoo no respondió
      </p>
      <h2 className="mt-2 text-lg font-black text-[#1A1A1A]">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">{message}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/panel/odoo"
          className="rounded-xl bg-[#27B1B8] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-85"
        >
          Reintentar conexión
        </Link>
        <a
          href="https://www.odoo.com/documentation/17.0/applications/general/users/api_keys.html"
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-bold text-[#64748B] transition-colors hover:border-[#27B1B8] hover:text-[#0C535B]"
        >
          Ver API keys de Odoo
        </a>
      </div>
    </div>
  );
}
