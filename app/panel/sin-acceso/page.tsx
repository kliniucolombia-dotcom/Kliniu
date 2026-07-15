import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sin acceso — Panel Comercial" };

export default async function SinAccesoPage() {
  const access = await requireActiveUser();
  if (!access.ok) redirect("/login");

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="max-w-sm rounded-2xl border border-[#E2E8F0] bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFEDD5] text-[#C2410C]">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3z" />
            <path d="M12 9v4M12 16h.01" />
          </svg>
        </div>
        <h1 className="text-lg font-black text-[#1A1A1A]">Sin módulos asignados</h1>
        <p className="mt-2 text-sm text-[#64748B]">
          Tu cuenta no tiene ningún módulo del panel habilitado todavía. Contacta a un administrador para que te asigne permisos.
        </p>
      </div>
    </div>
  );
}
