"use client";
import { useEffect, useState } from "react";

type Role = "CUSTOMER" | "ADMIN" | "SELLER" | "PACKING" | "SUPERADMIN";
type Status = "ACTIVE" | "INACTIVE" | "SUSPENDED";

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  status: Status;
};

type DeletionImpact = {
  orders: number;
  quotations: number;
  campaigns: number;
  productionRuns: number;
  productionOrders: number;
  priceHistory: number;
  sellerConfig: number;
  ordersUnassigned: number;
  productionOrdersUnapproved: number;
};

type ModulePermission = {
  module: string;
  isOverride: boolean;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

const MODULE_LABELS: Record<string, string> = {
  MODULE_DASHBOARD: "Dashboard",
  MODULE_PEDIDOS: "Pedidos",
  MODULE_PRODUCTOS: "Productos",
  MODULE_METRICAS: "Métricas",
  MODULE_CAMPANAS: "Campañas",
  MODULE_COSTOS: "Costos",
  MODULE_CALCULADORA_PRECIO: "Precio de Venta",
  MODULE_COTIZACIONES: "Cotizaciones",
  MODULE_PRODUCCION: "Producción",
  MODULE_ODOO: "Odoo",
  MODULE_USUARIOS: "Usuarios",
  MODULE_BANNERS: "Banners",
  MODULE_COMBOS: "Combos",
};

const ROLES: Role[] = ["CUSTOMER", "ADMIN", "SELLER", "PACKING", "SUPERADMIN"];
const STATUSES: Status[] = ["ACTIVE", "INACTIVE", "SUSPENDED"];

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: "SELLER" as Role });
  const [showPassword, setShowPassword] = useState(false);
  const [permUserId, setPermUserId] = useState<string | null>(null);
  const [perms, setPerms] = useState<ModulePermission[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteImpact, setDeleteImpact] = useState<DeletionImpact | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    const res = await fetch("/api/panel/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
    } else {
      setError("No autorizado o error al cargar usuarios");
    }
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const createUser = async () => {
    setError("");
    const res = await fetch("/api/panel/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ fullName: "", email: "", password: "", role: "SELLER" });
      setCreating(false);
      loadUsers();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al crear usuario");
    }
  };

  const updateUser = async (id: string, patch: Partial<Pick<UserRow, "role" | "status">>) => {
    const res = await fetch(`/api/panel/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) loadUsers();
  };

  const confirmDeleteUser = async (force = false) => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/panel/users/${deleteTarget.id}${force ? "?force=true" : ""}`, { method: "DELETE" });
    if (res.ok) {
      setDeleteTarget(null);
      setDeleteImpact(null);
      loadUsers();
    } else if (res.status === 409) {
      const data = await res.json().catch(() => ({}));
      if (data.requiresConfirmation && data.impact) {
        setDeleteImpact(data.impact);
      } else {
        setError(data.error ?? "Error al eliminar usuario");
        setDeleteTarget(null);
        setDeleteImpact(null);
      }
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al eliminar usuario");
      setDeleteTarget(null);
      setDeleteImpact(null);
    }
    setDeleting(false);
  };

  const openPermissions = async (id: string) => {
    setPermUserId(id);
    const res = await fetch(`/api/panel/users/${id}/permissions`);
    if (res.ok) {
      const data = await res.json();
      setPerms(data.permissions);
    }
  };

  const togglePerm = (module: string, field: keyof Omit<ModulePermission, "module" | "isOverride">) => {
    setPerms((prev) => prev.map((p) => (p.module === module ? { ...p, [field]: !p[field] } : p)));
  };

  const savePermissions = async () => {
    if (!permUserId) return;
    const res = await fetch(`/api/panel/users/${permUserId}/permissions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        permissions: perms.map(({ module, canView, canCreate, canEdit, canDelete }) => ({
          module, canView, canCreate, canEdit, canDelete,
        })),
      }),
    });
    if (res.ok) setPermUserId(null);
  };

  if (loading) return <div className="p-6">Cargando…</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-[#1A1A1A]">Usuarios</h1>
        <button
          onClick={() => setCreating((c) => !c)}
          className="rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white"
        >
          {creating ? "Cancelar" : "Nuevo usuario"}
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {creating && (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 md:grid-cols-4">
          <input placeholder="Nombre completo" value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <input placeholder="Correo" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <div className="relative">
            <input placeholder="Contraseña" type={showPassword ? "text" : "password"} value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 pr-9 text-sm" />
            <button type="button" onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#27B1B8]">
              {showPassword ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M3 3l18 18" />
                  <path d="M10.6 5.2A10.6 10.6 0 0112 5c6 0 10 7 10 7a17.7 17.7 0 01-3.2 4M6.5 6.6C3.9 8.3 2 12 2 12s4 7 10 7a9.9 9.9 0 004.4-1" />
                  <path d="M9.9 9.9a3 3 0 004.2 4.2" />
                </svg>
              )}
            </button>
          </div>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm">
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button onClick={createUser} className="col-span-full rounded-lg bg-[#27B1B8] px-3 py-2 text-sm font-bold text-white">
            Crear
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-[#E2E8F0] text-left text-xs font-bold text-[#64748B]">
            <th className="p-3">Nombre</th>
            <th className="p-3">Correo</th>
            <th className="p-3">Rol</th>
            <th className="p-3">Estado</th>
            <th className="sticky right-0 border-l border-[#E2E8F0] bg-[#F8FAFC] p-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-[#F1F5F9]">
              <td className="p-3">{u.fullName}</td>
              <td className="p-3">{u.email}</td>
              <td className="p-3">
                <select value={u.role} onChange={(e) => updateUser(u.id, { role: e.target.value as Role })}
                  className="rounded-lg border border-[#E2E8F0] px-2 py-1 text-xs">
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </td>
              <td className="p-3">
                <select value={u.status} onChange={(e) => updateUser(u.id, { status: e.target.value as Status })}
                  className="rounded-lg border border-[#E2E8F0] px-2 py-1 text-xs">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
              <td className="sticky right-0 border-l border-[#E2E8F0] bg-white p-3">
                <div className="flex flex-col gap-1">
                  <button onClick={() => openPermissions(u.id)} className="text-xs font-bold text-[#27B1B8]">
                    Editar permisos
                  </button>
                  <button onClick={() => { setDeleteTarget(u); setDeleteImpact(null); }} className="text-xs font-bold text-red-500">
                    Eliminar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {permUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-4">
            <h2 className="mb-3 text-sm font-black">Permisos por módulo</h2>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[#64748B]">
                  <th className="p-2">Módulo</th>
                  <th className="p-2">Ver</th>
                  <th className="p-2">Crear</th>
                  <th className="p-2">Editar</th>
                  <th className="p-2">Eliminar</th>
                </tr>
              </thead>
              <tbody>
                {perms.map((p) => (
                  <tr key={p.module} className="border-t border-[#F1F5F9]">
                    <td className="p-2 font-semibold">
                      {MODULE_LABELS[p.module] ?? p.module}
                      {p.isOverride && <span className="ml-1 text-[10px] text-[#27B1B8]">(personalizado)</span>}
                    </td>
                    {(["canView", "canCreate", "canEdit", "canDelete"] as const).map((field) => (
                      <td key={field} className="p-2">
                        <input type="checkbox" checked={p[field]} onChange={() => togglePerm(p.module, field)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setPermUserId(null)} className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs font-bold">
                Cancelar
              </button>
              <button onClick={savePermissions} className="rounded-lg bg-[#27B1B8] px-3 py-2 text-xs font-bold text-white">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && !deleteImpact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5">
            <h2 className="mb-2 text-sm font-black text-[#1A1A1A]">Eliminar usuario</h2>
            <p className="text-sm text-[#64748B]">
              ¿Eliminar a <span className="font-bold text-[#1A1A1A]">{deleteTarget.fullName}</span> ({deleteTarget.email})?
              Esta acción no se puede deshacer.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs font-bold disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => confirmDeleteUser(false)}
                disabled={deleting}
                className="rounded-lg bg-red-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {deleting ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && deleteImpact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5">
            <h2 className="mb-2 text-sm font-black text-[#DC2626]">Este usuario tiene historial</h2>
            <p className="mb-2 text-sm text-[#64748B]">
              <span className="font-bold text-[#1A1A1A]">{deleteTarget.fullName}</span> ({deleteTarget.email}) tiene registros asociados que también se eliminarán o desvincularán:
            </p>
            <ul className="mb-3 space-y-1 text-xs text-[#64748B]">
              {deleteImpact.orders > 0 && <li>• {deleteImpact.orders} pedido(s)</li>}
              {deleteImpact.quotations > 0 && <li>• {deleteImpact.quotations} cotización(es)</li>}
              {deleteImpact.campaigns > 0 && <li>• {deleteImpact.campaigns} campaña(s)</li>}
              {deleteImpact.productionRuns > 0 && <li>• {deleteImpact.productionRuns} corrida(s) de producción</li>}
              {deleteImpact.productionOrders > 0 && <li>• {deleteImpact.productionOrders} orden(es) de producción</li>}
              {deleteImpact.priceHistory > 0 && <li>• {deleteImpact.priceHistory} cambio(s) de precio registrados</li>}
              {deleteImpact.sellerConfig > 0 && <li>• configuración de costos/calculadora de vendedor</li>}
              {deleteImpact.ordersUnassigned > 0 && <li>• {deleteImpact.ordersUnassigned} pedido(s) donde queda como vendedor asignado (se desvinculará)</li>}
              {deleteImpact.productionOrdersUnapproved > 0 && <li>• {deleteImpact.productionOrdersUnapproved} orden(es) de producción que aprobó (se desvinculará)</li>}
            </ul>
            <p className="mb-3 text-xs font-bold text-[#DC2626]">Esta acción es irreversible.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteImpact(null); }}
                disabled={deleting}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs font-bold disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => confirmDeleteUser(true)}
                disabled={deleting}
                className="rounded-lg bg-red-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {deleting ? "Eliminando…" : "Sí, eliminar todo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
