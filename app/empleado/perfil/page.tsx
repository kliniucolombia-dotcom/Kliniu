"use client";
import { useEffect, useState } from "react";
import { MdPerson } from "react-icons/md";
import { fmtDateOnly } from "@/lib/date";

type MeResponse = {
  fullName: string;
  email: string;
  jobTitle: string;
  departmentName: string | null;
  employeeCode: string;
  hireDate: string;
  contractType: string;
};

const CONTRACT_LABELS: Record<string, string> = {
  INDEFINITE: "Término indefinido",
  FIXED_TERM: "Término fijo",
};

function fmt(d: string) {
  return fmtDateOnly(d, { day: "numeric", month: "long", year: "numeric" });
}

export default function PerfilPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/empleado/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(setMe)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-sm text-[#64748B]">Cargando…</div>;
  if (!me) return <div className="p-6 text-sm text-red-500">No fue posible cargar tu perfil.</div>;

  const rows: [string, string][] = [
    ["Cédula", me.employeeCode],
    ["Correo", me.email],
    ["Cargo", me.jobTitle],
    ["Departamento", me.departmentName ?? "—"],
    ["Tipo de contrato", CONTRACT_LABELS[me.contractType] ?? me.contractType],
    ["Fecha de ingreso", fmt(me.hireDate)],
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E6FAFB] text-[#27B1B8]">
          <MdPerson size={28} />
        </div>
        <div>
          <h1 className="text-xl font-black text-[#1A1A1A]">{me.fullName}</h1>
          <p className="text-sm text-[#64748B]">{me.jobTitle}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between border-b border-[#F1F5F9] px-5 py-3 text-sm last:border-b-0">
            <span className="font-semibold text-[#64748B]">{label}</span>
            <span className="text-[#1A1A1A]">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
