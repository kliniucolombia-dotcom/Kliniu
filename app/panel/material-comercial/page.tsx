"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  MdFolder, MdCreateNewFolder, MdUploadFile, MdDelete, MdEdit, MdDownload,
  MdChevronRight, MdInsertDriveFile, MdImage, MdPictureAsPdf, MdMovie, MdHome, MdLock, MdGroup,
} from "react-icons/md";

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

function fileIcon(mime: string | null) {
  if (mime?.startsWith("image/")) return <MdImage size={20} className="text-[#27B1B8]" />;
  if (mime?.startsWith("video/")) return <MdMovie size={20} className="text-[#8B5CF6]" />;
  if (mime === "application/pdf") return <MdPictureAsPdf size={20} className="text-[#DC2626]" />;
  return <MdInsertDriveFile size={20} className="text-[#94A3B8]" />;
}

export default function MaterialComercialPage() {
  const [folderId, setFolderId] = useState<string | null>(null);
  const [data, setData] = useState<Listing>({ breadcrumb: [], folders: [], files: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newFolder, setNewFolder] = useState<string | null>(null);
  const [newFolderPrivate, setNewFolderPrivate] = useState(false);
  const [rename, setRename] = useState<Target | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Target | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => { load(); }, [load]);

  const createFolder = async () => {
    if (!newFolder?.trim()) return;
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
      for (const file of Array.from(files)) {
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

  const download = async (file: FileItem) => {
    const r = await fetch(`/api/panel/material/download?id=${file.id}`);
    const d = await r.json();
    if (!r.ok) { setError(d.error ?? "No se pudo abrir el archivo"); return; }
    window.open(d.url, "_blank", "noopener,noreferrer");
  };

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

      <div className="mb-4 flex flex-wrap items-center gap-1 text-sm font-semibold text-[#64748B]">
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
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[#F8FAFC] text-left text-xs font-black uppercase tracking-widest text-[#94A3B8]">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Tamaño</th>
                <th className="px-4 py-3">Fecha</th>
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
                  <td className="px-4 py-3 text-[#94A3B8]">—</td>
                  <td className="px-4 py-3 text-[#64748B]">{new Date(f.createdAt).toLocaleDateString("es-CO")}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
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
                    </div>
                  </td>
                </tr>
              ))}
              {data.files.map((f) => (
                <tr key={f.id} className="transition hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3">
                    <button onClick={() => download(f)} className="flex items-center gap-2 text-left font-semibold text-[#1A1A1A]">
                      {fileIcon(f.mimeType)} {f.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-[#64748B]">{formatSize(f.size)}</td>
                  <td className="px-4 py-3 text-[#64748B]">{new Date(f.createdAt).toLocaleDateString("es-CO")}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
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
