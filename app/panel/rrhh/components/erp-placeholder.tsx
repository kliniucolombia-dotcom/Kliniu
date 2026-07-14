import { MdConstruction } from "react-icons/md";

export function ErpPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-6">
      <h1 className="text-xl font-black text-[#1A1A1A]">{title}</h1>
      <p className="mt-1 text-sm text-[#64748B]">{description}</p>

      <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#E2E8F0] bg-white py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-[#27B1B8]/10 text-[#27B1B8]">
          <MdConstruction size={24} />
        </div>
        <p className="text-sm font-bold text-[#1A1A1A]">Módulo en construcción</p>
        <p className="max-w-xs text-xs text-[#64748B]">
          Esta sección aún no está conectada a datos reales de Kliniu. Se habilitará en una próxima fase.
        </p>
      </div>
    </div>
  );
}
