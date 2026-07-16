"use client";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_PERMISSIONS } from "@/lib/permission-defaults";

type Role = "CUSTOMER" | "ADMIN" | "SELLER" | "PACKING" | "SUPERADMIN" | "RRHH" | "BODEGA" | "DISENO" | "MARKETING" | "JEFE_VENTAS" | "TESORERIA" | "INGENIERIA";
type Status = "ACTIVE" | "INACTIVE" | "SUSPENDED";

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  status: Status;
  createdAt: string;
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
  MODULE_RRHH: "Recursos Humanos",
  MODULE_OUTLET: "Outlet",
};

const ROLES: Role[] = ["CUSTOMER", "ADMIN", "SELLER", "PACKING", "SUPERADMIN", "RRHH", "BODEGA", "DISENO", "MARKETING", "JEFE_VENTAS", "TESORERIA", "INGENIERIA"];
const STATUSES: Status[] = ["ACTIVE", "INACTIVE", "SUSPENDED"];

const ROLE_LABELS: Record<Role, string> = {
  CUSTOMER: "Cliente",
  ADMIN: "Administrador",
  SELLER: "Vendedor",
  PACKING: "Empaque",
  SUPERADMIN: "Superadmin",
  RRHH: "Recursos Humanos",
  BODEGA: "Bodega",
  DISENO: "Diseño",
  MARKETING: "Marketing",
  JEFE_VENTAS: "Jefe de Ventas",
  TESORERIA: "Tesorería",
  INGENIERIA: "Ingeniería",
};

const STATUS_LABELS: Record<Status, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  SUSPENDED: "Suspendido",
};

const ROLE_BADGE: Record<Role, string> = {
  CUSTOMER: "bg-[#F1F5F9] text-[#64748B]",
  ADMIN: "bg-[#DBEAFE] text-[#1D4ED8]",
  SELLER: "bg-[#D9F2F3] text-[#0E7C82]",
  PACKING: "bg-[#FFEDD5] text-[#C2410C]",
  SUPERADMIN: "bg-[#EDE9FE] text-[#6D28D9]",
  RRHH: "bg-[#FCE7F3] text-[#BE185D]",
  BODEGA: "bg-[#FEF3C7] text-[#B45309]",
  DISENO: "bg-[#FCE7F3] text-[#BE185D]",
  MARKETING: "bg-[#DCFCE7] text-[#15803D]",
  JEFE_VENTAS: "bg-[#DBEAFE] text-[#1D4ED8]",
  TESORERIA: "bg-[#EDE9FE] text-[#6D28D9]",
  INGENIERIA: "bg-[#FEE2E2] text-[#DC2626]",
};

const STATUS_DOT: Record<Status, string> = {
  ACTIVE: "bg-[#16A34A]",
  INACTIVE: "bg-[#94A3B8]",
  SUSPENDED: "bg-[#DC2626]",
};

const STATUS_TEXT: Record<Status, string> = {
  ACTIVE: "text-[#16A34A]",
  INACTIVE: "text-[#64748B]",
  SUSPENDED: "text-[#DC2626]",
};

