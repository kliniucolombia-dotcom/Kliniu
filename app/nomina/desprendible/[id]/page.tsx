"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { MdPrint } from "react-icons/md";
import { fmtDateOnly } from "@/lib/date";

type Desprendible = {
  period: string;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  fullName: string;
  documentNumber: string;
  jobTitle: string;
  departmentName: string | null;
  hireDate: string;
  salaryPeriod: string;
};

const PERIOD_LABELS: Record<string, string> = {
  MONTHLY: "Mensual",
  BIWEEKLY: "Quincenal",
  HOURLY: "Por hora",
};

function fmtMoney(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
}

function periodLabel(period: string) {
  const [y, m] = period.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
}

export default function DesprendiblePage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Desprendible | null>(null);
  const [error, setError] = useState("");
  const today = fmtDateOnly(new Date().toISOString(), { day: "numeric", month: "long", year: "numeric" });

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/empleado/payslips/${id}`);
      if (res.ok) setData(await res.json());
      else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "No fue posible cargar el desprendible");
      }
    })();
  }, [id]);

  if (error) return <p className="p-6 text-sm text-red-500">{error}</p>;
  if (!data) return <div className="p-6 text-sm text-[#64748B]">Cargando…</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #desprendible-imprimir,
          #desprendible-imprimir * {
            visibility: visible;
          }
          #desprendible-imprimir {
            position: fixed;
            inset: 0;
            margin: 0;
            max-width: none;
          }
        }
      `}</style>

      <div className="mx-auto mb-4 flex max-w-2xl items-center justify-between print:hidden">
        <h1 className="text-sm font-black text-[#1A1A1A]">Desprendible de pago</h1>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white hover:bg-[#1F9BA1]"
        >
          <MdPrint size={16} /> Descargar / Imprimir
        </button>
      </div>

      <div id="desprendible-imprimir" className="mx-auto max-w-2xl rounded-2xl border border-[#E2E8F0] bg-white p-10 print:border-0 print:p-0 print:shadow-none">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/foca-icono-redondo.png" alt="Kliniu" width={44} height={44} className="h-11 w-11 rounded-full" />
            <div>
              <p className="text-sm font-black text-[#1A1A1A]">Kliniu</p>
              <p className="text-xs text-[#64748B]">Recursos Humanos</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-[#64748B]">Comprobante de pago de nómina</p>
            <p className="text-xs text-[#94A3B8]">Colombia</p>
          </div>
        </div>

        <h2 className="mb-1 text-center text-lg font-black uppercase tracking-wide text-[#1A1A1A]">
          Desprendible de pago
        </h2>
        <p className="mb-6 text-center text-xs font-bold uppercase text-[#27B1B8]">
          Periodo {periodLabel(data.period)} · Pago {PERIOD_LABELS[data.salaryPeriod] ?? data.salaryPeriod}
        </p>

        <div className="mb-6 grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl bg-[#F8FAFC] p-4 text-xs">
          <div>
            <p className="text-[#94A3B8]">Empleado</p>
            <p className="font-bold text-[#1A1A1A]">{data.fullName}</p>
          </div>
          <div>
            <p className="text-[#94A3B8]">Cédula</p>
            <p className="font-bold text-[#1A1A1A]">{data.documentNumber}</p>
          </div>
          <div>
            <p className="text-[#94A3B8]">Cargo</p>
            <p className="font-bold text-[#1A1A1A]">{data.jobTitle}</p>
          </div>
          <div>
            <p className="text-[#94A3B8]">Área</p>
            <p className="font-bold text-[#1A1A1A]">{data.departmentName ?? "—"}</p>
          </div>
          <div>
            <p className="text-[#94A3B8]">Fecha de ingreso</p>
            <p className="font-bold text-[#1A1A1A]">{fmtDateOnly(data.hireDate, { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          <div>
            <p className="text-[#94A3B8]">Fecha de expedición</p>
            <p className="font-bold text-[#1A1A1A]">{today}</p>
          </div>
        </div>

        <table className="mb-6 w-full text-sm">
          <thead>
            <tr className="border-b-2 border-[#1A1A1A] text-left text-xs font-bold uppercase text-[#64748B]">
              <th className="pb-2">Concepto</th>
              <th className="pb-2 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[#F1F5F9]">
              <td className="py-2 text-[#1A1A1A]">Salario devengado</td>
              <td className="py-2 text-right font-bold text-[#1A1A1A]">{fmtMoney(data.grossAmount)}</td>
            </tr>
            <tr className="border-b border-[#F1F5F9]">
              <td className="py-2 text-[#1A1A1A]">Deducciones (seguridad social y otros)</td>
              <td className="py-2 text-right font-bold text-[#DC2626]">-{fmtMoney(data.deductions)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#1A1A1A]">
              <td className="pt-3 text-sm font-black text-[#1A1A1A]">Neto a pagar</td>
              <td className="pt-3 text-right text-base font-black text-[#16A34A]">{fmtMoney(data.netAmount)}</td>
            </tr>
          </tfoot>
        </table>

        <p className="text-xs leading-6 text-[#64748B]">
          Este documento se expide como comprobante de pago de nómina correspondiente al periodo indicado,
          de conformidad con la legislación laboral colombiana.
        </p>

        <div className="mt-16 border-t border-[#E2E8F0] pt-3 text-xs text-[#94A3B8]">
          Recursos Humanos — Kliniu
        </div>
      </div>
    </div>
  );
}
