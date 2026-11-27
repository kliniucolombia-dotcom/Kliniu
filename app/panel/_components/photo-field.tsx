"use client";
import { useState } from "react";
import { MdDeleteOutline, MdPhotoCamera } from "react-icons/md";
import { compressPhoto } from "@/app/conductor/[token]/photo";

// Sube una foto (comprimida en el navegador) a una ruta */upload y devuelve su URL; muestra miniatura + Quitar.
export function PhotoField({ uploadUrl, alt, value, onChange, onError }: { uploadUrl: string; alt: string; value: string; onChange: (url: string) => void; onError: (msg: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", await compressPhoto(file));
      const res = await fetch(uploadUrl, { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return onError(json.error ?? "No fue posible subir la foto.");
      onChange(json.url);
    } catch (e) {
      onError(e instanceof Error ? e.message : "No fue posible subir la foto.");
    } finally {
      setUploading(false);
    }
  };
  if (value) {
    return (
      <div className="flex items-center gap-3">
        <a href={value} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={alt} className="h-16 w-16 rounded-lg border border-[#E2E8F0] object-cover" />
        </a>
        <button type="button" onClick={() => onChange("")} className="inline-flex items-center gap-1 text-sm font-semibold text-[#DC2626] hover:underline">
          <MdDeleteOutline size={16} /> Quitar
        </button>
      </div>
    );
  }
  return (
    <label className={`flex h-[42px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#CBD5E1] px-3 text-sm font-semibold text-[#0C535B] hover:bg-[#F8FAFC] ${uploading ? "pointer-events-none opacity-60" : ""}`}>
      <MdPhotoCamera size={18} />
      {uploading ? "Subiendo…" : "Subir foto"}
      <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
    </label>
  );
}
