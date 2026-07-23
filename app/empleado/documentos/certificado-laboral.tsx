"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { MdPrint, MdVerified, MdHourglassEmpty, MdCancel } from "react-icons/md";
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

type CertificateRequest = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  includeSalary: boolean;
  reviewNote: string | null;
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
  const [request, setRequest] = useState<CertificateRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [includeSalary, setIncludeSalary] = useState(false);
  const [solicitando, setSolicitando] = useState(false);
  const today = fmtDateOnly(new Date().toISOString(), { day: "numeric", month: "long", year: "numeric" });

  const load = async () => {
    const res = await fetch("/api/empleado/certificado");
    if (res.ok) {
      const json = await res.json();
      setRequest(json.request ?? null);
      setData(json.data ?? null);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "No fue posible cargar tu certificado laboral");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const solicitar = async () => {
    setSolicitando(true);
    const res = await fetch("/api/empleado/certificado", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ includeSalary }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      setRequest(json.request);
      setData(null);
    } else {
      setError(json.error || "No fue posible enviar tu solicitud");
    }
    setSolicitando(false);
  };

  if (loading) return null;
  if (error && !request) return <p className="text-sm text-red-500">{error}</p>;

  if (!request || request.status === "REJECTED") {
    return (
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E6FAFB] text-[#27B1B8]">
            <MdVerified size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black text-[#1A1A1A]">Certificado laboral</h2>
            <p className="text-xs text-[#64748B]">Solicítalo y Recursos Humanos lo aprobará antes de poder descargarlo.</p>
          </div>
        </div>

        {request?.status === "REJECTED" && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-[#FEE2E2] px-3 py-2 text-sm text-[#DC2626]">
            <MdCancel size={18} className="mt-0.5 shrink-0" />
            <span>Tu solicitud anterior fue rechazada{request.reviewNote ? `: ${request.reviewNote}` : "."} Puedes solicitar de nuevo.</span>
          </div>
        )}

        <label className="mb-4 flex w-fit items-center gap-2 rounded-lg bg-[#F0FDFF] px-3 py-2 text-sm font-semibold text-[#1A1A1A]">
          <input type="checkbox" checked={includeSalary} onChange={(e) => setIncludeSalary(e.target.checked)} />
          Incluir información salarial
        </label>

        <button
          onClick={solicitar}
          disabled={solicitando}
          className="flex items-center gap-1.5 rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white hover:bg-[#1F9BA1] disabled:opacity-60"
        >
          {solicitando ? "Enviando..." : "Solicitar certificado"}
        </button>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  if (request.status === "PENDING") {
    return (
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FEF3C7] text-[#B45309]">
            <MdHourglassEmpty size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black text-[#1A1A1A]">Certificado laboral</h2>
            <p className="text-xs text-[#64748B]">Tu solicitud está en revisión por Recursos Humanos.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

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
            <p className="text-xs text-[#64748B]">Aprobado por Recursos Humanos. Descarga tu certificado en PDF.</p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white hover:bg-[#1F9BA1]"
        >
          <MdPrint size={16} /> Descargar / Imprimir
        </button>
      </div>

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

        {request.includeSalary && data.salaryAmount && (
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
