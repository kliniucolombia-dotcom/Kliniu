"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MdAdd,
  MdArrowBack,
  MdAutorenew,
  MdCheckCircle,
  MdDeleteOutline,
  MdErrorOutline,
  MdSave,
} from "react-icons/md";
import { SimpleSelect } from "@/app/panel/_components/simple-select";
import { useConfirm } from "@/app/components/confirm-dialog";
import type { RemarketingConfig, RemarketingPromotion } from "@/lib/wati-followup";

type StageMetric = {
  stage: number;
  sent: number;
  replied: number;
  optedOut: number;
  replyRate: number | null;
  avgMinutesToReply: number | null;
};

type Metrics = {
  days: number;
  sent: number;
  stages: StageMetric[];
  recoveredConversations: number;
  quotesAfterRemarketing: number;
  attributedSales: number;
  attributedRevenue: number;
  bestStage: number | null;
  optOutRate: number | null;
  topArguments: { benefit: string; sent: number; replied: number; replyRate: number }[];
};

type ProductOption = { slug: string; name: string; category: string };

const STAGE_LABELS = ["Valor", "Confianza + alternativas", "Asesoría", "Cantidad / condición", "Cierre"];
const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const RANGE_OPTIONS = [
  { value: "7", label: "Últimos 7 días" },
  { value: "30", label: "Últimos 30 días" },
  { value: "90", label: "Últimos 90 días" },
];

const pct = (v: number | null) => (v === null ? "sin datos" : `${Math.round(v * 100)}%`);
const money = (v: number) => `$${v.toLocaleString("es-CO")}`;
const toHm = (min: number) => `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
const today = () => new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10);

const inputClass =
  "w-full rounded-xl border border-[#DCE5EA] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#27B1B8] focus:ring-2 focus:ring-[#27B1B8]/20";

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border border-[#DCE5EA] bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-[#0C535B]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 text-sm text-[#0F172A]"
    >
      <span className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-[#27B1B8]" : "bg-[#CBD5E1]"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? "left-[22px]" : "left-0.5"}`} />
      </span>
      {label}
    </button>
  );
}

