import Link from "next/link";
import Image from "next/image";
import { MdHome, MdGridView } from "react-icons/md";

export default function NotFound() {
  return (
    <div className="relative flex min-h-[900px] flex-col items-center justify-center overflow-hidden bg-[#f7fbfb] px-6 py-10 text-center">
      <div className="pointer-events-none absolute -right-32 -top-32 h-[360px] w-[360px] rounded-full bg-[#e8f5f5]" />
      <div className="pointer-events-none absolute -bottom-40 -left-36 h-[420px] w-[420px] rounded-full bg-[#f0fbfc]" />

      <div className="relative flex max-w-[560px] flex-col items-center gap-2">
        <Image
          src="/foca-pensativa.png"
          alt="Foca pensativa de Kliniu"
          width={220}
          height={220}
          priority
          className="h-auto w-[220px] drop-shadow-[0_18px_30px_rgba(12,83,91,0.2)]"
        />

        <div className="mt-2 text-[112px] font-extrabold leading-none tracking-tight text-[#27B1B8]">
          404
        </div>

        <h1 className="mt-3 text-[28px] font-bold text-[#0C535B]">
          Ups, esta página se perdió
        </h1>

        <p className="mx-auto mb-7 mt-2.5 max-w-[420px] text-base leading-relaxed text-[#2f3d49]">
          Parece que el enlace que seguiste no existe o cambió de lugar. Nuestra foca ya está buscándola, mientras tanto volvamos al camino.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0C535B] px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_24px_rgba(12,83,91,0.25)]"
          >
            <MdHome size={18} />
            Volver al inicio
          </Link>
          <Link
            href="/categorias"
            className="inline-flex items-center gap-2 rounded-xl border border-[#e2e8e8] bg-white px-6 py-3.5 text-[15px] font-semibold text-[#0C535B]"
          >
            Ver categorías
            <MdGridView size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
