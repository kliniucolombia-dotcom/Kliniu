"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "../components/cart-provider";

export default function CarritoPage() {
  const { items, incrementItem, decrementItem, removeItem, clearCart } =
    useCart();

  return (
    <main className="min-h-screen bg-[#f5f5f5] text-[#111]">
      <section className="mx-auto max-w-[1440px] px-6 py-16">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.35em] text-[#8b8d91]">
              Compra y seguimiento
            </p>
            <h1 className="text-4xl font-semibold uppercase tracking-[-0.04em] text-[#4f545a] md:text-6xl">
              Carrito
            </h1>
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="rounded-full border border-[#0C535B]/15 px-5 py-3 text-sm font-semibold text-[#0C535B] transition-colors duration-200 hover:bg-[#0C535B] hover:text-white"
            >
              Vaciar carrito
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-black/12 bg-white p-12 text-center shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
            <p className="text-xl text-[#6e7379]">
              Tu carrito está vacío por ahora.
            </p>
            <Link
              href="/categorias"
              className="mt-6 inline-flex rounded-full bg-[#27B1B8] px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#1E969B]"
            >
              Explorar categorías
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-5">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col gap-5 rounded-[1.75rem] border border-black/8 bg-white p-5 shadow-[0_16px_35px_rgba(15,23,42,0.05)] md:flex-row md:items-center"
                >
                  <Image
                    src={item.imagen}
                    alt={item.nombre}
                    width={220}
                    height={160}
                    className="h-32 w-full rounded-[1.25rem] object-cover md:w-44"
                  />

                  <div className="flex-1">
                    <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#1f2328]">
                      {item.nombre}
                    </h2>
                    <div className="mt-3 inline-flex overflow-hidden rounded-[1rem] border border-black/10 bg-white">
                      <button
                        type="button"
                        aria-label={`Disminuir cantidad de ${item.nombre}`}
                        onClick={() => decrementItem(item.id)}
                        className="inline-flex h-10 w-10 items-center justify-center text-lg text-[#4f545a] transition-colors duration-200 hover:bg-[#f5f5f5]"
                      >
                        -
                      </button>
                      <span className="inline-flex h-10 min-w-[3.2rem] items-center justify-center border-x border-black/10 text-base font-medium text-[#1f2328]">
                        {item.cantidad}
                      </span>
                      <button
                        type="button"
                        aria-label={`Aumentar cantidad de ${item.nombre}`}
                        onClick={() => incrementItem(item.id)}
                        className="inline-flex h-10 w-10 items-center justify-center text-lg text-[#4f545a] transition-colors duration-200 hover:bg-[#f5f5f5]"
                      >
                        +
                      </button>
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-[#27B1B8]">
                      {item.precio}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="rounded-full border border-black/10 px-5 py-3 text-sm font-semibold text-[#0C535B] transition-colors duration-200 hover:bg-[#0C535B] hover:text-white"
                  >
                    Quitar
                  </button>
                </article>
              ))}
            </div>

            <aside className="rounded-[1.75rem] border border-black/8 bg-white p-6 shadow-[0_16px_35px_rgba(15,23,42,0.05)]">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8b8d91]">
                Resumen
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#0C535B]">
                Tu compra
              </h2>
              <p className="mt-4 text-sm leading-7 text-[#6e7379]">
                Revisa tus productos y continúa al siguiente paso cuando quieras.
              </p>

              <div className="mt-8 space-y-3 border-t border-black/8 pt-6">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-[#1f2328]">{item.nombre}</span>
                    <span className="font-semibold text-[#0C535B]">
                      {item.cantidad}x
                    </span>
                  </div>
                ))}
              </div>

              <Link
                href="/checkout"
                className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[#27B1B8] px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#1E969B]"
              >
                Continuar compra
              </Link>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
