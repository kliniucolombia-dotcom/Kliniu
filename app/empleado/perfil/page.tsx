"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MdPerson, MdBadge, MdEmail, MdPhone, MdDownload, MdFolderOpen, MdEdit, MdCameraAlt, MdClose, MdVerified, MdCheckCircle } from "react-icons/md";
import { fmtDateOnly } from "@/lib/date";

type MeResponse = {
  fullName: string;
  email: string;
  phone: string | null;
  city: string | null;
  avatarUrl: string | null;
  jobTitle: string;
  departmentName: string | null;
  employeeCode: string;
  hireDate: string;
  contractType: string;
  status: string;
  eps: string | null;
  afp: string | null;
  arl: string | null;
};

type EmployeeDocument = {
  id: string;
  category: string;
  name: string;
  fileUrl: string;
  fileName: string;
  createdAt: string;
};

const CONTRACT_LABELS: Record<string, string> = {
  INDEFINITE: "Término indefinido",
  FIXED_TERM: "Término fijo",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  ON_LEAVE: "En licencia",
  TERMINATED: "Retirado",
};

const CATEGORY_LABELS: Record<string, string> = {
  CONTRATO: "Contrato",
  CERTIFICADO: "Certificado",
  COMPROBANTE_PAGO: "Comprobante de pago",
  OTRO: "Otro",
};

const TABS = ["Información personal", "Información laboral", "Información de contacto"] as const;

function fmt(d: string) {
  return fmtDateOnly(d, { day: "numeric", month: "long", year: "numeric" });
}

function seniority(hireDate: string) {
  const start = new Date(hireDate);
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  months = Math.max(0, months);
  return `${Math.floor(months / 12)} años, ${months % 12} meses`;
}

