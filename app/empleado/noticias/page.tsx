"use client";
import { useEffect, useState } from "react";
import { MdArticle } from "react-icons/md";

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

type Announcement = { id: string; title: string; body: string; authorName: string | null; createdAt: string };

export default function NoticiasPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/rrhh-local/announcements");
      if (res.ok) setAnnouncements(await res.json());
      else setError("No fue posible cargar las noticias");
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-6 text-sm text-[#64748B]">Cargando…</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E6FAFB] text-[#27B1B8]">
          <MdArticle size={20} />
        </div>
        <div>
          <h1 className="text-xl font-black text-[#1A1A1A]">Noticias</h1>
          <p className="text-xs text-[#64748B]">Anuncios y comunicados de la empresa</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="space-y-3">
        {announcements.map((a) => (
          <div key={a.id} className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-black text-[#1A1A1A]">{a.title}</p>
              <p className="text-xs text-[#94A3B8]">{fmt(a.createdAt)}</p>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm text-[#64748B]">{a.body}</p>
            {a.authorName && <p className="mt-2 text-xs font-bold text-[#94A3B8]">— {a.authorName}</p>}
          </div>
        ))}
        {announcements.length === 0 && (
          <p className="text-sm text-[#94A3B8]">Sin noticias publicadas todavía.</p>
        )}
      </div>
    </div>
  );
}
