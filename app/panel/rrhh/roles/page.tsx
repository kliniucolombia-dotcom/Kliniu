"use client";
import { useEffect, useState } from "react";
import {
  MdWorkspacePremium, MdShoppingBag, MdPeople, MdVerifiedUser, MdBadge,
  MdWarehouse, MdPalette, MdCampaign, MdTrendingUp, MdAccountBalance,
  MdSettings, MdGroups, MdChevronRight,
} from "react-icons/md";

type RoleRow = {
  role: string;
  name: string;
  description: string;
  userCount: number;
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  ADMIN: <MdWorkspacePremium />,
  SELLER: <MdBadge />,
  PACKING: <MdShoppingBag />,
  SUPERADMIN: <MdVerifiedUser />,
  RRHH: <MdGroups />,
  EMPLOYEE: <MdPeople />,
  BODEGA: <MdWarehouse />,
  DISENO: <MdPalette />,
  MARKETING: <MdCampaign />,
  JEFE_VENTAS: <MdTrendingUp />,
  TESORERIA: <MdAccountBalance />,
  INGENIERIA: <MdSettings />,
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
      <div className="flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#E8FAFB] text-2xl text-[#0C535B]">
          <MdGroups />
        </span>
        <div>
          <h1 className="text-2xl font-black text-[#1A1A1A]">Roles</h1>
          <p className="mt-0.5 text-sm text-[#64748B]">
            Datos reales de Kliniu. Solo lectura por ahora — la gestión completa de roles y permisos
            se administra desde Usuarios.
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="space-y-3">
        {roles.map((r) => (
          <div
            key={r.role}
            className="flex items-center gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-4 transition-colors hover:border-[#27B1B8]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E8FAFB] text-xl text-[#0C535B]">
              {ROLE_ICONS[r.role] ?? <MdPeople />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-black text-[#1A1A1A]">{r.name}</p>
              <p className="truncate text-sm text-[#64748B]">{r.description}</p>
            </div>
            <span className="shrink-0 rounded-full bg-[#E8FAFB] px-3 py-1 text-xs font-bold text-[#0C535B]">
              {r.userCount} {r.userCount === 1 ? "usuario" : "usuarios"}
            </span>
            <MdChevronRight className="shrink-0 text-[#94A3B8]" />
          </div>
        ))}
        {roles.length === 0 && !error && (
          <p className="text-sm text-[#94A3B8]">Sin roles configurados todavía.</p>
        )}
      </div>
    </div>
  );
}