export default function PerfilPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS[0]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ phone: "", city: "" });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // El aviso de éxito se oculta solo a los 4 segundos.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const load = async () => {
    const [meRes, docsRes] = await Promise.all([
      fetch("/api/empleado/me"),
      fetch("/api/rrhh-local/documents"),
    ]);
    if (meRes.ok) {
      const data = await meRes.json();
      setMe(data);
      setForm({ phone: data.phone ?? "", city: data.city ?? "" });
    }
    if (docsRes.ok) setDocuments(await docsRes.json());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const viewDoc = async (fileUrl: string) => {
    const res = await fetch(`/api/rrhh-local/time-off/upload?path=${encodeURIComponent(fileUrl)}`);
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) window.open(data.url, "_blank");
  };

  const saveProfile = async () => {
    setSaving(true);
    setError("");
    const res = await fetch("/api/empleado/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setEditing(false);
      setToast("Perfil actualizado");
      await load();
    } else {
      setError("No fue posible guardar los cambios");
    }
    setSaving(false);
  };

  const uploadAvatar = async (file: File) => {
    setUploadingAvatar(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/empleado/avatar", { method: "POST", body: fd });
    if (res.ok) {
      const data = await res.json();
      setMe((prev) => (prev ? { ...prev, avatarUrl: data.avatarUrl } : prev));
      setToast("Foto de perfil actualizada");
      // Avisa al layout para que refresque el avatar del encabezado sin recargar.
      window.dispatchEvent(new CustomEvent("empleado:avatar-updated", { detail: data.avatarUrl }));
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No fue posible subir la foto");
    }
    setUploadingAvatar(false);
  };

  if (loading) return <div className="p-6 text-sm text-[#64748B]">Cargando…</div>;
  if (!me) return <div className="p-6 text-sm text-red-500">No fue posible cargar tu perfil.</div>;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-black text-[#1A1A1A]">Mi perfil</h1>
        <p className="text-xs text-[#64748B]">Consulta tu información personal y laboral.</p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-5 rounded-xl border border-[#E2E8F0] bg-white p-5">
            <div className="shrink-0">
              {me.avatarUrl ? (
                <img src={me.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E6FAFB] text-xl font-black text-[#27B1B8]">
                  {me.fullName.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <h2 className="text-lg font-black text-[#1A1A1A]">{me.fullName}</h2>
              <p className="text-sm text-[#64748B]">{me.jobTitle}</p>
            </div>
            <button onClick={() => setEditing(true)}
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-[#27B1B8] px-3 py-1.5 text-xs font-bold text-[#27B1B8] hover:bg-[#E6FAFB]">
              <MdEdit size={14} /> Editar perfil
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-5 rounded-xl border border-[#E2E8F0] bg-white p-5">
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <MdBadge className="text-[#94A3B8]" size={16} />
                <div>
                  <p className="text-[10px] font-bold uppercase text-[#94A3B8]">Cédula</p>
                  <p className="text-[#1A1A1A]">{me.employeeCode}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MdEmail className="text-[#94A3B8]" size={16} />
                <div>
                  <p className="text-[10px] font-bold uppercase text-[#94A3B8]">Correo</p>
                  <p className="text-[#1A1A1A]">{me.email}</p>
                </div>
              </div>
              {me.phone && (
                <div className="flex items-center gap-2">
                  <MdPhone className="text-[#94A3B8]" size={16} />
                  <div>
                    <p className="text-[10px] font-bold uppercase text-[#94A3B8]">Teléfono</p>
                    <p className="text-[#1A1A1A]">{me.phone}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto border-b border-[#E2E8F0]">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`whitespace-nowrap border-b-2 px-1 pb-2 text-sm font-bold ${
                  tab === t ? "border-[#27B1B8] text-[#27B1B8]" : "border-transparent text-[#64748B]"
                }`}>
                {t}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
              <h3 className="mb-3 text-sm font-black text-[#1A1A1A]">{tab}</h3>
              {tab === "Información personal" && (
                <div className="space-y-2 text-sm">
                  <Row label="EPS" value={me.eps ?? "—"} />
                  <Row label="Fondo de pensiones" value={me.afp ?? "—"} />
                  <Row label="ARL" value={me.arl ?? "—"} />
                </div>
              )}
              {tab === "Información laboral" && (
                <div className="space-y-2 text-sm">
                  <Row label="Cargo" value={me.jobTitle} />
                  <Row label="Departamento" value={me.departmentName ?? "—"} />
                  <Row label="Tipo de contrato" value={CONTRACT_LABELS[me.contractType] ?? me.contractType} />
                  <Row label="Estado" value={STATUS_LABELS[me.status] ?? me.status} />
                  <Row label="Fecha de ingreso" value={fmt(me.hireDate)} />
                  <Row label="Antigüedad" value={seniority(me.hireDate)} />
                </div>
              )}
              {tab === "Información de contacto" && (
                <div className="space-y-2 text-sm">
                  <Row label="Correo" value={me.email} />
                  <Row label="Teléfono" value={me.phone ?? "—"} />
                  <Row label="Ciudad" value={me.city ?? "—"} />
                </div>
              )}
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-[#F0FDFF] p-3 text-xs text-[#0E7490]">
                <MdPerson size={14} className="mt-0.5 shrink-0" />
                Si necesitas actualizar algún dato personal, por favor contacta a Recursos Humanos.
              </div>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
              <h3 className="mb-3 text-sm font-black text-[#1A1A1A]">Documentos cargados</h3>
              <div className="space-y-1">
                {documents.slice(0, 5).map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-2 border-b border-[#F1F5F9] py-2 text-sm last:border-b-0">
                    <div>
                      <p className="font-semibold text-[#1A1A1A]">{d.name || CATEGORY_LABELS[d.category]}</p>
                      <p className="text-xs text-[#94A3B8]">Actualizado el {new Date(d.createdAt).toLocaleDateString("es-CO")}</p>
                    </div>
                    <button onClick={() => viewDoc(d.fileUrl)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#27B1B8] hover:bg-[#E6FAFB]">
                      <MdDownload size={16} />
                    </button>
                  </div>
                ))}
                {documents.length === 0 && <p className="py-2 text-sm text-[#94A3B8]">Sin documentos cargados todavía.</p>}
              </div>
              <Link href="/empleado/documentos"
                className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] py-2 text-sm font-bold text-[#27B1B8] hover:bg-[#F8FAFC]">
                <MdFolderOpen size={16} /> Ver todos los documentos
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-[#E2E8F0] bg-white p-5">
          <h3 className="mb-2 text-sm font-black text-[#1A1A1A]">Resumen laboral</h3>
          <Row label="Cargo" value={me.jobTitle} />
          <Row label="Departamento" value={me.departmentName ?? "—"} />
          <Row label="Tipo de contrato" value={CONTRACT_LABELS[me.contractType] ?? me.contractType} />
          <Row label="Fecha de ingreso" value={fmt(me.hireDate)} />
          <Row label="Antigüedad" value={seniority(me.hireDate)} />
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-xl bg-[#16A34A] px-4 py-3 text-sm font-bold text-white shadow-lg">
          <MdCheckCircle size={18} /> {toast}
        </div>
      )}

      {showBanner && (
        <div className="flex items-center justify-between gap-4 rounded-xl bg-[#F0FDFF] p-4">
          <div className="flex items-start gap-3">
            <MdVerified className="mt-0.5 shrink-0 text-[#27B1B8]" size={20} />
            <div>
              <p className="text-sm font-black text-[#1A1A1A]">Mantén tu información actualizada</p>
              <p className="text-xs text-[#64748B]">Tu información personal y laboral debe estar siempre actualizada para garantizar procesos internos sin inconvenientes.</p>
            </div>
          </div>
          <button onClick={() => setShowBanner(false)} className="shrink-0 text-[#64748B] hover:text-[#1A1A1A]">
            <MdClose size={18} />
          </button>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditing(false)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-black text-[#1A1A1A]">Editar perfil</h3>
              <button onClick={() => setEditing(false)} className="text-[#64748B]"><MdClose size={18} /></button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-4 rounded-lg bg-[#F8FAFC] p-3">
                {me.avatarUrl ? (
                  <img src={me.avatarUrl} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#E6FAFB] text-base font-black text-[#27B1B8]">
                    {me.fullName.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#1A1A1A]">Foto de perfil</p>
                  <p className="text-[11px] text-[#94A3B8]">JPG, PNG o WEBP. Máx. 10 MB.</p>
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}
                    className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-[#27B1B8] px-2.5 py-1.5 text-[11px] font-bold text-[#27B1B8] hover:bg-[#E6FAFB] disabled:opacity-50">
                    <MdCameraAlt size={13} /> {uploadingAvatar ? "Subiendo…" : me.avatarUrl ? "Cambiar foto" : "Subir foto"}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = ""; }} />
                </div>
              </div>

              <label className="block text-xs font-bold text-[#64748B]">
                Teléfono
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs font-bold text-[#64748B]">
                Ciudad
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
              </label>
              <p className="text-[11px] text-[#94A3B8]">Datos laborales (cargo, salario, EPS, etc.) solo los edita Recursos Humanos.</p>
              <button onClick={saveProfile} disabled={saving}
                className="w-full rounded-lg bg-[#27B1B8] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-[#64748B]">{label}</span>
      <span className="text-right font-semibold text-[#1A1A1A]">{value}</span>
    </div>
  );
}
