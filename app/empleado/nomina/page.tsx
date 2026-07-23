"use client";
import { useEffect, useMemo, useState } from "react";
import { MdPayments, MdDownload, MdVisibility, MdAccountBalanceWallet, MdMoneyOff, MdTrendingUp, MdInfoOutline } from "react-icons/md";

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
  const [fullName, setFullName] = useState("");
  const [salaryAmount, setSalaryAmount] = useState<number | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [year, setYear] = useState<string>("");

  useEffect(() => {
    (async () => {
      const [meRes, payslipsRes] = await Promise.all([
        fetch("/api/empleado/me"),
        fetch("/api/rrhh-local/payslips"),
      ]);
      if (meRes.ok) {
        const me = await meRes.json();
        setFullName(me.fullName);
        setSalaryAmount(me.salaryAmount ?? null);
      }
      if (payslipsRes.ok) setPayslips(await payslipsRes.json());
      else setError("No fue posible cargar tu nómina");
      setLoading(false);
    })();
  }, []);

  const years = useMemo(() => {
    const set = new Set(payslips.map((p) => p.period.slice(0, 4)));
    return Array.from(set).sort().reverse();
  }, [payslips]);

  useEffect(() => {
    if (!year && years.length > 0) setYear(years[0]);
  }, [years, year]);

  const filtered = useMemo(
    () => payslips.filter((p) => !year || p.period.startsWith(year)),
    [payslips, year],
  );

  const latest = filtered[0] ?? null;

  const yearTotals = useMemo(
    () =>
      filtered.reduce(
        (acc, p) => ({
          gross: acc.gross + p.grossAmount,
          deductions: acc.deductions + p.deductions,
          net: acc.net + p.netAmount,
        }),
        { gross: 0, deductions: 0, net: 0 },
      ),
    [filtered],
  );

  const view = async (fileUrl: string) => {
    const res = await fetch(`/api/rrhh-local/time-off/upload?path=${encodeURIComponent(fileUrl)}`);
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) window.open(data.url, "_blank");
    else setError(data.error || "No fue posible abrir el desprendible");
  };

  if (loading) return <div className="p-6 text-sm text-[#64748B]">Cargando…</div>;

  const firstName = fullName.split(" ")[0] || "";

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-black text-[#1A1A1A]">¡Hola, {firstName}! 👋</h1>
        <p className="text-xs text-[#64748B]">Consulta tus desprendibles de pago y el resumen de tu nómina.</p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#DCFCE7] text-[#16A34A]">
            <MdAccountBalanceWallet size={20} />
          </div>
          <div>
            <p className="text-lg font-black text-[#1A1A1A]">{salaryAmount ? fmtMoney(salaryAmount) : "—"}</p>
            <p className="text-xs font-bold text-[#64748B]">Salario básico</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FEF3C7] text-[#B45309]">
            <MdPayments size={20} />
          </div>
          <div>
            <p className="text-lg font-black text-[#1A1A1A]">{latest ? fmtMoney(latest.grossAmount) : "—"}</p>
            <p className="text-xs font-bold text-[#64748B]">Devengado último mes</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FEE2E2] text-[#DC2626]">
            <MdMoneyOff size={20} />
          </div>
          <div>
            <p className="text-lg font-black text-[#DC2626]">{latest ? `-${fmtMoney(latest.deductions)}` : "—"}</p>
            <p className="text-xs font-bold text-[#64748B]">Deducciones último mes</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E6FAFB] text-[#27B1B8]">
            <MdTrendingUp size={20} />
          </div>
          <div>
            <p className="text-lg font-black text-[#1A1A1A]">{latest ? fmtMoney(latest.netAmount) : "—"}</p>
            <p className="text-xs font-bold text-[#64748B]">Neto a pagar</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] p-4">
            <div>
              <h2 className="text-sm font-black text-[#1A1A1A]">Desprendibles de pago</h2>
              <p className="text-xs text-[#64748B]">Consulta y descarga tus desprendibles generados por Recursos Humanos.</p>
            </div>
            {years.length > 0 && (
              <select value={year} onChange={(e) => setYear(e.target.value)}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm">
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
          </div>
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-left text-xs font-bold text-[#64748B]">
                <th className="p-3">Periodo</th>
                <th className="p-3">Devengado</th>
                <th className="p-3">Deducciones</th>
                <th className="p-3">Neto</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-[#F1F5F9]">
                  <td className="p-3 font-bold text-[#1A1A1A]">{p.period}</td>
                  <td className="p-3">{fmtMoney(p.grossAmount)}</td>
                  <td className="p-3 text-[#DC2626]">-{fmtMoney(p.deductions)}</td>
                  <td className="p-3 font-bold text-[#16A34A]">{fmtMoney(p.netAmount)}</td>
                  <td className="p-3">
                    <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-xs font-bold text-[#16A34A]">Publicado</span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {p.fileUrl && (
                        <button onClick={() => view(p.fileUrl!)} title="Ver archivo"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]">
                          <MdVisibility size={16} />
                        </button>
                      )}
                      <a href={`/nomina/desprendible/${p.id}`} title="Descargar desprendible" target="_blank" rel="noreferrer"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#27B1B8] hover:bg-[#E6FAFB]">
                        <MdDownload size={16} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td className="p-3 text-[#94A3B8]" colSpan={6}>Sin desprendibles publicados todavía.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-4">
          <div className="space-y-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
            <div className="flex items-center gap-2">
              <MdInfoOutline className="text-[#27B1B8]" size={18} />
              <h3 className="text-sm font-black text-[#1A1A1A]">Información importante</h3>
            </div>
            <div>
              <p className="text-xs font-bold text-[#1A1A1A]">Devengados</p>
              <p className="text-xs text-[#64748B]">Incluye tu salario, horas extras, bonificaciones y otros ingresos.</p>
            </div>
            <div>
              <p className="text-xs font-bold text-[#1A1A1A]">Deducciones</p>
              <p className="text-xs text-[#64748B]">Incluye aportes a seguridad social, retenciones y otros descuentos.</p>
            </div>
            <div>
              <p className="text-xs font-bold text-[#1A1A1A]">¿Dudas sobre tu nómina?</p>
              <p className="text-xs text-[#64748B]">Contacta a Recursos Humanos para más información.</p>
            </div>
          </div>

          {year && (
            <div className="space-y-2 rounded-xl border border-[#E2E8F0] bg-white p-4">
              <h3 className="text-sm font-black text-[#1A1A1A]">Resumen anual {year}</h3>
              <div className="flex justify-between text-xs">
                <span className="text-[#64748B]">Total devengado</span>
                <span className="font-bold text-[#1A1A1A]">{fmtMoney(yearTotals.gross)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#64748B]">Total deducciones</span>
                <span className="font-bold text-[#DC2626]">-{fmtMoney(yearTotals.deductions)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#64748B]">Total neto recibido</span>
                <span className="font-bold text-[#16A34A]">{fmtMoney(yearTotals.net)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
