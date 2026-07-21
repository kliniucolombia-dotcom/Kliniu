"use client";
import { useEffect, useMemo, useState } from "react";
import {
  MdArticle, MdSearch, MdCampaign, MdCheckCircle, MdFiberNew, MdClose,
  MdPriorityHigh, MdVisibility, MdArrowForward,
} from "react-icons/md";

type Announcement = {
  id: string;
  title: string;
  body: string;
  authorName: string | null;
  category: string;
  imageUrl: string | null;
  isImportant: boolean;
  createdAt: string;
  readByMe: boolean;
  readCount: number;
};

const CATEGORIES = [
  { key: "", label: "Todas", color: "#27B1B8" },
  { key: "RRHH", label: "RRHH", color: "#27B1B8" },
  { key: "EVENTOS", label: "Eventos", color: "#8B5CF6" },
  { key: "BIENESTAR", label: "Bienestar", color: "#10B981" },
  { key: "TECNOLOGIA", label: "Tecnología", color: "#3B82F6" },
  { key: "SST", label: "SST", color: "#EF4444" },
  { key: "COMERCIAL", label: "Comercial", color: "#F59E0B" },
  { key: "PRODUCCION", label: "Producción", color: "#6366F1" },
  { key: "GENERAL", label: "General", color: "#64748B" },
];

const PER_PAGE = 5;
/** ~200 palabras por minuto de lectura. */
const WORDS_PER_MINUTE = 200;

