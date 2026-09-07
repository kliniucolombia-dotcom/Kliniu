"use client";
import { useState, useEffect, useCallback } from "react";
import { calcROAS, getCampaignStatus, STATUS_META } from "@/lib/panel-utils";
import { SimpleSelect } from "../_components/simple-select";
import DailyMatrix from "./DailyMatrix";

type Campaign = {
  id: string; name: string; platform: string; investment: number; sales: number;
  leads: number; targetMultiple: number; status: string; startDate: string;
  endDate?: string; notes?: string;
  seller: { id: string; fullName: string; email: string };
  combo?: { id: string; name: string; image: string | null };
};

// Un endpoint caído no debe congelar la página entera: devuelve [] en vez de reventar.
async function fetchList(url: string): Promise<unknown[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

const DATE_FILTERS = [
  { value: "all", label: "Todo" },
  { value: "today", label: "Hoy" },
  { value: "week", label: "Últimos 7 días" },
  { value: "days15", label: "Últimos 15 días" },
  { value: "month", label: "Últimos 30 días" },
  { value: "quarter", label: "Últimos 90 días" },
  { value: "thisMonth", label: "Este mes" },
  { value: "lastMonth", label: "Mes pasado" },
  { value: "thisYear", label: "Este año" },
  { value: "custom", label: "Rango personalizado" },
];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return startOfDay(d); };

/** Devuelve [desde, hasta] según el filtro; null significa sin límite por ese lado. */
function dateFilterRange(filter: string, customFrom: string, customTo: string): [Date | null, Date | null] {
  const now = new Date();
  switch (filter) {
    case "today": return [startOfDay(now), endOfDay(now)];
    case "week": return [daysAgo(7), null];
    case "days15": return [daysAgo(15), null];
    case "month": return [daysAgo(30), null];
    case "quarter": return [daysAgo(90), null];
    case "thisMonth": return [new Date(now.getFullYear(), now.getMonth(), 1), null];
    case "lastMonth": return [
      new Date(now.getFullYear(), now.getMonth() - 1, 1),
      endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
    ];
    case "thisYear": return [new Date(now.getFullYear(), 0, 1), null];
    case "custom": return [
      customFrom ? startOfDay(new Date(`${customFrom}T00:00:00`)) : null,
      customTo ? endOfDay(new Date(`${customTo}T00:00:00`)) : null,
    ];
    default: return [null, null];
  }
}

const fmtUSD = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtCOP = (n: number) => `$${Math.round(n).toLocaleString("es-CO")} COP`;

const TH = ({ children }: { children?: React.ReactNode }) => (
  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">
    {children}
  </th>
);

