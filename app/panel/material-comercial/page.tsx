"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  MdFolder, MdCreateNewFolder, MdUploadFile, MdDelete, MdEdit, MdDownload,
  MdChevronRight, MdInsertDriveFile, MdImage, MdPictureAsPdf, MdMovie, MdHome, MdLock, MdGroup,
  MdGridView, MdViewList, MdViewModule, MdTableChart,
} from "react-icons/md";

// Módulo-level: las miniaturas sobreviven al cambio de vista sin parpadeo.
const urlCache = new Map<string, { url: string; expiresAt: number }>();

type Crumb = { id: string; name: string };
type Folder = { id: string; name: string; createdAt: string; canDelete: boolean; isPrivate: boolean };
type FileItem = {
  id: string;
  name: string;
  mimeType: string | null;
  size: number | null;
  createdAt: string;
  canDelete: boolean;
};
type Listing = { breadcrumb: Crumb[]; folders: Folder[]; files: FileItem[] };

type Target = { type: "folder" | "file"; id: string; name: string };

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const extOf = (name: string) => (name.includes(".") ? name.split(".").pop()!.slice(0, 4).toUpperCase() : "");

function fileIcon(mime: string | null, size = 20, name = "") {
  if (/^(xlsx?|csv)$/i.test(extOf(name))) return <MdTableChart size={size} className="text-[#16A34A]" />;
  if (mime?.startsWith("image/")) return <MdImage size={size} className="text-[#27B1B8]" />;
  if (mime?.startsWith("video/")) return <MdMovie size={size} className="text-[#8B5CF6]" />;
  if (mime === "application/pdf") return <MdPictureAsPdf size={size} className="text-[#DC2626]" />;
  return <MdInsertDriveFile size={size} className="text-[#94A3B8]" />;
}

type View = "icons" | "list" | "gallery";
const VIEWS: { id: View; label: string; icon: React.ReactNode }[] = [
  { id: "icons", label: "Iconos", icon: <MdGridView size={18} /> },
  { id: "list", label: "Lista", icon: <MdViewList size={18} /> },
  { id: "gallery", label: "Galería", icon: <MdViewModule size={18} /> },
];

// Miniatura de imágenes: pide el enlace firmado solo cuando entra en pantalla.
function Thumb({ file, getUrl, iconSize }: { file: FileItem; getUrl: (f: FileItem) => Promise<string | null>; iconSize: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState<string | null>(() => {
    const c = urlCache.get(file.id);
    return c && c.expiresAt > Date.now() ? c.url : null;
  });
  const isImage = !!file.mimeType?.startsWith("image/");

  useEffect(() => {
    const el = ref.current;
    if (!isImage || !el || url) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      void getUrl(file).then(setUrl);
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [file, getUrl, isImage, url]);

  return (
    <div ref={ref} className="flex h-full w-full items-center justify-center">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={file.name} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        fileIcon(file.mimeType, iconSize, file.name)
      )}
    </div>
  );
}

