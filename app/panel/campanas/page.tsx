"use client";
import { useState, useEffect, useCallback } from "react";
import { calcROAS, getCampaignStatus, STATUS_META } from "@/lib/panel-utils";

type Campaign = {
  id: string; name: string; platform: string; investment: number; sales: number;
  leads: number; targetMultiple: number; status: string; startDate: string;
  endDate?: string; notes?: string;
  seller: { id: string; fullName: string; email: string };
  product?: { id: string; name: string; image: string };
};

const fmtUSD = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

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
  const [products, setProducts]     = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving]         = useState(false);
  const [alert, setAlert]           = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const [form, setForm] = useState({
    name: "", sellerId: "", productId: "", investment: "", sales: "", leads: "",
    targetMultiple: "10", platform: "Meta Ads", notes: "", status: "ACTIVE",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [rc, rs, rp] = await Promise.all([
      fetch("/api/panel/campaigns"),
      fetch("/api/panel/sellers"),
      fetch("/api/panel/products?minimal=1"),
    ]);
    setCampaigns(await rc.json());
    setSellers(await rs.json());
    setProducts(await rp.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", sellerId: sellers[0]?.id ?? "", productId: "", investment: "", sales: "", leads: "", targetMultiple: "10", platform: "Meta Ads", notes: "", status: "ACTIVE" });
    setAlert(null);
    setShowForm(true);
  };

  const openEdit = (c: Campaign) => {
    setEditing(c);
    setForm({ name: c.name, sellerId: c.seller.id, productId: c.product?.id ?? "", investment: String(c.investment), sales: String(c.sales), leads: String(c.leads ?? 0), targetMultiple: String(c.targetMultiple), platform: c.platform, notes: c.notes ?? "", status: c.status });
    setAlert(null);
    setShowForm(true);
  };

  const save = async () => {
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

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-[#94A3B8]">Cargando campañas…</div>
      ) : campaigns.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#E2E8F0] bg-white">
          <p className="text-3xl">📢</p>
          <p className="text-sm font-semibold text-[#94A3B8]">No hay campañas todavía</p>
          <button onClick={openNew} className="rounded-xl bg-[#27B1B8] px-4 py-2 text-xs font-bold text-white">Crear primera campaña</button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
          <table className="w-full">
            <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <tr>
                <TH>Campaña</TH>
                <TH>Invertido</TH>
                <TH>Vendido</TH>
                <TH>ROAS</TH>
                <TH>Leads</TH>
                <TH>CPL</TH>
                <TH>Estado</TH>
                <TH></TH>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {campaigns.map((c) => {
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
                    <td className="px-4 py-4">
                      <button onClick={() => openEdit(c)} className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:border-[#27B1B8] hover:text-[#27B1B8] transition-colors">
                        Editar
                      </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-black text-[#1A1A1A]">{editing ? "Editar campaña" : "Nueva campaña"}</h3>
              <button onClick={() => setShowForm(false)} className="text-[#94A3B8] hover:text-[#1A1A1A]">✕</button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Nombre</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]" placeholder="Campaña Q2 jabón líquido" />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Vendedor</label>
                <select value={form.sellerId} onChange={(e) => setForm({ ...form, sellerId: e.target.value })} className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]">
                  <option value="">Sin asignar</option>
                  {sellers.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Producto (opcional)</label>
                <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]">
                  <option value="">Sin producto</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Inversión (USD)</label>
                <input type="number" value={form.investment} onChange={(e) => setForm({ ...form, investment: e.target.value })} className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]" placeholder="0" />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Ventas generadas (USD)</label>
                <input type="number" value={form.sales} onChange={(e) => setForm({ ...form, sales: e.target.value })} className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]" placeholder="0" />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Leads</label>
                <input type="number" value={form.leads} onChange={(e) => setForm({ ...form, leads: e.target.value })} className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]" placeholder="0" />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Meta (×)</label>
                <input type="number" value={form.targetMultiple} onChange={(e) => setForm({ ...form, targetMultiple: e.target.value })} className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]" />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Plataforma</label>
                <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]">
                  {["Meta Ads","Google Ads","TikTok Ads","LinkedIn Ads","Otro"].map((p) => <option key={p}>{p}</option>)}
                </select>
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

            <div className="mt-4 flex gap-2">
              <button onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-bold text-[#64748B]">Cancelar</button>
              <button onClick={save} disabled={saving} className="flex-1 rounded-xl bg-[#27B1B8] py-2.5 text-sm font-bold text-white disabled:opacity-50">
                {saving ? "Guardando…" : editing ? "Actualizar" : "Crear campaña"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