export default function CampanasPanel() {
  const [campaigns, setCampaigns]   = useState<Campaign[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState<Campaign | null>(null);
  const [sellers, setSellers]       = useState<{ id: string; fullName: string }[]>([]);
  const [combos, setCombos]         = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving]         = useState(false);
  const [alert, setAlert]           = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [dailyCampaign, setDailyCampaign] = useState<Campaign | null>(null);
  const [trm, setTrm] = useState(4000);
  const [dateFilter, setDateFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [form, setForm] = useState({
    name: "", sellerId: "", comboId: "", investment: "", sales: "", leads: "",
    targetMultiple: "10", platform: "Meta Ads", notes: "", status: "ACTIVE",
    startDate: "", endDate: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [dc, ds, dco] = await Promise.all([
      fetchList("/api/panel/campaigns"),
      fetchList("/api/panel/sellers"),
      fetchList("/api/panel/combos"),
    ]);
    setCampaigns(dc as Campaign[]);
    setSellers(ds as { id: string; fullName: string }[]);
    setCombos((dco as { id: string; name: string }[]).map((c) => ({ id: c.id, name: c.name })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetch("/api/trm").then((r) => r.json()).then((d) => d.rate && setTrm(d.rate)).catch(() => {}); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", sellerId: sellers[0]?.id ?? "", comboId: "", investment: "", sales: "", leads: "", targetMultiple: "10", platform: "Meta Ads", notes: "", status: "ACTIVE", startDate: "", endDate: "" });
    setAlert(null);
    setShowForm(true);
  };

  const openEdit = (c: Campaign) => {
    setEditing(c);
    setForm({
      name: c.name, sellerId: c.seller.id, comboId: c.combo?.id ?? "", investment: String(c.investment), sales: String(c.sales), leads: String(c.leads ?? 0), targetMultiple: String(c.targetMultiple), platform: c.platform, notes: c.notes ?? "", status: c.status,
      startDate: c.startDate ? c.startDate.slice(0, 10) : "",
      endDate: c.endDate ? c.endDate.slice(0, 10) : "",
    });
    setAlert(null);
    setShowForm(true);
  };

  const filteredCampaigns = campaigns.filter((c) => {
    const [from, to] = dateFilterRange(dateFilter, customFrom, customTo);
    if (!from && !to) return true;
    const start = new Date(c.startDate);
    if (from && start < from) return false;
    if (to && start > to) return false;
    return true;
  });

  const save = async () => {
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      setAlert({ type: "err", msg: "La fecha final no puede ser anterior a la inicial" });
      return;
    }
    setSaving(true);
    const body = { ...form, investment: parseFloat(form.investment) || 0, sales: parseFloat(form.sales) || 0, leads: parseInt(form.leads) || 0, targetMultiple: parseFloat(form.targetMultiple) || 10 };
    const url = editing ? `/api/panel/campaigns/${editing.id}` : "/api/panel/campaigns";
    const method = editing ? "PATCH" : "POST";
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaving(false);
    if (r.ok) { setAlert({ type: "ok", msg: editing ? "Campaña actualizada" : "Campaña creada" }); load(); setTimeout(() => setShowForm(false), 1000); }
    else { const d = await r.json(); setAlert({ type: "err", msg: d.error ?? "Error" }); }
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Panel Comercial</p>
          <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Campañas</h1>
        </div>
        <button onClick={openNew} className="rounded-xl bg-[#27B1B8] px-4 py-2.5 text-sm font-bold text-white hover:opacity-80">
          + Nueva campaña
        </button>
      </div>

      {/* Regla ×10 */}
      <div className="mb-6 rounded-2xl border border-[#27B1B8]/30 bg-[#F0F9F8] p-4">
        <p className="text-xs font-bold text-[#0C6060]">Regla comercial Kliniu</p>
        <p className="mt-0.5 text-sm font-black text-[#1A1A1A]">Meta mínima: inversión × {10} = ventas esperadas</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-[#64748B]">Periodo:</span>
        <div className="w-48">
          <SimpleSelect value={dateFilter} options={DATE_FILTERS} onChange={setDateFilter} />
        </div>

        {dateFilter === "custom" && (
          <>
            <label className="flex items-center gap-1.5 text-xs font-bold text-[#64748B]">
              Desde
              <input
                type="date"
                value={customFrom}
                max={customTo || undefined}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm font-normal text-[#1A1A1A] outline-none focus:border-[#27B1B8]"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs font-bold text-[#64748B]">
              Hasta
              <input
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm font-normal text-[#1A1A1A] outline-none focus:border-[#27B1B8]"
              />
            </label>
          </>
        )}

        {dateFilter !== "all" && (
          <button
            type="button"
            onClick={() => { setDateFilter("all"); setCustomFrom(""); setCustomTo(""); }}
            className="rounded-full border border-[#E2E8F0] px-3 py-1.5 text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC]"
          >
            ↻ Limpiar
          </button>
        )}

        <span className="ml-auto text-xs text-[#94A3B8]">
          {filteredCampaigns.length} de {campaigns.length} campañas
        </span>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-[#94A3B8]">Cargando campañas…</div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#E2E8F0] bg-white">
          <p className="text-3xl">📢</p>
          {campaigns.length > 0 ? (
            <>
              <p className="text-sm font-semibold text-[#94A3B8]">Ninguna campaña en el periodo seleccionado</p>
              <button
                onClick={() => { setDateFilter("all"); setCustomFrom(""); setCustomTo(""); }}
                className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-xs font-bold text-[#64748B]"
              >
                Ver todas
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-[#94A3B8]">No hay campañas todavía</p>
              <button onClick={openNew} className="rounded-xl bg-[#27B1B8] px-4 py-2 text-xs font-bold text-white">Crear primera campaña</button>
            </>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white">
          <table className="w-full min-w-[720px]">
            <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <tr>
                <TH>Campaña</TH>
                <TH>Invertido</TH>
                <TH>Vendido</TH>
                <TH>ROAS</TH>
                <TH>Leads</TH>
                <TH>CPL</TH>
                <TH>Estado</TH>
                <th className="sticky right-0 border-l border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filteredCampaigns.map((c) => {
                const roas   = calcROAS(c.sales, c.investment);
                const status = getCampaignStatus(roas);
                const meta   = STATUS_META[status];
                const cpl    = c.leads > 0 ? Math.round(c.investment / c.leads) : null;
                return (
                  <tr key={c.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-4 py-4">
                      <p className="font-bold text-[#1A1A1A]">{c.name}</p>
                      <p className="text-xs text-[#94A3B8]">{c.seller.fullName} · {c.platform}</p>
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-[#1A1A1A]">{fmtUSD(c.investment)}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-[#1A1A1A]">{fmtUSD(c.sales)}</td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-black" style={{ color: meta.color }}>{roas.toFixed(2)}x</span>
                    </td>
                    <td className="px-4 py-4 text-sm text-[#1A1A1A]">{c.leads ?? 0}</td>
                    <td className="px-4 py-4 text-sm text-[#1A1A1A]">{cpl !== null ? fmtUSD(cpl) : "—"}</td>
                    <td className="px-4 py-4">
                      <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: meta.bg, color: meta.color }}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="sticky right-0 border-l border-[#E2E8F0] bg-white px-4 py-4">
                      <div className="flex flex-col gap-1.5">
                        <button onClick={() => openEdit(c)} className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:border-[#27B1B8] hover:text-[#27B1B8] transition-colors">
                          Editar
                        </button>
                        <button onClick={() => setDailyCampaign(c)} className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:border-[#27B1B8] hover:text-[#27B1B8] transition-colors">
                          Matriz diaria
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="flex w-full max-w-lg max-h-[85dvh] flex-col rounded-2xl bg-white shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] p-6 pb-4">
              <h3 className="font-black text-[#1A1A1A]">{editing ? "Editar campaña" : "Nueva campaña"}</h3>
              <button onClick={() => setShowForm(false)} className="text-[#94A3B8] hover:text-[#1A1A1A]">✕</button>
            </div>

            <div className="overflow-y-auto p-6 pt-4">

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Nombre</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]" placeholder="Campaña Q2 jabón líquido" />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Vendedor</label>
                <SimpleSelect
                  value={form.sellerId}
                  options={[{ value: "", label: "Sin asignar" }, ...sellers.map((s) => ({ value: s.id, label: s.fullName }))]}
                  onChange={(v) => setForm({ ...form, sellerId: v })}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Combo (opcional)</label>
                <SimpleSelect
                  value={form.comboId}
                  options={[{ value: "", label: "Sin combo" }, ...combos.map((c) => ({ value: c.id, label: c.name }))]}
                  onChange={(v) => setForm({ ...form, comboId: v })}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Inversión (USD)</label>
                <input type="number" value={form.investment} onChange={(e) => setForm({ ...form, investment: e.target.value })} className="no-spinner w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]" placeholder="0" />
                {form.investment && (
                  <p className="mt-1 text-xs text-[#94A3B8]">≈ {fmtCOP(parseFloat(form.investment) * trm)} (TRM ${Math.round(trm).toLocaleString("es-CO")})</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Ventas generadas (USD)</label>
                <input type="number" value={form.sales} onChange={(e) => setForm({ ...form, sales: e.target.value })} className="no-spinner w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]" placeholder="0" />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Leads</label>
                <input type="number" value={form.leads} onChange={(e) => setForm({ ...form, leads: e.target.value })} className="no-spinner w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]" placeholder="0" />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Meta (×)</label>
                <input type="number" value={form.targetMultiple} onChange={(e) => setForm({ ...form, targetMultiple: e.target.value })} className="no-spinner w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]" />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Plataforma</label>
                <SimpleSelect
                  value={form.platform}
                  options={["Meta Ads","Google Ads","TikTok Ads","LinkedIn Ads","Otro"].map((p) => ({ value: p, label: p }))}
                  onChange={(v) => setForm({ ...form, platform: v })}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Fecha inicio</label>
                <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]" />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Fecha fin (opcional)</label>
                <input type="date" value={form.endDate} min={form.startDate || undefined} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]" />
              </div>

              {/* Preview ROAS en tiempo real */}
              {form.investment && form.sales && (
                <div className="sm:col-span-2 rounded-xl bg-[#F0F9F8] p-3">
                  {(() => {
                    const r = calcROAS(parseFloat(form.sales), parseFloat(form.investment));
                    const s = getCampaignStatus(r);
                    const m = STATUS_META[s];
                    const leadsN = parseInt(form.leads) || 0;
                    const cplN = leadsN > 0 ? Math.round(parseFloat(form.investment) / leadsN) : null;
                    return (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-[#0C6060]">ROAS calculado</p>
                          {cplN !== null && <p className="text-xs text-[#64748B]">CPL: {fmtUSD(cplN)}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-black" style={{ color: m.color }}>×{r.toFixed(1)}</span>
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: m.bg, color: m.color }}>{m.label}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Notas</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8] resize-none" />
              </div>
            </div>

            {alert && (
              <div className={`mt-3 rounded-xl px-3 py-2 text-xs font-semibold ${alert.type === "ok" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEE2E2] text-[#DC2626]"}`}>
                {alert.msg}
              </div>
            )}
            </div>

            <div className="flex gap-2 border-t border-[#E2E8F0] p-6 pt-4">
              <button onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-bold text-[#64748B]">Cancelar</button>
              <button onClick={save} disabled={saving} className="flex-1 rounded-xl bg-[#27B1B8] py-2.5 text-sm font-bold text-white disabled:opacity-50">
                {saving ? "Guardando…" : editing ? "Actualizar" : "Crear campaña"}
              </button>
            </div>
          </div>
        </div>
      )}

      {dailyCampaign && (
        <DailyMatrix
          campaignId={dailyCampaign.id}
          campaignName={dailyCampaign.name}
          onClose={() => setDailyCampaign(null)}
        />
      )}
    </div>
  );
}
