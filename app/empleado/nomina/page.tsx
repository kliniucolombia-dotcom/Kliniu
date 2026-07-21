"use client";
import { useEffect, useState } from "react";
import { MdPayments, MdDownload } from "react-icons/md";

type Payslip = {
  id: string;
  period: string;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  fileUrl: string | null;
  fileName: string | null;
  createdAt: string;
};

function fmtMoney(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
}

export default function NominaPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/rrhh-local/payslips");
      if (res.ok) setPayslips(await res.json());
      else setError("No fue posible cargar tu nómina");
      setLoading(false);
    })();
  }, []);

  const view = async (fileUrl: string) => {
    const res = await fetch(`/api/rrhh-local/time-off/upload?path=${encodeURIComponent(fileUrl)}`);
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) window.open(data.url, "_blank");
    else setError(data.error || "No fue posible abrir el desprendible");
  };

  if (loading) return <div className="p-6 text-sm text-[#64748B]">Cargando…</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E6FAFB] text-[#27B1B8]">
          <MdPayments size={20} />
        </div>
        <div>
          <h1 className="text-xl font-black text-[#1A1A1A]">Mi nómina</h1>
          <p className="text-xs text-[#64748B]">Desprendibles de pago generados por Recursos Humanos</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] text-left text-xs font-bold text-[#64748B]">
              <th className="p-3">Periodo</th>
              <th className="p-3">Devengado</th>
              <th className="p-3">Deducciones</th>
              <th className="p-3">Neto</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {payslips.map((p) => (
              <tr key={p.id} className="border-b border-[#F1F5F9]">
                <td className="p-3 font-bold text-[#1A1A1A]">{p.period}</td>
                <td className="p-3">{fmtMoney(p.grossAmount)}</td>
                <td className="p-3 text-[#DC2626]">-{fmtMoney(p.deductions)}</td>
                <td className="p-3 font-bold text-[#16A34A]">{fmtMoney(p.netAmount)}</td>
                <td className="p-3">
                  {p.fileUrl ? (
                    <button onClick={() => view(p.fileUrl!)}
                      className="flex items-center gap-1 text-xs font-bold text-[#27B1B8] hover:underline">
                      <MdDownload size={14} /> Ver
                    </button>
                  ) : "—"}
                </td>
              </tr>
            ))}
            {payslips.length === 0 && (
              <tr><td className="p-3 text-[#94A3B8]" colSpan={5}>Sin desprendibles publicados todavía.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
