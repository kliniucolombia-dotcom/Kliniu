"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { MdPrint, MdVerified } from "react-icons/md";
import { fmtDateOnly } from "@/lib/date";

type Certificado = {
  fullName: string;
  documentNumber: string;
  jobTitle: string;
  departmentName: string | null;
  contractType: string;
  hireDate: string;
  salaryAmount: number | null;
  salaryCurrency: string;
  salaryPeriod: string;
};

const PERIOD_LABELS: Record<string, string> = {
  MONTHLY: "mensual",
  BIWEEKLY: "quincenal",
  HOURLY: "por hora",
};

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export default function CertificadoLaboral() {
  const [data, setData] = useState<Certificado | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [includeSalary, setIncludeSalary] = useState(false);
  const today = fmtDateOnly(new Date().toISOString(), { day: "numeric", month: "long", year: "numeric" });

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/empleado/certificado");
      if (res.ok) setData(await res.json());
      else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "No fue posible generar tu certificado laboral");
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return null;
  if (!data) return error ? <p className="text-sm text-red-500">{error}</p> : null;

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #certificado-imprimir,
          #certificado-imprimir * {
            visibility: visible;
          }
          #certificado-imprimir {
            position: fixed;
            inset: 0;
            margin: 0;
            max-width: none;
          }
        }
      `}</style>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E6FAFB] text-[#27B1B8]">
            <MdVerified size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black text-[#1A1A1A]">Certificado laboral</h2>
            <p className="text-xs text-[#64748B]">Genera y descarga tu certificado en PDF.</p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white hover:bg-[#1F9BA1]"
        >
          <MdPrint size={16} /> Descargar / Imprimir
        </button>
      </div>

      <label className="mb-4 flex w-fit items-center gap-2 rounded-lg bg-[#F0FDFF] px-3 py-2 text-sm font-semibold text-[#1A1A1A] print:hidden">
        <input type="checkbox" checked={includeSalary} onChange={(e) => setIncludeSalary(e.target.checked)} />
        Incluir información salarial
      </label>

      <div id="certificado-imprimir" className="mx-auto max-w-2xl rounded-2xl border border-[#E2E8F0] bg-white p-10 print:border-0 print:p-0 print:shadow-none">
        <div className="mb-8 flex items-center gap-3">
          <Image src="/foca-icono-redondo.png" alt="Kliniu" width={44} height={44} className="h-11 w-11 rounded-full" />
          <div>
            <p className="text-sm font-black text-[#1A1A1A]">Kliniu</p>
            <p className="text-xs text-[#64748B]">Recursos Humanos</p>
          </div>
        </div>

        <h2 className="mb-6 text-center text-lg font-black uppercase tracking-wide text-[#1A1A1A]">
          Certificado laboral
        </h2>

        <p className="text-sm leading-7 text-[#1A1A1A]">
          Recursos Humanos de Kliniu certifica que <strong>{data.fullName}</strong>, identificado(a) con
          cédula de ciudadanía número <strong>{data.documentNumber}</strong>, labora actualmente en la empresa
          desde el <strong>{fmtDateOnly(data.hireDate, { day: "numeric", month: "long", year: "numeric" })}</strong>,
          desempeñando el cargo de <strong>{data.jobTitle}</strong>
          {data.departmentName ? <> en el área de <strong>{data.departmentName}</strong></> : null}, bajo un
          contrato a <strong>{data.contractType.toLowerCase()}</strong>.
        </p>

        {includeSalary && data.salaryAmount && (
          <p className="mt-4 text-sm leading-7 text-[#1A1A1A]">
            Su remuneración actual es de <strong>{formatMoney(data.salaryAmount, data.salaryCurrency)}</strong>{" "}
            de pago {PERIOD_LABELS[data.salaryPeriod] ?? data.salaryPeriod}.
          </p>
        )}

        <p className="mt-4 text-sm leading-7 text-[#1A1A1A]">
          Este certificado se expide a solicitud del interesado, para los fines que estime convenientes.
        </p>

        <p className="mt-8 text-sm text-[#1A1A1A]">Se expide en Bogotá, a los {today}.</p>

        <div className="mt-16 border-t border-[#E2E8F0] pt-3 text-xs text-[#94A3B8]">
          Recursos Humanos — Kliniu
        </div>
      </div>
    </div>
  );
}
