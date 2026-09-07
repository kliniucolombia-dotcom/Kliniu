"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { MdEdit, MdDelete, MdArrowUpward, MdArrowDownward, MdPlayCircle, MdVideocam } from "react-icons/md";

type SolutionVideo = {
  id: string;
  title: string;
  videoUrl: string;
  thumbUrl: string | null;
  order: number;
  active: boolean;
};

export default function VideosSolucionesPage() {
  const [videos, setVideos] = useState<SolutionVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<SolutionVideo | { id: "new" } | null>(null);
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbUrl, setThumbUrl] = useState("");
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<SolutionVideo | null>(null);
  const [preview, setPreview] = useState<SolutionVideo | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/panel/videos-soluciones");
      const d = await r.json();
      setVideos(Array.isArray(d) ? d : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setTitle(""); setVideoUrl(""); setThumbUrl(""); setError(null);
    setModal({ id: "new" });
  };

  const openEdit = (v: SolutionVideo) => {
    setTitle(v.title); setVideoUrl(v.videoUrl); setThumbUrl(v.thumbUrl ?? ""); setError(null);
    setModal(v);
  };

  const uploadVideo = async (file: File) => {
    setUploadingVideo(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("label", title || "video");
      const r = await fetch("/api/uploads/video", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "No se pudo subir el video"); return; }
      setVideoUrl(d.publicUrl);
    } finally {
      setUploadingVideo(false);
    }
  };

  const uploadThumb = async (file: File) => {
    setUploadingThumb(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("productName", title || "video");
      fd.append("kind", "banner");
      const r = await fetch("/api/uploads", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "No se pudo subir la miniatura"); return; }
      setThumbUrl(d.publicUrl);
    } finally {
      setUploadingThumb(false);
    }
  };

  const save = async () => {
    if (!title.trim() || !videoUrl.trim()) { setError("Título y video son obligatorios"); return; }
    setSaving(true);
    setError(null);
    try {
      const isEdit = modal && modal.id !== "new";
      const r = await fetch(isEdit ? `/api/panel/videos-soluciones/${modal.id}` : "/api/panel/videos-soluciones", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, videoUrl, thumbUrl: thumbUrl || null }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "No se pudo guardar"); return; }
      setModal(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setSaving(true);
    setError(null);
    try {
      const r = await fetch(`/api/panel/videos-soluciones/${confirmDelete.id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "No se pudo eliminar"); return; }
      setConfirmDelete(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (v: SolutionVideo) => {
    await fetch(`/api/panel/videos-soluciones/${v.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !v.active }),
    });
    await load();
  };

  const move = async (v: SolutionVideo, dir: -1 | 1) => {
    const sorted = [...videos].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((x) => x.id === v.id);
    const target = sorted[idx + dir];
    if (!target) return;
    await Promise.all([
      fetch(`/api/panel/videos-soluciones/${v.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: target.order }),
      }),
      fetch(`/api/panel/videos-soluciones/${target.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: v.order }),
      }),
    ]);
    await load();
  };

  const sorted = [...videos].sort((a, b) => a.order - b.order);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Catálogo</p>
          <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Videos de Soluciones</h1>
          <p className="mt-0.5 text-sm text-[#64748B]">Videos que aparecen en el inicio, sección &quot;Soluciones para cada necesidad&quot;</p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-xl bg-[#27B1B8] px-4 py-2.5 text-sm font-black text-white shadow-[0_2px_8px_rgba(39,177,184,0.3)] transition hover:bg-[#1F9AA0]"
        >
          + Nuevo video
        </button>
      </div>

      {error && !modal && !confirmDelete && (
        <div className="mb-4 rounded-xl bg-[#FEE2E2] px-3 py-2 text-xs font-semibold text-[#DC2626]">{error}</div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#27B1B8] border-t-transparent" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E2E8F0] bg-white p-10 text-center text-sm text-[#94A3B8]">
          <MdVideocam size={28} className="mx-auto mb-2 text-[#CBD5E1]" />
          Sin videos todavía. Crea el primero.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {sorted.map((v, i) => (
            <div key={v.id} className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
              <button
                type="button"
                onClick={() => setPreview(v)}
                className="relative block aspect-square w-full bg-[#F1F5F9]"
              >
                {v.thumbUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.thumbUrl} alt={v.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[#CBD5E1]"><MdVideocam size={32} /></div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition hover:bg-black/25">
                  <MdPlayCircle size={36} className="text-white drop-shadow" />
                </div>
                {!v.active && (
                  <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">
                    Oculto
                  </span>
                )}
              </button>
              <div className="p-3">
                <p className="line-clamp-2 text-xs font-bold text-[#1A1A1A]">{v.title}</p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex gap-0.5">
                    <button onClick={() => move(v, -1)} disabled={i === 0} aria-label="Subir" className="rounded p-1 text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#27B1B8] disabled:opacity-30">
                      <MdArrowUpward size={14} />
                    </button>
                    <button onClick={() => move(v, 1)} disabled={i === sorted.length - 1} aria-label="Bajar" className="rounded p-1 text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#27B1B8] disabled:opacity-30">
                      <MdArrowDownward size={14} />
                    </button>
                  </div>
                  <div className="flex gap-0.5">
                    <button onClick={() => toggleActive(v)} className="rounded px-1.5 py-1 text-[10px] font-bold text-[#64748B] hover:bg-[#F1F5F9]">
                      {v.active ? "Ocultar" : "Mostrar"}
                    </button>
                    <button onClick={() => openEdit(v)} aria-label={`Editar ${v.title}`} className="rounded p-1 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#27B1B8]">
                      <MdEdit size={14} />
                    </button>
                    <button onClick={() => { setError(null); setConfirmDelete(v); }} aria-label={`Eliminar ${v.title}`} className="rounded p-1 text-[#64748B] hover:bg-[#FEE2E2] hover:text-[#DC2626]">
                      <MdDelete size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="font-black text-[#1A1A1A]">{modal.id === "new" ? "Nuevo video" : "Editar video"}</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-[#64748B]">Título</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#64748B]">Video (MP4, máx 60MB)</label>
                {videoUrl && (
                  <video src={videoUrl} controls className="mt-1 mb-2 max-h-40 w-full rounded-lg bg-black" />
                )}
                <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" hidden
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadVideo(f); }} />
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={uploadingVideo}
                  className="mt-1 w-full rounded-lg border border-dashed border-[#CBD5E1] px-3 py-2 text-xs font-bold text-[#64748B] hover:border-[#27B1B8] hover:text-[#27B1B8] disabled:opacity-50"
                >
                  {uploadingVideo ? "Subiendo…" : videoUrl ? "Reemplazar video" : "Subir video"}
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-[#64748B]">Miniatura (imagen)</label>
                {thumbUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbUrl} alt="" className="mt-1 mb-2 h-24 w-24 rounded-lg object-cover" />
                )}
                <input ref={thumbInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadThumb(f); }} />
                <button
                  type="button"
                  onClick={() => thumbInputRef.current?.click()}
                  disabled={uploadingThumb}
                  className="mt-1 w-full rounded-lg border border-dashed border-[#CBD5E1] px-3 py-2 text-xs font-bold text-[#64748B] hover:border-[#27B1B8] hover:text-[#27B1B8] disabled:opacity-50"
                >
                  {uploadingThumb ? "Subiendo…" : thumbUrl ? "Reemplazar miniatura" : "Subir miniatura"}
                </button>
              </div>
            </div>
            {error && <p className="mt-3 text-xs font-semibold text-[#DC2626]">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => { setModal(null); setError(null); }} className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">
                Cancelar
              </button>
              <button onClick={save} disabled={saving || uploadingVideo || uploadingThumb} className="rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white hover:bg-[#1F9AA0] disabled:opacity-60">
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="font-black text-[#1A1A1A]">Eliminar video</h3>
            <p className="mt-2 text-sm text-[#64748B]">
              ¿Eliminar <span className="font-bold text-[#1A1A1A]">{confirmDelete.title}</span>? Esta acción no se puede deshacer.
            </p>
            {error && <p className="mt-3 text-xs font-semibold text-[#DC2626]">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => { setConfirmDelete(null); setError(null); }} className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">
                Cancelar
              </button>
              <button onClick={remove} disabled={saving} className="rounded-xl bg-[#DC2626] px-4 py-2 text-sm font-bold text-white hover:bg-[#B91C1C] disabled:opacity-60">
                {saving ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-black"
            style={{ maxHeight: "calc(100vh - 2rem)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              ✕
            </button>
            <video src={preview.videoUrl} className="block w-full" style={{ maxHeight: "calc(100vh - 2rem)" }} controls autoPlay playsInline />
          </div>
        </div>
      )}
    </div>
  );
}
