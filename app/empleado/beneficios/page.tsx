"use client";
import { useEffect, useMemo, useState } from "react";
import {
  MdCardGiftcard, MdFavoriteBorder, MdSchool, MdSelfImprovement, MdLocalOffer,
  MdStarBorder, MdMilitaryTech, MdApps, MdCheckCircle, MdSchedule, MdClose,
  MdHeadsetMic, MdArrowForward,
} from "react-icons/md";
import { DonutChart } from "@/app/panel/_components/mini-charts";

type Benefit = {
  id: string;
  title: string;
  description: string;
  detail: string | null;
  category: string;
  imageUrl: string | null;
  frequency: string | null;
  isFeatured: boolean;
  approvedCount: number;
};

type BenefitRequest = {
  id: string;
  benefitId: string;
  status: string;
  note: string | null;
  reviewNote: string | null;
  createdAt: string;
  benefit: { title: string; category: string };
};

const CATEGORIES = [
  { key: "", label: "Todos", Icon: MdApps, color: "#27B1B8" },
  { key: "SALUD", label: "Salud", Icon: MdFavoriteBorder, color: "#EF4444" },
  { key: "EDUCACION", label: "Educación", Icon: MdSchool, color: "#3B82F6" },
  { key: "BIENESTAR", label: "Bienestar", Icon: MdSelfImprovement, color: "#F59E0B" },
  { key: "CONVENIOS", label: "Convenios", Icon: MdLocalOffer, color: "#8B5CF6" },
  { key: "BONIFICACIONES", label: "Bonificaciones", Icon: MdStarBorder, color: "#10B981" },
  { key: "RECONOCIMIENTOS", label: "Reconocimientos", Icon: MdMilitaryTech, color: "#EC4899" },
  { key: "OTRO", label: "Otros", Icon: MdCardGiftcard, color: "#64748B" },
];

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  CANCELLED: "Cancelado",
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-[#FEF3C7] text-[#B45309]",
  APPROVED: "bg-[#DCFCE7] text-[#16A34A]",
  REJECTED: "bg-[#FEE2E2] text-[#DC2626]",
  CANCELLED: "bg-[#F1F5F9] text-[#64748B]",
};