function catOf(key: string) {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

function readingMinutes(body: string) {
  return Math.max(1, Math.round(body.trim().split(/\s+/).length / WORDS_PER_MINUTE));
}

function isNew(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < 7 * 86400000;
}

export default function NoticiasPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("");
  const [order, setOrder] = useState<"recent" | "read">("recent");
  const [visible, setVisible] = useState(PER_PAGE);
  const [open, setOpen] = useState<Announcement | null>(null);

  const load = async () => {
    const res = await fetch("/api/rrhh-local/announcements");
    if (res.ok) setAnnouncements(await res.json());
    else setError("No fue posible cargar las noticias");
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setVisible(PER_PAGE);
  }, [tab, search, order]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = announcements.filter((a) => {
      if (tab && a.category !== tab) return false;
      if (term && !a.title.toLowerCase().includes(term) && !a.body.toLowerCase().includes(term)) return false;
      return true;
    });
    return order === "read"
      ? [...list].sort((a, b) => b.readCount - a.readCount)
      : list;
  }, [announcements, tab, search, order]);

  const kpis = useMemo(() => {
    const nuevas = announcements.filter((a) => isNew(a.createdAt)).length;
    const importantes = announcements.filter((a) => a.isImportant && !a.readByMe).length;
    const leidas = announcements.filter((a) => a.readByMe).length;
    const porLeer = announcements.filter((a) => !a.readByMe).length;
    return { nuevas, importantes, leidas, porLeer };
  }, [announcements]);

  const mostRead = useMemo(
    () => [...announcements].sort((a, b) => b.readCount - a.readCount).filter((a) => a.readCount > 0).slice(0, 5),
    [announcements],
  );

  const unread = useMemo(() => announcements.filter((a) => !a.readByMe).slice(0, 5), [announcements]);

  const openNews = async (a: Announcement) => {
    setOpen(a);
    if (a.readByMe) return;
    // Marcar como leída al abrir; el conteo se refresca desde el servidor.
    const res = await fetch(`/api/rrhh-local/announcements/${a.id}/read`, { method: "POST" });
    if (res.ok) await load();
  };

  if (loading) return <div className="p-6 text-sm text-[#64748B]">Cargando…</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E6FAFB] text-[#27B1B8]">
          <MdArticle size={20} />
        </div>
        <div>
          <h1 className="text-xl font-black text-[#1A1A1A]">Noticias</h1>
          <p className="text-xs text-[#64748B]">Comunicados, anuncios y novedades de la empresa</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi value={kpis.nuevas} label="Noticias nuevas" hint="Últimos 7 días"
          icon={<MdFiberNew size={20} />} tone="bg-[#E6FAFB] text-[#27B1B8]" />
        <Kpi value={kpis.importantes} label="Comunicados importantes" hint="Requieren tu atención"
          icon={<MdPriorityHigh size={20} />} tone="bg-[#FEF3C7] text-[#B45309]" />
        <Kpi value={kpis.porLeer} label="Por leer" hint="Aún sin abrir"
          icon={<MdCampaign size={20} />} tone="bg-[#EDE9FE] text-[#7C3AED]" />
        <Kpi value={kpis.leidas} label="Noticias leídas" hint={`${announcements.length} publicadas en total`}
          icon={<MdCheckCircle size={20} />} tone="bg-[#DCFCE7] text-[#16A34A]" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
            <div className="relative min-w-[200px] flex-1">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={16} />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar noticias, comunicados o temas…"
                className="w-full rounded-lg border border-[#E2E8F0] py-2 pl-9 pr-3 text-sm" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setOrder("recent")}
                className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                  order === "recent" ? "border-[#27B1B8] bg-[#E6FAFB] text-[#27B1B8]" : "border-[#E2E8F0] text-[#64748B]"
                }`}>
                Más recientes
              </button>
              <button onClick={() => setOrder("read")}
                className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                  order === "read" ? "border-[#27B1B8] bg-[#E6FAFB] text-[#27B1B8]" : "border-[#E2E8F0] text-[#64748B]"
                }`}>
                Más leídas
              </button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((c) => (
              <button key={c.key} onClick={() => setTab(c.key)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                  tab === c.key
                    ? "border-[#27B1B8] bg-[#27B1B8] text-white"
                    : "border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC]"
                }`}>
                {c.label}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
            <h2 className="mb-4 text-sm font-black text-[#1A1A1A]">
              {tab ? catOf(tab).label : "Todas las noticias"}
            </h2>
            <div className="space-y-4">
              {filtered.slice(0, visible).map((a) => {
                const c = catOf(a.category);
                return (
                  <article key={a.id} className="flex flex-col gap-4 border-b border-[#F1F5F9] pb-4 last:border-b-0 last:pb-0 sm:flex-row">
                    {a.imageUrl && (
                      <img src={a.imageUrl} alt="" className="h-32 w-full shrink-0 rounded-lg object-cover sm:w-44" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{ backgroundColor: `${c.color}1A`, color: c.color }}>
                          {c.label}
                        </span>
                        {a.isImportant && (
                          <span className="rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[10px] font-bold text-[#DC2626]">
                            Importante
                          </span>
                        )}
                        {isNew(a.createdAt) && !a.readByMe && (
                          <span className="ml-auto rounded-full border border-[#27B1B8] px-2 py-0.5 text-[10px] font-bold text-[#27B1B8]">
                            Nuevo
                          </span>
                        )}
                      </div>
                      <h3 className="mt-2 text-sm font-black text-[#1A1A1A]">{a.title}</h3>
                      <p className="mt-1 line-clamp-2 text-xs text-[#64748B]">{a.body}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <p className="text-[11px] text-[#94A3B8]">
                          {a.authorName ? `${a.authorName} • ` : ""}{fmt(a.createdAt)} • {readingMinutes(a.body)} min de lectura
                        </p>
                        <button onClick={() => openNews(a)}
                          className="ml-auto rounded-lg bg-[#27B1B8] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1F9BA1]">
                          Leer más
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-sm text-[#94A3B8]">No hay noticias que coincidan con la búsqueda.</p>
              )}
            </div>
            {visible < filtered.length && (
              <button onClick={() => setVisible((v) => v + PER_PAGE)}
                className="mt-4 w-full rounded-lg border border-[#E2E8F0] py-2 text-sm font-bold text-[#27B1B8] hover:bg-[#F8FAFC]">
                Cargar más noticias
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <h3 className="mb-3 text-sm font-black text-[#1A1A1A]">Comunicados por leer</h3>
            {unread.length === 0 && <p className="text-xs text-[#94A3B8]">Estás al día con todas las noticias.</p>}
            <div className="space-y-3">
              {unread.map((a) => (
                <button key={a.id} onClick={() => openNews(a)} className="flex w-full items-start gap-2 text-left">
                  <MdCampaign className="mt-0.5 shrink-0 text-[#27B1B8]" size={16} />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-[#1A1A1A]">{a.title}</p>
                    <p className="text-[11px] text-[#94A3B8]">Publicado el {fmt(a.createdAt)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {mostRead.length > 0 && (
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
              <h3 className="mb-3 text-sm font-black text-[#1A1A1A]">Más leídas</h3>
              <div className="space-y-3">
                {mostRead.map((a, i) => (
                  <button key={a.id} onClick={() => openNews(a)} className="flex w-full items-start gap-2 text-left">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[10px] font-black text-[#64748B]">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-[#1A1A1A]">{a.title}</p>
                      <p className="flex items-center gap-1 text-[11px] text-[#94A3B8]">
                        <MdVisibility size={11} /> {a.readCount} lectura{a.readCount === 1 ? "" : "s"} • {fmt(a.createdAt)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl bg-[#F0FDFF] p-4">
            <p className="text-sm font-black text-[#1A1A1A]">Mantente informado</p>
            <p className="mt-1 text-xs text-[#64748B]">
              Las noticias y comunicados son importantes para mantenernos alineados y seguir construyendo juntos el futuro de Kliniu.
            </p>
            <button onClick={() => { setTab(""); setSearch(""); }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#27B1B8] px-3 py-2 text-xs font-bold text-white hover:bg-[#1F9BA1]">
              Ver todas las noticias <MdArrowForward size={14} />
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(null)}>
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white" onClick={(e) => e.stopPropagation()}>
            {open.imageUrl && <img src={open.imageUrl} alt="" className="h-52 w-full object-cover" />}
            <div className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ backgroundColor: `${catOf(open.category).color}1A`, color: catOf(open.category).color }}>
                    {catOf(open.category).label}
                  </span>
                  <h3 className="mt-2 text-lg font-black text-[#1A1A1A]">{open.title}</h3>
                  <p className="mt-1 text-xs text-[#94A3B8]">
                    {open.authorName ? `${open.authorName} • ` : ""}{fmt(open.createdAt)} • {readingMinutes(open.body)} min de lectura
                  </p>
                </div>
                <button onClick={() => setOpen(null)} className="shrink-0 text-[#64748B]"><MdClose size={18} /></button>
              </div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-[#64748B]">{open.body}</p>
            </div>
          </div>
        </div>
      )}
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
