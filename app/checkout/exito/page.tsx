import Link from "next/link";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ pedido?: string; pagado?: string }>;
}) {
  const params = await searchParams;
  const paymentConfirmed = params.pagado === "1";

  return (
    <main className="flex min-h-[calc(100vh-88px)] items-center justify-center bg-[#f5f5f5] px-6 py-16">
      <section className="w-full max-w-2xl rounded-[2rem] bg-white p-8 text-center shadow-lg shadow-black/10 md:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#27B1B8]">
          {paymentConfirmed ? "Pago confirmado" : "Pedido creado"}
        </p>
        <h1 className="mt-3 text-3xl font-bold text-[#0C535B] md:text-4xl">
          {paymentConfirmed
            ? "Tu pago demo quedó aprobado"
            : "Recibimos tu solicitud correctamente"}
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          {paymentConfirmed
            ? "El pedido quedó pagado dentro del flujo demo y ya puedes mostrar el seguimiento completo en tu cuenta."
            : "Tu pedido quedó guardado en la base de datos y ya aparece dentro de tu cuenta. El siguiente paso será conectar el pago con Wompi sobre esta misma orden."}
        </p>

        {params.pedido && (
          <div className="mt-8 rounded-[1.4rem] border border-black/8 bg-[#fafaf9] px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b8d91]">
              Código de pedido
            </p>
            <p className="mt-2 text-lg font-semibold text-[#0C535B]">{params.pedido}</p>
          </div>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/mi-cuenta"
            className="rounded-full bg-[#27B1B8] px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#1E969B]"
          >
            Ver mis pedidos
          </Link>
          <Link
            href="/categorias"
            className="rounded-full border border-[#0C535B]/20 px-6 py-3 text-sm font-semibold text-[#0C535B] transition-colors duration-200 hover:bg-[#0C535B] hover:text-white"
          >
            Seguir comprando
          </Link>
        </div>
      </section>
    </main>
  );
}