function catOf(key: string) {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

export default function BeneficiosPage() {
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [requests, setRequests] = useState<BenefitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("");
  const [detail, setDetail] = useState<Benefit | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [bRes, rRes] = await Promise.all([
      fetch("/api/rrhh-local/benefits"),
      fetch("/api/rrhh-local/benefit-requests"),
    ]);
    if (bRes.ok) setBenefits(await bRes.json());
    else setError("No fue posible cargar los beneficios");
    if (rRes.ok) setRequests(await rRes.json());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => benefits.filter((b) => !tab || b.category === tab), [benefits, tab]);

  const featured = useMemo(() => {
    const list = benefits.filter((b) => b.isFeatured);
    return list.length > 0 ? list : benefits.slice(0, 4);
  }, [benefits]);

  const kpis = useMemo(() => {
    const thisYear = new Date().getFullYear();
    const used = requests.filter(
      (r) => r.status === "APPROVED" && new Date(r.createdAt).getFullYear() === thisYear,
    ).length;
    const pending = requests.filter((r) => r.status === "PENDING").length;
    return { available: benefits.length, used, pending };
  }, [benefits, requests]);

  /** Reparto del catálogo por categoría; solo categorías con beneficios. */
  const distribution = useMemo(() => {
    const counts = new Map<string, number>();
    benefits.forEach((b) => counts.set(b.category, (counts.get(b.category) ?? 0) + 1));
    const total = benefits.length || 1;
    return Array.from(counts.entries())
      .map(([key, count]) => ({
        label: catOf(key).label,
        color: catOf(key).color,
        value: count,
        pct: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.value - a.value);
  }, [benefits]);

  const mostUsed = useMemo(
    () => benefits.filter((b) => b.approvedCount > 0).sort((a, b) => b.approvedCount - a.approvedCount).slice(0, 5),
    [benefits],
  );

  const requestFor = (benefitId: string) =>
    requests.find((r) => r.benefitId === benefitId && ["PENDING", "APPROVED"].includes(r.status));

  const solicitar = async (benefitId: string) => {
    setSaving(true);
    setError("");
    const res = await fetch("/api/rrhh-local/benefit-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ benefitId, note }),
    });
    if (res.ok) {
      setDetail(null);
      setNote("");
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No fue posible enviar la solicitud");
    }
    setSaving(false);
  };

  const cancelar = async (id: string) => {
    const res = await fetch(`/api/rrhh-local/benefit-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    if (res.ok) await load();
    else setError("No fue posible cancelar la solicitud");
  };

  if (loading) return <div className="p-6 text-sm text-[#64748B]">Cargando…</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E6FAFB] text-[#27B1B8]">
          <MdCardGiftcard size={20} />
        </div>
        <div>
          <h1 className="text-xl font-black text-[#1A1A1A]">Beneficios</h1>
          <p className="text-xs text-[#64748B]">Beneficios disponibles para colaboradores de Kliniu</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Kpi value={kpis.available} label="Beneficios disponibles" hint="Activos para ti"
              icon={<MdCardGiftcard size={20} />} tone="bg-[#E6FAFB] text-[#27B1B8]" />
            <Kpi value={kpis.used} label="Beneficios utilizados" hint="Este año"
              icon={<MdCheckCircle size={20} />} tone="bg-[#DCFCE7] text-[#16A34A]" />
            <Kpi value={kpis.pending} label="Solicitudes pendientes" hint="En revisión de RRHH"
              icon={<MdSchedule size={20} />} tone="bg-[#FEF3C7] text-[#B45309]" />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((c) => (
              <button key={c.key} onClick={() => setTab(c.key)}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold transition-colors ${
                  tab === c.key
                    ? "border-[#27B1B8] bg-[#27B1B8] text-white"
                    : "border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC]"
                }`}>
                <c.Icon size={16} /> {c.label}
              </button>
            ))}
          </div>

          {featured.length > 0 && tab === "" && (
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
              <h2 className="mb-4 text-sm font-black text-[#1A1A1A]">Beneficios destacados</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {featured.map((b) => (
                  <BenefitCard key={b.id} benefit={b} request={requestFor(b.id)} onOpen={() => setDetail(b)} />
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
            <h2 className="mb-4 text-sm font-black text-[#1A1A1A]">
              {tab ? catOf(tab).label : "Todos los beneficios"}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((b) => (
                <BenefitCard key={b.id} benefit={b} request={requestFor(b.id)} onOpen={() => setDetail(b)} />
              ))}
            </div>
            {filtered.length === 0 && (
              <p className="text-sm text-[#94A3B8]">Sin beneficios publicados en esta categoría.</p>
            )}
          </div>

          {mostUsed.length > 0 && (
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
              <h2 className="mb-4 text-sm font-black text-[#1A1A1A]">Beneficios más utilizados</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {mostUsed.map((b, i) => {
                  const c = catOf(b.category);
                  return (
                    <div key={b.id} className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[11px] font-black text-[#64748B]">
                        {i + 1}
                      </span>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${c.color}1A`, color: c.color }}>
                        <c.Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[#1A1A1A]">{b.title}</p>
                        <p className="text-[11px] text-[#94A3B8]">
                          {b.approvedCount} colaborador{b.approvedCount === 1 ? "" : "es"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {distribution.length > 0 && (
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
              <h3 className="mb-3 text-sm font-black text-[#1A1A1A]">Beneficios por categoría</h3>
              <div className="flex items-center gap-4">
                <DonutChart slices={distribution} size={110} thickness={18} />
                <div className="min-w-0 flex-1 space-y-1.5">
                  {distribution.map((d) => (
                    <div key={d.label} className="flex items-center gap-2 text-xs">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="min-w-0 flex-1 truncate text-[#64748B]">{d.label}</span>
                      <span className="font-bold text-[#1A1A1A]">{d.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <h3 className="mb-3 text-sm font-black text-[#1A1A1A]">Mis solicitudes</h3>
            {requests.length === 0 && <p className="text-xs text-[#94A3B8]">Todavía no has solicitado beneficios.</p>}
            <div className="space-y-3">
              {requests.slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-[#1A1A1A]">{r.benefit.title}</p>
                    <p className="text-[11px] text-[#94A3B8]">{fmt(r.createdAt)}</p>
                    {r.reviewNote && <p className="mt-0.5 text-[11px] text-[#64748B]">{r.reviewNote}</p>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[r.status]}`}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                    {r.status === "PENDING" && (
                      <button onClick={() => cancelar(r.id)} className="text-[10px] font-bold text-[#DC2626] hover:underline">
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-[#F0FDFF] p-4">
            <div className="flex items-start gap-3">
              <MdHeadsetMic className="mt-0.5 shrink-0 text-[#27B1B8]" size={20} />
              <div>
                <p className="text-sm font-black text-[#1A1A1A]">¿Tienes dudas sobre tus beneficios?</p>
                <p className="mt-0.5 text-xs text-[#64748B]">Nuestro equipo de Recursos Humanos está para ayudarte.</p>
                <a href="https://wa.me/573184001648?text=Hola%2C%20tengo%20una%20duda%20sobre%20mis%20beneficios."
                  target="_blank" rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#27B1B8] px-3 py-2 text-xs font-bold text-white hover:bg-[#1F9BA1]">
                  Contactar a RRHH <MdArrowForward size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {detail && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetail(null)}>
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl bg-white" onClick={(e) => e.stopPropagation()}>
            {detail.imageUrl && <img src={detail.imageUrl} alt="" className="h-40 w-full object-cover" />}
            <div className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ backgroundColor: `${catOf(detail.category).color}1A`, color: catOf(detail.category).color }}>
                    {catOf(detail.category).label}
                  </span>
                  <h3 className="mt-2 text-base font-black text-[#1A1A1A]">{detail.title}</h3>
                </div>
                <button onClick={() => setDetail(null)} className="shrink-0 text-[#64748B]"><MdClose size={18} /></button>
              </div>
              <p className="text-sm text-[#64748B]">{detail.description}</p>
              {detail.detail && <p className="whitespace-pre-line text-sm text-[#64748B]">{detail.detail}</p>}
              {detail.frequency && (
                <p className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
                  <MdSchedule size={14} /> {detail.frequency}
                </p>
              )}

              {(() => {
                const existing = requestFor(detail.id);
                if (existing) {
                  return (
                    <p className={`rounded-lg px-3 py-2 text-xs font-bold ${STATUS_STYLE[existing.status]}`}>
                      Solicitud {STATUS_LABELS[existing.status]?.toLowerCase()} — {fmt(existing.createdAt)}
                    </p>
                  );
                }
                return (
                  <>
                    <label className="block text-xs font-bold text-[#64748B]">
                      Nota para Recursos Humanos (opcional)
                      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
                        className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm font-normal text-[#1A1A1A]" />
                    </label>
                    <button onClick={() => solicitar(detail.id)} disabled={saving}
                      className="w-full rounded-lg bg-[#27B1B8] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
                      {saving ? "Enviando…" : "Solicitar beneficio"}
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BenefitCard({ benefit, request, onOpen }: {
  benefit: Benefit; request?: BenefitRequest; onOpen: () => void;
}) {
  const c = catOf(benefit.category);
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
      {benefit.imageUrl ? (
        <img src={benefit.imageUrl} alt="" className="h-28 w-full object-cover" />
      ) : (
        <div className="flex h-28 w-full items-center justify-center" style={{ backgroundColor: `${c.color}14` }}>
          <c.Icon size={34} style={{ color: c.color }} />
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <span className="mb-2 self-start rounded-full px-2 py-0.5 text-[10px] font-bold"
          style={{ backgroundColor: `${c.color}1A`, color: c.color }}>
          {c.label}
        </span>
        <p className="text-sm font-black text-[#1A1A1A]">{benefit.title}</p>
        <p className="mt-1 line-clamp-2 flex-1 text-xs text-[#64748B]">{benefit.description}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          {benefit.frequency ? (
            <span className="flex items-center gap-1 text-[11px] text-[#94A3B8]">
              <MdSchedule size={13} /> {benefit.frequency}
            </span>
          ) : <span />}
          {request ? (
            <span className={`rounded-lg px-2 py-1 text-[11px] font-bold ${STATUS_STYLE[request.status]}`}>
              {STATUS_LABELS[request.status]}
            </span>
          ) : (
            <button onClick={onOpen}
              className="rounded-lg bg-[#27B1B8] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1F9BA1]">
              Ver más
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ value, label, hint, icon, tone }: {
  value: number; label: string; hint: string; icon: React.ReactNode; tone: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-2xl font-black text-[#1A1A1A]">{value}</p>
        <p className="text-xs font-bold text-[#64748B]">{label}</p>
        <p className="truncate text-[11px] text-[#94A3B8]">{hint}</p>
      </div>
    </div>
  );
}