export default function MaterialComercialPage() {
  const [folderId, setFolderId] = useState<string | null>(null);
  const [data, setData] = useState<Listing>({ breadcrumb: [], folders: [], files: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string | null; name: string; mimeType: string | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [newFolder, setNewFolder] = useState<string | null>(null);
  const [newFolderPrivate, setNewFolderPrivate] = useState(false);
  const [rename, setRename] = useState<Target | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Target | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<View>("icons");
  const [selected, setSelected] = useState<string | null>(null);
  // Un clic selecciona, el segundo abre (también sirve en táctil).
  const pick = (id: string, open: () => void) => (selected === id ? open() : setSelected(id));

  useEffect(() => {
    try {
      const v = localStorage.getItem("material-view");
      if (v === "icons" || v === "list" || v === "gallery") setView(v);
    } catch {}
  }, []);

  const changeView = (v: View) => {
    setView(v);
    try { localStorage.setItem("material-view", v); } catch {}
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/panel/material${folderId ? `?folder=${folderId}` : ""}`);
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "No se pudo cargar"); return; }
      setData(d);
    } finally {
      setLoading(false);
    }
  }, [folderId]);

  useEffect(() => { setSelected(null); load(); }, [load]);

  const createFolder = async () => {
    if (!newFolder?.trim()) { setError("Ponle un nombre a la carpeta"); return; }
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/panel/material", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolder, parentId: folderId, isPrivate: newFolderPrivate }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "No se pudo crear la carpeta"); return; }
      setNewFolder(null);
      setNewFolderPrivate(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      const list = Array.from(files);
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        setUploadingFile(list.length > 1 ? `${file.name} (${i + 1}/${list.length})` : file.name);
        const body = new FormData();
        body.append("file", file);
        if (folderId) body.append("folderId", folderId);
        const r = await fetch("/api/panel/material/upload", { method: "POST", body });
        if (!r.ok) {
          const d = await r.json();
          setError(d.error ?? `No se pudo subir ${file.name}`);
          break;
        }
      }
      await load();
    } finally {
      setUploading(false);
      setUploadingFile(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const applyRename = async () => {
    if (!rename || !renameValue.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/panel/material", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: rename.type, id: rename.id, name: renameValue }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "No se pudo renombrar"); return; }
      setRename(null);
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
      const r = await fetch(`/api/panel/material?type=${confirmDelete.type}&id=${confirmDelete.id}`, {
        method: "DELETE",
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "No se pudo eliminar"); return; }
      setConfirmDelete(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const isPreviewable = (mimeType: string | null) =>
    !!mimeType && (mimeType.startsWith("image/") || mimeType === "application/pdf");

  // Los enlaces firmados viven 5 min: se cachean y se prefetchean al pasar el
  // ratón para que el clic abra al instante.
  const fetchUrl = useCallback(async (file: FileItem, silent = false): Promise<string | null> => {
    const cached = urlCache.get(file.id);
    if (cached && cached.expiresAt > Date.now() + 10_000) return cached.url;
    const r = await fetch(`/api/panel/material/download?id=${file.id}`);
    const d = await r.json();
    if (!r.ok || !d.url) {
      if (!silent) setError(d.error ?? "No se pudo abrir el archivo");
      return null;
    }
    urlCache.set(file.id, { url: d.url, expiresAt: Date.now() + 290_000 });
    return d.url;
  }, []);

  const prefetch = (file: FileItem) => {
    if (urlCache.has(file.id)) return;
    void fetchUrl(file, true);
  };

  const download = async (file: FileItem) => {
    const url = await fetchUrl(file);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const openFile = async (file: FileItem) => {
    if (!isPreviewable(file.mimeType)) { await download(file); return; }
    const cached = urlCache.get(file.id);
    if (cached && cached.expiresAt > Date.now() + 10_000) {
      setPreview({ url: cached.url, name: file.name, mimeType: file.mimeType });
      return;
    }
    // Abre el modal al instante y rellena el enlace cuando llega.
    setPreview({ url: null, name: file.name, mimeType: file.mimeType });
    const url = await fetchUrl(file);
    if (url) setPreview((p) => (p && p.name === file.name ? { ...p, url } : p));
    else setPreview(null);
  };

  const thumbUrl = useCallback((f: FileItem) => fetchUrl(f, true), [fetchUrl]);

  const folderActions = (f: Folder) => (
    <>
      <button
        onClick={() => { setRename({ type: "folder", id: f.id, name: f.name }); setRenameValue(f.name); }}
        className="rounded-lg p-1.5 text-[#64748B] transition hover:bg-[#F1F5F9]"
        aria-label={`Renombrar ${f.name}`}
      >
        <MdEdit size={17} />
      </button>
      {f.canDelete && (
        <button
          onClick={() => setConfirmDelete({ type: "folder", id: f.id, name: f.name })}
          className="rounded-lg p-1.5 text-[#DC2626] transition hover:bg-[#FEE2E2]"
          aria-label={`Eliminar ${f.name}`}
        >
          <MdDelete size={17} />
        </button>
      )}
    </>
  );

  const fileActions = (f: FileItem) => (
    <>
      <button
        onClick={() => download(f)}
        className="rounded-lg p-1.5 text-[#64748B] transition hover:bg-[#F1F5F9]"
        aria-label={`Descargar ${f.name}`}
      >
        <MdDownload size={17} />
      </button>
      <button
        onClick={() => { setRename({ type: "file", id: f.id, name: f.name }); setRenameValue(f.name); }}
        className="rounded-lg p-1.5 text-[#64748B] transition hover:bg-[#F1F5F9]"
        aria-label={`Renombrar ${f.name}`}
      >
        <MdEdit size={17} />
      </button>
      {f.canDelete && (
        <button
          onClick={() => setConfirmDelete({ type: "file", id: f.id, name: f.name })}
          className="rounded-lg p-1.5 text-[#DC2626] transition hover:bg-[#FEE2E2]"
          aria-label={`Eliminar ${f.name}`}
        >
          <MdDelete size={17} />
        </button>
      )}
    </>
  );

  const large = view === "gallery";
  // Acciones flotantes: visibles al pasar el ratón, siempre en táctil.
  const floating = "absolute right-1.5 top-1.5 flex gap-0.5 rounded-xl bg-white/95 p-0.5 opacity-0 shadow-sm transition group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100";

  const empty = !data.folders.length && !data.files.length;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Catálogo</p>
          <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Material Comercial</h1>
          <p className="mt-0.5 text-sm text-[#64748B]">Carpetas y archivos compartidos del equipo comercial</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setNewFolder(""); setNewFolderPrivate(false); }}
            className="flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-black text-[#1A1A1A] transition hover:bg-[#F8FAFC]"
          >
            <MdCreateNewFolder size={18} /> Nueva carpeta
          </button>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-xl bg-[#27B1B8] px-4 py-2.5 text-sm font-black text-white shadow-[0_2px_8px_rgba(39,177,184,0.3)] transition hover:bg-[#1F9AA0] disabled:opacity-60"
          >
            <MdUploadFile size={18} /> {uploading ? "Subiendo…" : "Subir archivos"}
          </button>
          <input ref={inputRef} type="file" multiple hidden onChange={(e) => upload(e.target.files)} />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-1 text-sm font-semibold text-[#64748B]">
        <button onClick={() => setFolderId(null)} className="flex items-center gap-1 rounded-lg px-2 py-1 transition hover:bg-[#F1F5F9] hover:text-[#1A1A1A]">
          <MdHome size={16} /> Inicio
        </button>
        {data.breadcrumb.map((c) => (
          <span key={c.id} className="flex items-center gap-1">
            <MdChevronRight size={16} className="text-[#CBD5E1]" />
            <button onClick={() => setFolderId(c.id)} className="rounded-lg px-2 py-1 transition hover:bg-[#F1F5F9] hover:text-[#1A1A1A]">
              {c.name}
            </button>
          </span>
        ))}
      </div>
        <div role="group" aria-label="Vista" className="flex gap-0.5 rounded-xl border border-[#E2E8F0] bg-white p-0.5">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => changeView(v.id)}
              aria-pressed={view === v.id}
              aria-label={`Vista ${v.label}`}
              title={v.label}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-black transition ${
                view === v.id ? "bg-[#27B1B8] text-white" : "text-[#64748B] hover:bg-[#F1F5F9]"
              }`}
            >
              {v.icon} <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>
      </div>

      {uploading && uploadingFile && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#BAE6E8] bg-[#F0FDFA] px-4 py-3 text-sm font-semibold text-[#0C535B]">
          <div className="h-4 w-4 flex-none animate-spin rounded-full border-2 border-[#27B1B8] border-t-transparent" />
          Subiendo {uploadingFile}…
        </div>
      )}

      {error && !rename && !confirmDelete && newFolder === null && (
        <div className="mb-4 rounded-xl bg-[#FEE2E2] px-3 py-2 text-xs font-semibold text-[#DC2626]">{error}</div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#27B1B8] border-t-transparent" />
        </div>
      ) : empty ? (
        <div className="rounded-2xl border border-dashed border-[#E2E8F0] bg-white p-10 text-center text-sm text-[#94A3B8]">
          <MdFolder size={28} className="mx-auto mb-2 text-[#CBD5E1]" />
          Carpeta vacía. Sube archivos o crea una subcarpeta.
        </div>
      ) : view !== "list" ? (
        <div className={`grid gap-3 ${large ? "grid-cols-[repeat(auto-fill,minmax(210px,1fr))]" : "grid-cols-[repeat(auto-fill,minmax(120px,1fr))]"}`}>
          {data.folders.map((f) => (
            <div key={f.id} className={`group relative rounded-2xl border p-2 transition ${selected === f.id ? "border-[#27B1B8] bg-[#F0FDFA]" : "border-transparent hover:border-[#E2E8F0] hover:bg-white"}`}>
              <button onClick={() => pick(f.id, () => setFolderId(f.id))} className="block w-full text-center">
                <div className={`relative flex items-center justify-center rounded-xl bg-[#FFFBEB] ${large ? "aspect-[4/3]" : "aspect-square"}`}>
                  <MdFolder size={large ? 72 : 56} className="text-[#F59E0B]" />
                  {f.isPrivate && (
                    <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#64748B] shadow-sm">
                      <MdLock size={11} /> Privada
                    </span>
                  )}
                </div>
                <p className="mt-2 line-clamp-2 break-words text-xs font-bold text-[#1A1A1A]">{f.name}</p>
                {large && <p className="mt-0.5 text-[11px] text-[#94A3B8]">{new Date(f.createdAt).toLocaleDateString("es-CO")}</p>}
              </button>
              <div className={floating}>{folderActions(f)}</div>
            </div>
          ))}
          {data.files.map((f) => (
            <div key={f.id} className={`group relative rounded-2xl border p-2 transition ${selected === f.id ? "border-[#27B1B8] bg-[#F0FDFA]" : "border-transparent hover:border-[#E2E8F0] hover:bg-white"}`}>
              <button
                onClick={() => pick(f.id, () => openFile(f))}
                onMouseEnter={() => prefetch(f)}
                onFocus={() => prefetch(f)}
                className="block w-full text-center"
              >
                <div className={`relative overflow-hidden rounded-xl border border-[#F1F5F9] bg-[#F8FAFC] ${large ? "aspect-[4/3]" : "aspect-square"}`}>
                  <Thumb file={f} getUrl={thumbUrl} iconSize={large ? 56 : 44} />
                  {extOf(f.name) && (
                    <span className="absolute bottom-1.5 left-1.5 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-black tracking-widest text-[#475569] shadow-sm">
                      {extOf(f.name)}
                    </span>
                  )}
                </div>
                <p className="mt-2 line-clamp-2 break-words text-xs font-semibold text-[#1A1A1A]">{f.name}</p>
                {large && (
                  <p className="mt-0.5 text-[11px] text-[#94A3B8]">
                    {formatSize(f.size)} · {new Date(f.createdAt).toLocaleDateString("es-CO")}
                  </p>
                )}
              </button>
              <div className={floating}>{fileActions(f)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="bg-[#F8FAFC] text-left text-xs font-black uppercase tracking-widest text-[#94A3B8]">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="hidden px-4 py-3 sm:table-cell">Tamaño</th>
                <th className="hidden px-4 py-3 sm:table-cell">Fecha</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {data.folders.map((f) => (
                <tr key={f.id} className="transition hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3">
                    <button onClick={() => setFolderId(f.id)} className="flex items-center gap-2 font-bold text-[#1A1A1A]">
                      <MdFolder size={20} className="text-[#F59E0B]" /> {f.name}
                      {f.isPrivate && (
                        <span className="flex items-center gap-1 rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#64748B]">
                          <MdLock size={11} /> Privada
                        </span>
                      )}
                    </button>
                  </td>
                  <td className="hidden px-4 py-3 text-[#94A3B8] sm:table-cell">—</td>
                  <td className="hidden px-4 py-3 text-[#64748B] sm:table-cell">{new Date(f.createdAt).toLocaleDateString("es-CO")}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {folderActions(f)}
                    </div>
                  </td>
                </tr>
              ))}
              {data.files.map((f) => (
                <tr key={f.id} className="transition hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openFile(f)}
                      onMouseEnter={() => prefetch(f)}
                      onFocus={() => prefetch(f)}
                      className="flex items-center gap-2 text-left font-semibold text-[#1A1A1A]"
                    >
                      <span className="flex h-9 w-9 flex-none items-center justify-center overflow-hidden rounded-lg border border-[#F1F5F9] bg-[#F8FAFC]">
                        <Thumb file={f} getUrl={thumbUrl} iconSize={20} />
                      </span>
                      {f.name}
                    </button>
                  </td>
                  <td className="hidden px-4 py-3 text-[#64748B] sm:table-cell">{formatSize(f.size)}</td>
                  <td className="hidden px-4 py-3 text-[#64748B] sm:table-cell">{new Date(f.createdAt).toLocaleDateString("es-CO")}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {fileActions(f)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {newFolder !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h2 className="text-lg font-black text-[#1A1A1A]">Nueva carpeta</h2>
            <input
              autoFocus
              value={newFolder}
              onChange={(e) => setNewFolder(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createFolder()}
              placeholder="Nombre de la carpeta"
              className="mt-4 w-full rounded-xl border border-[#E2E8F0] px-3 py-2.5 text-sm outline-none focus:border-[#27B1B8]"
            />

            <p className="mt-4 text-xs font-black uppercase tracking-widest text-[#94A3B8]">Quién puede verla</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                { value: false, label: "Todo el equipo", hint: "Cualquiera con acceso al módulo", icon: <MdGroup size={18} /> },
                { value: true, label: "Solo yo", hint: "Y los superadmin", icon: <MdLock size={18} /> },
              ].map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setNewFolderPrivate(opt.value)}
                  aria-pressed={newFolderPrivate === opt.value}
                  className={`rounded-xl border p-3 text-left transition ${
                    newFolderPrivate === opt.value
                      ? "border-[#27B1B8] bg-[#F0FDFA]"
                      : "border-[#E2E8F0] hover:bg-[#F8FAFC]"
                  }`}
                >
                  <span className={newFolderPrivate === opt.value ? "text-[#27B1B8]" : "text-[#94A3B8]"}>{opt.icon}</span>
                  <span className="mt-1 block text-sm font-black text-[#1A1A1A]">{opt.label}</span>
                  <span className="block text-[11px] leading-tight text-[#64748B]">{opt.hint}</span>
                </button>
              ))}
            </div>

            {error && <p className="mt-2 text-xs font-semibold text-[#DC2626]">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => { setNewFolder(null); setError(null); }} className="rounded-xl px-4 py-2 text-sm font-black text-[#64748B]">Cancelar</button>
              <button onClick={createFolder} disabled={saving} className="rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-black text-white disabled:opacity-60">Crear</button>
            </div>
          </div>
        </div>
      )}

      {rename && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h2 className="text-lg font-black text-[#1A1A1A]">Renombrar</h2>
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyRename()}
              className="mt-4 w-full rounded-xl border border-[#E2E8F0] px-3 py-2.5 text-sm outline-none focus:border-[#27B1B8]"
            />
            {error && <p className="mt-2 text-xs font-semibold text-[#DC2626]">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => { setRename(null); setError(null); }} className="rounded-xl px-4 py-2 text-sm font-black text-[#64748B]">Cancelar</button>
              <button onClick={applyRename} disabled={saving} className="rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-black text-white disabled:opacity-60">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPreview(null)}>
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="truncate text-sm font-black text-[#1A1A1A]">{preview.name}</h2>
              <button onClick={() => setPreview(null)} className="rounded-lg p-1.5 text-[#64748B] transition hover:bg-[#F1F5F9]" aria-label="Cerrar">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              {!preview.url ? (
                <div className="flex h-[75vh] items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#27B1B8] border-t-transparent" />
                </div>
              ) : preview.mimeType?.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.url} alt={preview.name} className="mx-auto max-h-[75vh] w-auto rounded-lg object-contain" />
              ) : (
                <iframe src={preview.url} title={preview.name} className="h-[75vh] w-full rounded-lg" />
              )}
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h2 className="text-lg font-black text-[#1A1A1A]">Eliminar</h2>
            <p className="mt-2 text-sm text-[#64748B]">
              {confirmDelete.type === "folder"
                ? `Se eliminará "${confirmDelete.name}" con todo su contenido. No se puede deshacer.`
                : `Se eliminará "${confirmDelete.name}". No se puede deshacer.`}
            </p>
            {error && <p className="mt-2 text-xs font-semibold text-[#DC2626]">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => { setConfirmDelete(null); setError(null); }} className="rounded-xl px-4 py-2 text-sm font-black text-[#64748B]">Cancelar</button>
              <button onClick={remove} disabled={saving} className="rounded-xl bg-[#DC2626] px-4 py-2 text-sm font-black text-white disabled:opacity-60">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
