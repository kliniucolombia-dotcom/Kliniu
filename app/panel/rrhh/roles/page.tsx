"use client";
import { useEffect, useState } from "react";

type RoleRow = {
  role: string;
  name: string;
  userCount: number;
};

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/rrhh-local/roles");
      if (res.ok) setRoles(await res.json());
      else setError("No fue posible cargar los roles");
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-6">Cargando…</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-black text-[#1A1A1A]">Roles</h1>
      <p className="text-sm text-[#64748B]">
        Datos reales de Kliniu. Solo lectura por ahora — la gestión completa de roles y permisos
        se administra desde Usuarios.
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="space-y-3">
        {roles.map((r) => (
          <div key={r.role} className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-white p-4">
            <p className="font-black text-[#1A1A1A]">{r.name}</p>
            <span className="rounded-full bg-[#E8FAFB] px-3 py-1 text-xs font-bold text-[#0C535B]">
              {r.userCount} {r.userCount === 1 ? "usuario" : "usuarios"}
            </span>
          </div>
        ))}
        {roles.length === 0 && !error && (
          <p className="text-sm text-[#94A3B8]">Sin roles configurados todavía.</p>
        )}
      </div>
    </div>
  );
}
