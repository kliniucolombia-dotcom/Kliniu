"use client";
import { useEffect, useState } from "react";
import { MdDescription, MdDownload } from "react-icons/md";

type EmployeeDocument = {
  id: string;
  category: string;
  name: string;
  fileUrl: string;
  fileName: string;
  createdAt: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  CONTRATO: "Contrato",
  CERTIFICADO: "Certificado",
  COMPROBANTE_PAGO: "Comprobante de pago",
  OTRO: "Otro",
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

export default function DocumentosPage() {
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/rrhh-local/documents");
      if (res.ok) setDocuments(await res.json());
      else setError("No fue posible cargar tus documentos");
      setLoading(false);
    })();
  }, []);

  const view = async (fileUrl: string) => {
    const res = await fetch(`/api/rrhh-local/time-off/upload?path=${encodeURIComponent(fileUrl)}`);
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) window.open(data.url, "_blank");
    else setError(data.error || "No fue posible abrir el documento");
  };

  if (loading) return <div className="p-6 text-sm text-[#64748B]">Cargando…</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E6FAFB] text-[#27B1B8]">
          <MdDescription size={20} />
        </div>
        <div>
          <h1 className="text-xl font-black text-[#1A1A1A]">Mis documentos</h1>
          <p className="text-xs text-[#64748B]">Contratos, certificados y comprobantes que RRHH ha compartido contigo</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
        <table className="w-full min-w-[500px] text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] text-left text-xs font-bold text-[#64748B]">
              <th className="p-3">Nombre</th>
              <th className="p-3">Categoría</th>
              <th className="p-3">Fecha</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {documents.map((d) => (
              <tr key={d.id} className="border-b border-[#F1F5F9]">
                <td className="p-3 font-bold text-[#1A1A1A]">{d.name}</td>
                <td className="p-3">{CATEGORY_LABELS[d.category] ?? d.category}</td>
                <td className="p-3 text-[#64748B]">{fmt(d.createdAt)}</td>
                <td className="p-3">
                  <button onClick={() => view(d.fileUrl)}
                    className="flex items-center gap-1 text-xs font-bold text-[#27B1B8] hover:underline">
                    <MdDownload size={14} /> Ver
                  </button>
                </td>
              </tr>
            ))}
            {documents.length === 0 && (
              <tr><td className="p-3 text-[#94A3B8]" colSpan={4}>Sin documentos compartidos todavía.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
