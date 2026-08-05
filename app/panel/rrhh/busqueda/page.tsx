"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MdSearch, MdPersonOutline, MdSupportAgent, MdBeachAccess, MdDescription } from "react-icons/md";

type Employee = { id: string; employeeCode: string; jobTitle: string; user: { fullName: string; email: string } };
type Ticket = { id: string; code: string; subject: string; category: { name: string }; employee: { user: { fullName: string } } };
type TimeOff = { id: string; type: string; reason: string | null; employee: { user: { fullName: string } } };
type Doc = { id: string; name: string; category: string; employee: { user: { fullName: string } } };

type Results = { employees: Employee[]; tickets: Ticket[]; timeOff: TimeOff[]; documents: Doc[] };

const TIME_OFF_LABELS: Record<string, string> = {
  VACATION: "Vacaciones", PERMIT: "Permiso", LEAVE: "Licencia", INCAPACITY: "Incapacidad", UNPAID: "Sin remuneración",
};

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

export default function BusquedaPanelPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/rrhh-local/buscar?q=${encodeURIComponent(query)}`);
      if (res.ok) setResults(await res.json());
      setLoading(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [q]);

  const totalResults = results
    ? results.employees.length + results.tickets.length + results.timeOff.length + results.documents.length
    : 0;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-black text-[#1A1A1A]">Búsqueda</h1>
        <p className="text-xs text-[#64748B]">Busca colaboradores, tickets, solicitudes y documentos de RRHH en un solo lugar.</p>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-3">
        <MdSearch size={20} className="text-[#94A3B8]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, código, correo, ticket…"
          autoFocus
          className="w-full text-sm text-[#1A1A1A] outline-none"
        />
      </div>

      {q.trim().length > 0 && q.trim().length < 2 && (
        <p className="text-sm text-[#94A3B8]">Escribe al menos 2 caracteres.</p>
      )}

      {loading && <p className="text-sm text-[#64748B]">Buscando…</p>}

      {!loading && results && totalResults === 0 && (
        <p className="text-sm text-[#94A3B8]">Sin resultados para &quot;{q}&quot;.</p>
      )}

      {!loading && results && totalResults > 0 && (
        <div className="space-y-6">
          {results.employees.length > 0 && (
            <ResultGroup title="Colaboradores" icon={<MdPersonOutline size={16} />} href="/panel/rrhh/empleados">
              {results.employees.map((e) => (
                <div key={e.id} className="flex items-center gap-3 border-b border-[#F1F5F9] p-3 last:border-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E6FAFB] text-xs font-bold text-[#27B1B8]">
                    {initials(e.user.fullName)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#1A1A1A]">{e.user.fullName}</p>
                    <p className="truncate text-xs text-[#64748B]">{e.jobTitle} · {e.employeeCode} · {e.user.email}</p>
                  </div>
                </div>
              ))}
            </ResultGroup>
          )}

          {results.tickets.length > 0 && (
            <ResultGroup title="Tickets" icon={<MdSupportAgent size={16} />} href="/panel/rrhh/solicitudes">
              {results.tickets.map((t) => (
                <div key={t.id} className="border-b border-[#F1F5F9] p-3 last:border-0">
                  <p className="text-sm font-bold text-[#1A1A1A]">{t.code} · {t.subject}</p>
                  <p className="text-xs text-[#64748B]">{t.category.name} · {t.employee.user.fullName}</p>
                </div>
              ))}
            </ResultGroup>
          )}

          {results.timeOff.length > 0 && (
            <ResultGroup title="Vacaciones y permisos" icon={<MdBeachAccess size={16} />} href="/panel/rrhh/ausencias">
              {results.timeOff.map((r) => (
                <div key={r.id} className="border-b border-[#F1F5F9] p-3 last:border-0">
                  <p className="text-sm font-bold text-[#1A1A1A]">{TIME_OFF_LABELS[r.type] || r.type} · {r.employee.user.fullName}</p>
                  {r.reason && <p className="truncate text-xs text-[#64748B]">{r.reason}</p>}
                </div>
              ))}
            </ResultGroup>
          )}

          {results.documents.length > 0 && (
            <ResultGroup title="Documentos" icon={<MdDescription size={16} />} href="/panel/rrhh/documentos">
              {results.documents.map((d) => (
                <div key={d.id} className="border-b border-[#F1F5F9] p-3 last:border-0">
                  <p className="text-sm font-bold text-[#1A1A1A]">{d.name}</p>
                  <p className="text-xs text-[#64748B]">{d.employee.user.fullName}</p>
                </div>
              ))}
            </ResultGroup>
          )}
        </div>
      )}
    </div>
  );
}

function ResultGroup({ title, icon, href, children }: { title: string; icon: React.ReactNode; href: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] p-3">
        <div className="flex items-center gap-2 text-sm font-black text-[#1A1A1A]">
          {icon} {title}
        </div>
        <Link href={href} className="text-xs font-bold text-[#27B1B8] hover:underline">Ver módulo</Link>
      </div>
      {children}
    </div>
  );
}