export default function RemarketingPage() {
  const confirm = useConfirm();
  const [days, setDays] = useState("30");
  const [config, setConfig] = useState<RemarketingConfig | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [altProduct, setAltProduct] = useState("");

  const load = useCallback(async () => {
    setError(null);
    const response = await fetch(`/api/panel/whatsapp/remarketing?days=${days}`, { cache: "no-store" });
    if (!response.ok) {
      setError("No fue posible cargar el remarketing.");
      return;
    }
    const data = (await response.json()) as { config: RemarketingConfig; metrics: Metrics; products: ProductOption[] };
    setConfig((current) => current ?? data.config);
    setMetrics(data.metrics);
    setProducts(data.products);
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  const categories = useMemo(() => [...new Set(products.map((p) => p.category))].sort(), [products]);
  const productOptions = useMemo(
    () => products.map((p) => ({ value: p.slug, label: p.name, search: `${p.name} ${p.category}` })),
    [products],
  );
  const productName = (slug: string) => products.find((p) => p.slug === slug)?.name ?? slug;

  function patch(update: Partial<RemarketingConfig>) {
    setConfig((current) => (current ? { ...current, ...update } : current));
  }

  function patchPromotion(id: string, update: Partial<RemarketingPromotion>) {
    if (!config) return;
    patch({ promotions: config.promotions.map((p) => (p.id === id ? { ...p, ...update } : p)) });
  }

  async function save() {
    if (!config) return;
    setSaving(true);
    setNotice(null);
    const response = await fetch("/api/panel/whatsapp/remarketing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    setSaving(false);
    setNotice(
      response.ok
        ? { ok: true, text: "Configuración guardada." }
        : { ok: false, text: "No se guardó: revisa que los tiempos sean crecientes y las fechas válidas." },
    );
  }

  if (error) {
    return <div className="p-6 text-sm text-red-600">{error}</div>;
  }
  if (!config || !metrics) {
    return <div className="p-6 text-sm text-[#64748B]">Cargando remarketing…</div>;
  }

  const altEntries = Object.entries(config.alternatives);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/panel/whatsapp"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DCE5EA] bg-white text-[#0C535B] hover:bg-[#F1F7F8]"
            aria-label="Volver a WhatsApp"
          >
            <MdArrowBack size={20} />
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold text-[#0C535B]">
              <MdAutorenew size={22} /> Remarketing IA
            </h1>
            <p className="text-xs text-[#64748B]">Seguimiento automático de 5 etapas dentro de las 24 h de WhatsApp.</p>
          </div>
        </div>
        <Toggle checked={config.enabled} onChange={(enabled) => patch({ enabled })} label={config.enabled ? "Activo" : "Pausado"} />
      </div>

      <Card
        title="Métricas"
        action={<SimpleSelect value={days} options={RANGE_OPTIONS} onChange={setDays} className="w-44" />}
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Mensajes enviados", String(metrics.sent)],
            ["Conversaciones recuperadas", String(metrics.recoveredConversations)],
            ["Cotizaciones tras remarketing", String(metrics.quotesAfterRemarketing)],
            ["Ventas atribuidas", metrics.attributedSales ? `${metrics.attributedSales} · ${money(metrics.attributedRevenue)}` : "0"],
            ["Etapa con más recuperación", metrics.bestStage ? `${metrics.bestStage} · ${STAGE_LABELS[metrics.bestStage - 1]}` : "sin datos"],
            ["Tasa de no contactar", pct(metrics.optOutRate)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-[#F1F7F8] p-3">
              <p className="text-[11px] text-[#64748B]">{label}</p>
              <p className="mt-1 text-base font-bold text-[#0C535B]">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-[11px] uppercase text-[#64748B]">
              <tr>
                <th className="py-2 pr-3">Etapa</th>
                <th className="py-2 pr-3">Enviados</th>
                <th className="py-2 pr-3">Respondidos</th>
                <th className="py-2 pr-3">Tasa de respuesta</th>
                <th className="py-2 pr-3">Tiempo prom. a respuesta</th>
                <th className="py-2">No contactar</th>
              </tr>
            </thead>
            <tbody>
              {metrics.stages.map((s) => (
                <tr key={s.stage} className="border-t border-[#EEF2F5]">
                  <td className="py-2 pr-3 font-medium">{s.stage}. {STAGE_LABELS[s.stage - 1]}</td>
                  <td className="py-2 pr-3">{s.sent}</td>
                  <td className="py-2 pr-3">{s.replied}</td>
                  <td className="py-2 pr-3">{pct(s.replyRate)}</td>
                  <td className="py-2 pr-3">{s.avgMinutesToReply === null ? "sin datos" : toHm(s.avgMinutesToReply)}</td>
                  <td className="py-2">{s.optedOut}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mb-2 mt-5 text-xs font-bold text-[#0C535B]">Argumentos con mayor respuesta (mín. 3 envíos)</h3>
        {metrics.topArguments.length === 0 ? (
          <p className="text-sm text-[#64748B]">Sin datos todavía.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {metrics.topArguments.map((a) => (
              <li key={a.benefit} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">{a.benefit}</span>
                <span className="shrink-0 text-[#64748B]">{pct(a.replyRate)} · {a.replied}/{a.sent}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Cadencia">
          <div className="space-y-2">
            {config.delaysMin.map((min, i) => (
              <label key={i} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">{i + 1}. {STAGE_LABELS[i]}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={1439}
                    value={min}
                    onChange={(e) => {
                      const next = [...config.delaysMin];
                      next[i] = Number(e.target.value);
                      patch({ delaysMin: next });
                    }}
                    className={`${inputClass} w-24`}
                    aria-label={`Minutos etapa ${i + 1}`}
                  />
                  <span className="w-16 text-xs text-[#64748B]">{toHm(min || 0)}</span>
                </span>
              </label>
            ))}
            <p className="text-[11px] text-[#64748B]">Minutos desde el último mensaje del cliente. Máximo 23h 59m (ventana de WhatsApp).</p>
          </div>

          <p className="mb-2 mt-4 text-xs font-bold text-[#0C535B]">Días permitidos</p>
          <div className="flex flex-wrap gap-2">
            {DAY_LABELS.map((label, day) => {
              const on = config.days.includes(day);
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={on}
                  onClick={() => patch({ days: on ? config.days.filter((d) => d !== day) : [...config.days, day].sort() })}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${on ? "bg-[#27B1B8] text-white" : "bg-[#F1F7F8] text-[#64748B]"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <label className="mt-4 block text-sm">
            <span className="mb-1 block text-xs font-bold text-[#0C535B]">Días mínimos entre secuencias por cliente</span>
            <input
              type="number"
              min={0}
              value={config.cooldownDays}
              onChange={(e) => patch({ cooldownDays: Number(e.target.value) })}
              className={`${inputClass} w-24`}
            />
          </label>
        </Card>

        <Card title="Condiciones comerciales autorizadas">
          <Toggle checked={config.cashOnDelivery} onChange={(cashOnDelivery) => patch({ cashOnDelivery })} label="Pago contra entrega" />
          <label className="mt-4 block text-sm">
            <span className="mb-1 block text-xs font-bold text-[#0C535B]">Cuándo aplica envío incluido</span>
            <textarea
              rows={2}
              value={config.shippingIncludedRule}
              onChange={(e) => patch({ shippingIncludedRule: e.target.value })}
              placeholder="Vacío = solo tarifa estándar (Bogotá gratis, resto $12.000)"
              className={inputClass}
            />
          </label>
          <p className="mb-2 mt-4 text-xs font-bold text-[#0C535B]">Reglas por volumen</p>
          <div className="space-y-2">
            {["*", ...categories].map((cat) => (
              <label key={cat} className="block text-sm">
                <span className="mb-1 block text-[11px] text-[#64748B]">{cat === "*" ? "Todas las categorías" : cat}</span>
                <input
                  value={config.volumeRules[cat] ?? ""}
                  onChange={(e) => {
                    const next = { ...config.volumeRules };
                    if (e.target.value) next[cat] = e.target.value;
                    else delete next[cat];
                    patch({ volumeRules: next });
                  }}
                  placeholder="Sin regla (la IA no ofrece descuento)"
                  className={inputClass}
                />
              </label>
            ))}
          </div>
        </Card>
      </div>

      <Card
        title="Promociones vigentes"
        action={
          <button
            type="button"
            onClick={() =>
              patch({
                promotions: [
                  ...config.promotions,
                  { id: crypto.randomUUID(), title: "", description: "", productSlugs: [], categories: [], startsAt: today(), endsAt: today(), gift: false, shippingIncluded: false },
                ],
              })
            }
            className="flex items-center gap-1 rounded-xl bg-[#27B1B8] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1F9AA0]"
          >
            <MdAdd size={16} /> Agregar
          </button>
        }
      >
        {config.promotions.length === 0 ? (
          <p className="text-sm text-[#64748B]">Sin promociones: la IA cierra sin ofrecer incentivos.</p>
        ) : (
          <div className="space-y-4">
            {config.promotions.map((p) => (
              <div key={p.id} className="grid gap-3 rounded-xl border border-[#EEF2F5] p-3 md:grid-cols-2">
                <input value={p.title} onChange={(e) => patchPromotion(p.id, { title: e.target.value })} placeholder="Nombre de la promoción" className={inputClass} />
                <input value={p.description} onChange={(e) => patchPromotion(p.id, { description: e.target.value })} placeholder="Condición exacta que puede decir la IA" className={inputClass} />
                <label className="text-[11px] text-[#64748B]">
                  Desde
                  <input type="date" value={p.startsAt} onChange={(e) => patchPromotion(p.id, { startsAt: e.target.value })} className={inputClass} />
                </label>
                <label className="text-[11px] text-[#64748B]">
                  Hasta
                  <input type="date" value={p.endsAt} onChange={(e) => patchPromotion(p.id, { endsAt: e.target.value })} className={inputClass} />
                </label>
                <SimpleSelect
                  multiple
                  portal
                  value={p.categories.join(",")}
                  options={categories.map((c) => ({ value: c, label: c }))}
                  onChange={(v) => patchPromotion(p.id, { categories: v ? v.split(",") : [] })}
                  placeholder="Categorías (vacío = todas)"
                />
                <SimpleSelect
                  multiple
                  portal
                  searchable
                  value={p.productSlugs.join(",")}
                  options={productOptions}
                  onChange={(v) => patchPromotion(p.id, { productSlugs: v ? v.split(",") : [] })}
                  placeholder="Productos (vacío = todos)"
                />
                <div className="flex flex-wrap items-center gap-4 md:col-span-2">
                  <Toggle checked={p.gift} onChange={(gift) => patchPromotion(p.id, { gift })} label="Incluye regalo" />
                  <Toggle checked={p.shippingIncluded} onChange={(shippingIncluded) => patchPromotion(p.id, { shippingIncluded })} label="Envío incluido" />
                  <button
                    type="button"
                    onClick={async () => {
                      if (await confirm({ title: "Eliminar promoción", message: `¿Eliminar "${p.title || "sin nombre"}"?`, confirmLabel: "Eliminar" })) {
                        patch({ promotions: config.promotions.filter((x) => x.id !== p.id) });
                      }
                    }}
                    className="ml-auto flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline"
                  >
                    <MdDeleteOutline size={16} /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Matriz de alternativas">
        <p className="mb-3 text-[11px] text-[#64748B]">Productos sin entrada usan 2 de la misma categoría.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <SimpleSelect searchable portal value={altProduct} options={productOptions} onChange={setAltProduct} placeholder="Producto" className="min-w-0 flex-1" />
          <button
            type="button"
            disabled={!altProduct || altProduct in config.alternatives}
            onClick={() => {
              patch({ alternatives: { ...config.alternatives, [altProduct]: [] } });
              setAltProduct("");
            }}
            className="flex items-center justify-center gap-1 rounded-xl bg-[#27B1B8] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
          >
            <MdAdd size={16} /> Agregar
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {altEntries.map(([slug, alts]) => (
            <div key={slug} className="grid items-center gap-2 rounded-xl border border-[#EEF2F5] p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
              <span className="min-w-0 truncate text-sm font-medium">{productName(slug)}</span>
              {[0, 1].map((i) => (
                <SimpleSelect
                  key={i}
                  searchable
                  portal
                  value={alts[i] ?? ""}
                  options={productOptions.filter((o) => o.value !== slug)}
                  onChange={(v) => {
                    const next = [...alts];
                    next[i] = v;
                    patch({ alternatives: { ...config.alternatives, [slug]: next.filter(Boolean) } });
                  }}
                  placeholder={`Alternativa ${i + 1}`}
                />
              ))}
              <button
                type="button"
                aria-label="Quitar"
                onClick={() => {
                  const next = { ...config.alternatives };
                  delete next[slug];
                  patch({ alternatives: next });
                }}
                className="justify-self-end text-red-600"
              >
                <MdDeleteOutline size={18} />
              </button>
            </div>
          ))}
        </div>
      </Card>

      <div className="sticky bottom-4 flex items-center justify-end gap-3">
        {notice && (
          <span className={`flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs shadow ${notice.ok ? "text-[#16A34A]" : "text-red-600"}`}>
            {notice.ok ? <MdCheckCircle size={16} /> : <MdErrorOutline size={16} />} {notice.text}
          </span>
        )}
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-[#0C535B] px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#0E7C82] disabled:opacity-50"
        >
          <MdSave size={18} /> {saving ? "Guardando…" : "Guardar configuración"}
        </button>
      </div>
    </div>
  );
}