const MODULE_ICON: Record<string, { path: string; className: string }> = {
  MODULE_DASHBOARD: { path: "M4 19V10M11 19V5M18 19v-7", className: "bg-[#DBEAFE] text-[#1D4ED8]" },
  MODULE_PEDIDOS: { path: "M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10", className: "bg-[#DCFCE7] text-[#15803D]" },
  MODULE_PRODUCTOS: { path: "M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8", className: "bg-[#EDE9FE] text-[#6D28D9]" },
  MODULE_METRICAS: { path: "M3 17l6-6 4 4 8-8M21 7h-6v6", className: "bg-[#FFEDD5] text-[#C2410C]" },
  MODULE_CAMPANAS: { path: "M3 11v2a1 1 0 001 1h2l8 4V6l-8 4H4a1 1 0 00-1 1zM17 9a3 3 0 010 6", className: "bg-[#FCE7F3] text-[#BE185D]" },
  MODULE_COSTOS: { path: "M12 2v20M17 6.5c0-1.7-2.2-3-5-3s-5 1.3-5 3 2.2 3 5 3 5 1.3 5 3-2.2 3-5 3-5-1.3-5-3", className: "bg-[#FEF3C7] text-[#B45309]" },
  MODULE_CALCULADORA_PRECIO: { path: "M20.6 12L12 20.6a2 2 0 01-2.8 0L3.4 14.8a2 2 0 010-2.8L12 3.4a2 2 0 012.8 0l5.8 5.8a2 2 0 010 2.8zM8.5 8.5h.01", className: "bg-[#DBEAFE] text-[#1D4ED8]" },
  MODULE_COTIZACIONES: { path: "M6 2h9l5 5v15a1 1 0 01-1 1H6a1 1 0 01-1-1V3a1 1 0 011-1zM14 2v6h6M9 13h6M9 17h6", className: "bg-[#D9F2F3] text-[#0E7C82]" },
  MODULE_PRODUCCION: { path: "M3 17l6-6 4 4 8-8M14 7h7v7", className: "bg-[#DBEAFE] text-[#1D4ED8]" },
  MODULE_ODOO: { path: "M12 2a10 10 0 100 20 10 10 0 000-20z", className: "bg-[#FEE2E2] text-[#DC2626]" },
  MODULE_USUARIOS: { path: "M17 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75", className: "bg-[#F1F5F9] text-[#64748B]" },
  MODULE_BANNERS: { path: "M3 5h18v14H3zM3 15l5-5 4 4 5-5 4 4", className: "bg-[#EDE9FE] text-[#6D28D9]" },
  MODULE_COMBOS: { path: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z", className: "bg-[#FEE2E2] text-[#DC2626]" },
  MODULE_RRHH: { path: "M17 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75", className: "bg-[#DCFCE7] text-[#15803D]" },
  MODULE_OUTLET: { path: "M20.6 12L12 20.6a2 2 0 01-2.8 0L3.4 14.8a2 2 0 010-2.8L12 3.4a2 2 0 012.8 0l5.8 5.8a2 2 0 010 2.8zM8.5 8.5h.01", className: "bg-[#FFEDD5] text-[#C2410C]" },
};

function ModuleIcon({ module }: { module: string }) {
  const icon = MODULE_ICON[module] ?? { path: "M12 2a10 10 0 100 20 10 10 0 000-20z", className: "bg-[#F1F5F9] text-[#64748B]" };
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${icon.className}`}>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d={icon.path} />
      </svg>
    </span>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M4 12l5 5L20 6" />
    </svg>
  );
}
function IconDash() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 12h14" />
    </svg>
  );
}
function IconX() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
function IconEye() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

const AVATAR_COLORS = [
  "bg-[#D9F2F3] text-[#0E7C82]",
  "bg-[#DBEAFE] text-[#1D4ED8]",
  "bg-[#FFEDD5] text-[#C2410C]",
  "bg-[#EDE9FE] text-[#6D28D9]",
  "bg-[#FCE7F3] text-[#BE185D]",
  "bg-[#DCFCE7] text-[#15803D]",
];

function initials(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function IconPencil() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}
function IconMail() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}
function IconKey() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="8" cy="15" r="4" />
      <path d="M10.5 12.5L20 3M17 6l3 3M14 9l2.5 2.5" />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0l-1 14a1 1 0 01-1 1H7a1 1 0 01-1-1L5 6" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}
function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M4 21h16" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <circle cx="17" cy="8" r="2.6" />
      <path d="M15.5 14.3c2.9.5 5 2.6 5 5.7" />
    </svg>
  );
}
function IconUserCheck() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="10" cy="8" r="3.5" />
      <path d="M3 20c0-4 3.1-6.5 7-6.5s7 2.5 7 6.5" />
      <path d="M17 9l1.8 1.8L22 7.5" />
    </svg>
  );
}
function IconUserX() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="10" cy="8" r="3.5" />
      <path d="M3 20c0-4 3.1-6.5 7-6.5s7 2.5 7 6.5" />
      <path d="M16 7l5 5M21 7l-5 5" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3z" />
    </svg>
  );
}

function StatCard({ icon, iconClass, label, value, hint }: { icon: React.ReactNode; iconClass: string; label: string; value: number | string; hint: string }) {
  return (
    <div className="flex flex-1 items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>{icon}</div>
      <div>
        <p className="text-xs font-semibold text-[#64748B]">{label}</p>
        <p className="text-xl font-black text-[#1A1A1A]">{value}</p>
        <p className="text-[11px] text-[#94A3B8]">{hint}</p>
      </div>
    </div>
  );
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: "SELLER" as Role });
  const [showPassword, setShowPassword] = useState(false);
  const [permUserId, setPermUserId] = useState<string | null>(null);
  const [perms, setPerms] = useState<ModulePermission[]>([]);
  const [permSearch, setPermSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteImpact, setDeleteImpact] = useState<DeletionImpact | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<Status | "ALL">("ALL");
  const [emailTarget, setEmailTarget] = useState<UserRow | null>(null);
  const [emailValue, setEmailValue] = useState("");
  const [passwordTarget, setPasswordTarget] = useState<UserRow | null>(null);
  const [passwordValue, setPasswordValue] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

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

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const createUser = async () => {
    setError("");
    const res = await fetch("/api/panel/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const newUser = await res.json();
      setForm({ fullName: "", email: "", password: "", role: "SELLER" });
      setCreating(false);
      loadUsers();
      setPermUserId(newUser.id);
      const defaults: Partial<Record<string, Omit<ModulePermission, "module" | "isOverride">>> =
        form.role === "SUPERADMIN" ? {} : DEFAULT_PERMISSIONS[form.role as Exclude<Role, "SUPERADMIN">];
      setPerms(Object.keys(MODULE_LABELS).map((module) => ({
        module,
        isOverride: true,
        canView: defaults[module]?.canView ?? false,
        canCreate: defaults[module]?.canCreate ?? false,
        canEdit: defaults[module]?.canEdit ?? false,
        canDelete: defaults[module]?.canDelete ?? false,
      })));
      showToast("Usuario creado correctamente");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al crear usuario");
    }
  };

  const updateUser = async (id: string, patch: Partial<Pick<UserRow, "role" | "status" | "email">> & { newPassword?: string }, successMsg?: string) => {
    const res = await fetch(`/api/panel/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      loadUsers();
      showToast(successMsg ?? "Usuario actualizado correctamente");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al actualizar usuario");
    }
  };

  const editEmail = (u: UserRow) => {
    setEmailTarget(u);
    setEmailValue(u.email);
  };

  const confirmEditEmail = () => {
    if (!emailTarget) return;
    const value = emailValue.trim();
    if (value && value !== emailTarget.email) updateUser(emailTarget.id, { email: value }, "Correo actualizado correctamente");
    setEmailTarget(null);
  };

  const editPassword = (u: UserRow) => {
    setPasswordTarget(u);
    setPasswordValue("");
    setShowNewPassword(false);
  };

  const confirmEditPassword = () => {
    if (!passwordTarget) return;
    const value = passwordValue.trim();
    if (value) updateUser(passwordTarget.id, { newPassword: value }, "Contraseña actualizada correctamente");
    setPasswordTarget(null);
  };

  const confirmDeleteUser = async (force = false) => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/panel/users/${deleteTarget.id}${force ? "?force=true" : ""}`, { method: "DELETE" });
    if (res.ok) {
      setDeleteTarget(null);
      setDeleteImpact(null);
      loadUsers();
      showToast("Usuario eliminado correctamente");
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

  const applyQuickAction = (kind: "ALL" | "NONE" | "VIEW_ONLY" | "FULL") => {
    setPerms((prev) => prev.map((p) => {
      if (kind === "NONE") return { ...p, canView: false, canCreate: false, canEdit: false, canDelete: false };
      if (kind === "FULL") return { ...p, canView: true, canCreate: true, canEdit: true, canDelete: true };
      if (kind === "VIEW_ONLY") return { ...p, canView: true, canCreate: false, canEdit: false, canDelete: false };
      return { ...p, canView: true };
    }));
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
    if (res.ok) {
      setPermUserId(null);
      showToast("Permisos actualizados correctamente");
    }
  };

  const exportCsv = () => {
    const header = ["Nombre", "Correo", "Rol", "Estado", "Creado"];
    const rows = filteredUsers.map((u) => [u.fullName, u.email, ROLE_LABELS[u.role], STATUS_LABELS[u.status], formatDate(u.createdAt)]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "usuarios-kliniu.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((u) => {
      if (term && !`${u.fullName} ${u.email}`.toLowerCase().includes(term)) return false;
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
      if (statusFilter !== "ALL" && u.status !== statusFilter) return false;
      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === "ACTIVE").length;
    const inactive = total - active;
    const roles = new Set(users.map((u) => u.role)).size;
    return { total, active, inactive, roles };
  }, [users]);

  const filteredPerms = useMemo(() => {
    const term = permSearch.trim().toLowerCase();
    if (!term) return perms;
    return perms.filter((p) => (MODULE_LABELS[p.module] ?? p.module).toLowerCase().includes(term));
  }, [perms, permSearch]);

  const permsSummary = useMemo(() => {
    let allowed = 0;
    let denied = 0;
    for (const p of perms) {
      for (const field of ["canView", "canCreate", "canEdit", "canDelete"] as const) {
        if (p[field]) allowed++; else denied++;
      }
    }
    return { allowed, denied };
  }, [perms]);

  if (loading) return <div className="p-6">Cargando…</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#D9F2F3] text-[#0E7C82]">
            <IconUsers />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#1A1A1A]">Usuarios</h1>
            <p className="text-sm text-[#64748B]">Gestiona las cuentas de usuarios y sus accesos al sistema.</p>
          </div>
        </div>
        <button
          onClick={() => setCreating((c) => !c)}
          className="shrink-0 rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white"
        >
          {creating ? "Cancelar" : "+ Nuevo usuario"}
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-[#16A34A] px-4 py-3 text-sm font-bold text-white shadow-lg">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          {toast}
        </div>
      )}

      <div className="flex flex-col gap-3 md:flex-row">
        <StatCard icon={<IconUsers />} iconClass="bg-[#D9F2F3] text-[#0E7C82]" label="Total usuarios" value={stats.total} hint="Cuentas registradas" />
        <StatCard icon={<IconUserCheck />} iconClass="bg-[#DBEAFE] text-[#1D4ED8]" label="Usuarios activos" value={stats.active} hint={`${stats.total ? Math.round((stats.active / stats.total) * 100) : 0}% del total`} />
        <StatCard icon={<IconUserX />} iconClass="bg-[#FFEDD5] text-[#C2410C]" label="Inactivos" value={stats.inactive} hint={`${stats.total ? Math.round((stats.inactive / stats.total) * 100) : 0}% del total`} />
        <StatCard icon={<IconShield />} iconClass="bg-[#EDE9FE] text-[#6D28D9]" label="Roles asignados" value={stats.roles} hint="Configurados" />
      </div>

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
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          <button onClick={createUser} className="col-span-full rounded-lg bg-[#27B1B8] px-3 py-2 text-sm font-bold text-white">
            Crear
          </button>
        </div>
      )}

      <div className="rounded-xl border border-[#E2E8F0] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#E2E8F0] p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1 md:max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"><IconSearch /></span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o correo..."
                className="w-full rounded-lg border border-[#E2E8F0] py-2 pl-9 pr-3 text-sm"
              />
            </div>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as Role | "ALL")}
              className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#64748B]">
              <option value="ALL">Rol: Todos</option>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as Status | "ALL")}
              className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#64748B]">
              <option value="ALL">Estado: Todos</option>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          <button onClick={exportCsv}
            className="flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm font-bold text-[#64748B] hover:text-[#27B1B8]">
            <IconDownload /> Exportar
          </button>
        </div>

        <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] text-left text-xs font-bold text-[#64748B]">
              <th className="p-3">Usuario</th>
              <th className="p-3">Correo electrónico</th>
              <th className="p-3">Rol</th>
              <th className="p-3">Estado</th>
              <th className="sticky right-0 border-l border-[#E2E8F0] bg-[#F8FAFC] p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u, idx) => (
              <tr key={u.id} className="border-b border-[#F1F5F9]">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                      {initials(u.fullName)}
                    </div>
                    <div>
                      <p className="font-bold text-[#1A1A1A]">{u.fullName}</p>
                      <p className="text-xs text-[#94A3B8]">Creado {formatDate(u.createdAt)}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3 text-[#64748B]">{u.email}</td>
                <td className="p-3">
                  <select value={u.role} onChange={(e) => updateUser(u.id, { role: e.target.value as Role }, "Rol actualizado correctamente")}
                    className={`rounded-full border-0 px-3 py-1 text-xs font-bold ${ROLE_BADGE[u.role]}`}>
                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <select value={u.status} onChange={(e) => updateUser(u.id, { status: e.target.value as Status }, "Estado actualizado correctamente")}
                      className={`rounded-full border-0 bg-transparent px-1 py-1 text-xs font-bold ${STATUS_TEXT[u.status]}`}>
                      {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </select>
                    <span className={`h-2 w-2 rounded-full ${STATUS_DOT[u.status]}`} />
                  </div>
                </td>
                <td className="sticky right-0 border-l border-[#E2E8F0] bg-white p-3">
                  <div className="flex items-center gap-2 text-[#64748B]">
                    <button onClick={() => openPermissions(u.id)} title="Editar permisos" aria-label="Editar permisos" className="rounded-lg p-1.5 hover:bg-[#F1F5F9] hover:text-[#27B1B8]">
                      <IconPencil />
                    </button>
                    <button onClick={() => editEmail(u)} title="Editar correo" aria-label="Editar correo" className="rounded-lg p-1.5 hover:bg-[#F1F5F9] hover:text-[#27B1B8]">
                      <IconMail />
                    </button>
                    <button onClick={() => editPassword(u)} title="Cambiar contraseña" aria-label="Cambiar contraseña" className="rounded-lg p-1.5 hover:bg-[#F1F5F9] hover:text-[#27B1B8]">
                      <IconKey />
                    </button>
                    <button onClick={() => { setDeleteTarget(u); setDeleteImpact(null); }} title="Eliminar" aria-label="Eliminar" className="rounded-lg p-1.5 text-red-500 hover:bg-red-50">
                      <IconTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-sm text-[#94A3B8]">No se encontraron usuarios con esos filtros.</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {permUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white">
            <div className="flex items-start justify-between gap-4 border-b border-[#E2E8F0] p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#D9F2F3] text-[#0E7C82]">
                  <IconShield />
                </span>
                <div>
                  <h2 className="text-base font-black text-[#1A1A1A]">Permisos por módulo</h2>
                  <p className="text-sm text-[#64748B]">Define qué acciones puede realizar este usuario en cada módulo del sistema.</p>
                </div>
              </div>
              <button onClick={() => setPermUserId(null)} aria-label="Cerrar"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9]">
                <IconX />
              </button>
            </div>

            <div className="flex flex-col gap-3 border-b border-[#E2E8F0] p-4 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"><IconSearch /></span>
                <input value={permSearch} onChange={(e) => setPermSearch(e.target.value)} placeholder="Buscar módulo..."
                  className="w-full rounded-lg border border-[#E2E8F0] py-2 pl-9 pr-3 text-sm" />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-[#64748B]">Acciones rápidas:</span>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => applyQuickAction("ALL")} className="rounded-lg border border-[#27B1B8] px-3 py-1.5 text-xs font-bold text-[#0E7C82]">Ver todo</button>
                  <button onClick={() => applyQuickAction("NONE")} className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-bold text-[#64748B] hover:border-[#27B1B8]">Nada</button>
                  <button onClick={() => applyQuickAction("VIEW_ONLY")} className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-bold text-[#64748B] hover:border-[#27B1B8]">Solo ver</button>
                  <button onClick={() => applyQuickAction("FULL")} className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-bold text-[#64748B] hover:border-[#27B1B8]">Todas</button>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#64748B]">
                  <span className="font-semibold">Leyenda:</span>
                  <span className="flex items-center gap-1"><span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#DCFCE7] text-[#15803D]"><IconCheck /></span>Permitido</span>
                  <span className="flex items-center gap-1"><span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#F1F5F9] text-[#94A3B8]"><IconDash /></span>No permitido</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="text-left text-xs font-bold uppercase text-[#94A3B8]">
                    <th className="p-2">Módulo</th>
                    <th className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1"><IconEye /> Ver</div>
                      <p className="mt-0.5 text-[10px] font-normal normal-case text-[#94A3B8]">Solo lectura</p>
                    </th>
                    <th className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1"><IconPlus /> Crear</div>
                      <p className="mt-0.5 text-[10px] font-normal normal-case text-[#94A3B8]">Agregar</p>
                    </th>
                    <th className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1"><IconPencil /> Editar</div>
                      <p className="mt-0.5 text-[10px] font-normal normal-case text-[#94A3B8]">Modificar</p>
                    </th>
                    <th className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1"><IconTrash /> Eliminar</div>
                      <p className="mt-0.5 text-[10px] font-normal normal-case text-[#94A3B8]">Borrar</p>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPerms.map((p) => (
                    <tr key={p.module} className="border-t border-[#F1F5F9]">
                      <td className="p-2">
                        <div className="flex items-center gap-2 font-bold text-[#1A1A1A]">
                          <ModuleIcon module={p.module} />
                          {MODULE_LABELS[p.module] ?? p.module}
                        </div>
                      </td>
                      {(["canView", "canCreate", "canEdit", "canDelete"] as const).map((field) => (
                        <td key={field} className="p-2 text-center">
                          <button
                            onClick={() => togglePerm(p.module, field)}
                            aria-pressed={p[field]}
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
                              p[field]
                                ? "border-[#BBF7D0] bg-[#DCFCE7] text-[#15803D]"
                                : "border-[#E2E8F0] bg-[#F8FAFC] text-[#94A3B8]"
                            }`}
                          >
                            {p[field] ? <IconCheck /> : <IconDash />}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                  {filteredPerms.length === 0 && (
                    <tr><td colSpan={5} className="p-6 text-center text-sm text-[#94A3B8]">Sin módulos que coincidan.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-[#E2E8F0] p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 rounded-lg bg-[#F8FAFC] px-3 py-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#D9F2F3] text-[#0E7C82]"><IconShield /></span>
                <div className="text-xs">
                  <p className="font-bold text-[#1A1A1A]">Resumen de permisos</p>
                  <p className="text-[#64748B]">
                    <span className="font-bold text-[#15803D]">{permsSummary.allowed} permitidos</span>
                    {" · "}
                    <span className="font-bold text-[#94A3B8]">{permsSummary.denied} no permitidos</span>
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setPermUserId(null)} className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm font-bold text-[#64748B]">
                  Cancelar
                </button>
                <button onClick={savePermissions} className="flex items-center gap-2 rounded-lg bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white">
                  <IconCheck /> Guardar cambios
                </button>
              </div>
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

      {emailTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D9F2F3] text-[#0E7C82]">
                <IconMail />
              </span>
              <div>
                <h2 className="text-sm font-black text-[#1A1A1A]">Editar correo</h2>
                <p className="text-xs text-[#94A3B8]">{emailTarget.fullName}</p>
              </div>
            </div>
            <label className="mb-1 block text-xs font-semibold text-[#64748B]">Nuevo correo</label>
            <input
              autoFocus
              type="email"
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmEditEmail()}
              className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:border-[#27B1B8] focus:outline-none"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEmailTarget(null)} className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs font-bold text-[#64748B]">
                Cancelar
              </button>
              <button onClick={confirmEditEmail} className="rounded-lg bg-[#27B1B8] px-3 py-2 text-xs font-bold text-white">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {passwordTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D9F2F3] text-[#0E7C82]">
                <IconKey />
              </span>
              <div>
                <h2 className="text-sm font-black text-[#1A1A1A]">Cambiar contraseña</h2>
                <p className="text-xs text-[#94A3B8]">{passwordTarget.email}</p>
              </div>
            </div>
            <label className="mb-1 block text-xs font-semibold text-[#64748B]">Nueva contraseña</label>
            <div className="relative">
              <input
                autoFocus
                type={showNewPassword ? "text" : "password"}
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && confirmEditPassword()}
                className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 pr-9 text-sm focus:border-[#27B1B8] focus:outline-none"
              />
              <button type="button" onClick={() => setShowNewPassword((v) => !v)}
                aria-label={showNewPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#27B1B8]">
                {showNewPassword ? (
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
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setPasswordTarget(null)} className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs font-bold text-[#64748B]">
                Cancelar
              </button>
              <button onClick={confirmEditPassword} disabled={!passwordValue.trim()} className="rounded-lg bg-[#27B1B8] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
