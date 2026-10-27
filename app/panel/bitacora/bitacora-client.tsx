"use client";

import { useCallback, useEffect, useState } from "react";
import { MdHistory, MdDownload } from "react-icons/md";
import { SimpleSelect } from "@/app/panel/_components/simple-select";
import { Table, Badge, btnGhost, inputCls, labelCls, fmtDateTime } from "@/app/panel/_components/ops-ui";

type Row = {
  id: string;
  actorEmail: string;
  action: string;
  entity: string;
  entityId: string | null;
  meta: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
};

const GROUPS = [
  { value: "", label: "Todo" },
  { value: "product", label: "Productos" },
  { value: "auth", label: "Seguridad y sesiones" },
  { value: "user", label: "Usuarios y permisos" },
  { value: "appconfig", label: "Configuración" },
  { value: "admin", label: "Accesos de admin" },
];

const ACTION_LABELS: Record<string, string> = {
  "product.create": "Producto creado",
  "product.update": "Producto editado",
  "product.delete": "Producto eliminado",
  "product.panel_update": "Precio/estado de producto",
  "product.outlet_add": "Agregado a Outlet",
  "product.outlet_remove": "Quitado de Outlet",
  "product.outlet_extend": "Outlet extendido",
  "auth.login_failed": "Login fallido",
  "auth.login_failed_burst": "Varios logins fallidos",
  "auth.login_new_ip": "Login desde IP nueva",
  "auth.password_reset_email": "Clave restablecida por correo",
  "auth.password_changed": "Clave cambiada (Mi cuenta)",
  "auth.email_changed": "Correo cambiado (Mi cuenta)",
  "user.password_reset": "Clave cambiada desde el panel",
  "user.update": "Usuario editado",
  "user.delete": "Usuario eliminado",
  "user.permissions_update": "Permisos modificados",
  "admin.login": "Login de admin",
  "admin.login_pin_failed": "PIN de admin incorrecto",
  "appconfig.sale_mode": "Modo de venta",
  "appconfig.whatsapp_por_pais": "WhatsApp por país",
  "appconfig.production_materials": "Material de Inyección agregado",
  "appconfig.wati_remarketing": "Remarketing WhatsApp",
};

const DANGER = new Set(["auth.login_failed_burst", "auth.login_new_ip", "user.password_reset", "product.delete", "user.delete", "admin.login_pin_failed"]);

const short = (v: unknown) => {
  const t = typeof v === "string" ? v : JSON.stringify(v);
  return t.length > 60 ? `${t.slice(0, 57)}…` : t;
};

// Resume `meta` en una línea legible: "precio: 1000 → 2000".
function detail(r: Row): string {
  const m = r.meta;
  if (!m) return "";
  const parts: string[] = [];
  if (typeof m.name === "string") parts.push(m.name);
  if (typeof m.target === "string") parts.push(m.target);
  const changes = m.changes as Record<string, { from: unknown; to: unknown }> | undefined;
  if (changes) {
    for (const [k, v] of Object.entries(changes)) {
      parts.push(r.action === "user.permissions_update" ? `${k.replace("MODULE_", "")} modificado` : `${k}: ${short(v.from)} → ${short(v.to)}`);
    }
  }
  if (Array.isArray(m.alsoChanged) && m.alsoChanged.length) parts.push(`también: ${m.alsoChanged.join(", ")}`);
  if (m.roleFrom) parts.push(`rol: ${m.roleFrom} → ${m.role}`);
  if (m.statusFrom) parts.push(`estado: ${m.statusFrom} → ${m.status}`);
  if ("from" in m && "mode" in m) parts.push(`${short(m.from)} → ${short(m.mode)}`);
  if (m.newPrice) parts.push(`nuevo precio: ${m.newPrice}`);
  if (typeof m.active === "boolean") parts.push(m.active ? "activado" : "desactivado");
  if (Array.isArray(m.changedKeys)) parts.push(`cambió: ${m.changedKeys.join(", ") || "nada"}`);
  if (m.added) parts.push(`${m.added}`);
  if (m.reason) parts.push(`${m.reason}`);
  return parts.join(" · ");
}

export default function BitacoraClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(
    async (append: boolean, last?: string) => {
      setLoading(true);
      const sp = new URLSearchParams();
      if (q.trim()) sp.set("q", q.trim());
      if (group) sp.set("group", group);
      if (from) sp.set("from", from);
      if (to) sp.set("to", to);
      if (append && last) sp.set("before", last);
      try {
        const res = await fetch(`/api/panel/bitacora?${sp}`);
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { rows: Row[]; hasMore: boolean };
        setRows((cur) => (append ? [...cur, ...data.rows] : data.rows));
        setHasMore(data.hasMore);
      } catch {
        if (!append) setRows([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [q, group, from, to],
  );

  useEffect(() => {
    const t = window.setTimeout(() => load(false), 250);
    return () => window.clearTimeout(t);
  }, [load]);

  const exportCsv = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [["Fecha", "Quién", "Rol", "Acción", "Detalle", "IP"].join(",")].concat(
      rows.map((r) =>
        [r.createdAt, r.actorEmail, String(r.meta?.actorRole ?? ""), ACTION_LABELS[r.action] ?? r.action, detail(r), r.ip ?? ""].map((c) => esc(c)).join(","),
      ),
    );
    const url = URL.createObjectURL(new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "bitacora-kliniu.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-w-0 space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MdHistory size={22} className="text-[#0C535B]" />
          <h1 className="text-xl font-black text-[#1A1A1A]">Bitácora</h1>
        </div>
        <button onClick={exportCsv} disabled={!rows.length} className={btnGhost}>
          <MdDownload size={16} /> Exportar CSV
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={labelCls}>Persona (correo)</label>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="correo@kliniu.com" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Tipo</label>
          <SimpleSelect value={group} options={GROUPS} onChange={setGroup} portal />
        </div>
        <div>
          <label className={labelCls}>Desde</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Hasta</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
        </div>
      </div>

      <Table
        head={["Fecha", "Quién", "Rol", "Acción", "Detalle", "IP"]}
        empty={loading ? "Cargando…" : "Sin registros para este filtro."}
        rows={rows.map((r) => [
          <span key="d" className="whitespace-nowrap text-xs">{fmtDateTime(r.createdAt)}</span>,
          <span key="w" className="break-all">{r.actorEmail}</span>,
          <span key="r" className="text-xs text-[#64748B]">{String(r.meta?.actorRole ?? "—")}</span>,
          <Badge
            key="a"
            label={ACTION_LABELS[r.action] ?? r.action}
            cls={DANGER.has(r.action) ? "bg-[#FEF2F2] text-[#B91C1C]" : "bg-[#E6F6F7] text-[#0C535B]"}
          />,
          <span key="x" className="text-xs text-[#475569]">{detail(r) || "—"}</span>,
          <span key="i" className="whitespace-nowrap text-xs text-[#64748B]">{r.ip ?? "—"}</span>,
        ])}
      />

      {hasMore && (
        <div className="text-center">
          <button disabled={loading} onClick={() => load(true, rows[rows.length - 1]?.createdAt)} className={btnGhost}>
            Ver más
          </button>
        </div>
      )}
    </div>
  );
}
