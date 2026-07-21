"use client";
import { useEffect, useState } from "react";
import { MdAccountTree, MdApartment, MdPerson } from "react-icons/md";

type DirectoryEmployee = { id: string; jobTitle: string; user: { fullName: string } };
type DirectoryDepartment = { id: string; name: string; employees: DirectoryEmployee[] };

export default function OrganigramaPage() {
  const [departments, setDepartments] = useState<DirectoryDepartment[]>([]);
  const [unassigned, setUnassigned] = useState<DirectoryEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/empleado/directorio");
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.departments);
        setUnassigned(data.unassigned);
      } else {
        setError("No fue posible cargar el organigrama");
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-6 text-sm text-[#64748B]">Cargando…</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E6FAFB] text-[#27B1B8]">
          <MdAccountTree size={20} />
        </div>
        <div>
          <h1 className="text-xl font-black text-[#1A1A1A]">Organigrama</h1>
          <p className="text-xs text-[#64748B]">Estructura de departamentos y colaboradores activos</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {departments.map((dept) => (
          <div key={dept.id} className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0F9FF] text-[#0369A1]">
                <MdApartment size={16} />
              </div>
              <div>
                <p className="text-sm font-black text-[#1A1A1A]">{dept.name}</p>
                <p className="text-[10px] text-[#94A3B8]">{dept.employees.length} colaboradores</p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {dept.employees.map((e) => (
                <div key={e.id} className="flex items-center gap-2 text-xs">
                  <MdPerson size={14} className="text-[#94A3B8]" />
                  <span className="font-bold text-[#1A1A1A]">{e.user.fullName}</span>
                  <span className="text-[#94A3B8]">— {e.jobTitle}</span>
                </div>
              ))}
              {dept.employees.length === 0 && <p className="text-xs text-[#94A3B8]">Sin colaboradores activos.</p>}
            </div>
          </div>
        ))}

        {unassigned.length > 0 && (
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <p className="text-sm font-black text-[#1A1A1A]">Sin departamento</p>
            <div className="mt-3 space-y-2">
              {unassigned.map((e) => (
                <div key={e.id} className="flex items-center gap-2 text-xs">
                  <MdPerson size={14} className="text-[#94A3B8]" />
                  <span className="font-bold text-[#1A1A1A]">{e.user.fullName}</span>
                  <span className="text-[#94A3B8]">— {e.jobTitle}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {departments.length === 0 && unassigned.length === 0 && (
          <p className="text-sm text-[#94A3B8]">Sin departamentos registrados.</p>
        )}
      </div>
    </div>
  );
}
