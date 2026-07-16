"use client";
import { useEffect, useState } from "react";

type Vendedor = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  city: string | null;
  status: string;
  createdAt: string;
};

export default function VendedoresPage() {
  const [vendedores, setVendedores] = useState<Vendedor[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/rrhh-local/vendedores")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setVendedores(d.vendedores))
      .catch(() => setError("No fue posible cargar los vendedores"));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-black text-[#1A1A1A]">Vendedores</h1>
      <p className="mt-1 text-sm text-[#64748B]">
        Datos reales de Kliniu — equipo comercial con rol Vendedor, propio de este sistema.
      </p>

      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      {!vendedores && !error && <p className="mt-4 text-sm text-[#64748B]">Cargando…</p>}

      {vendedores && vendedores.length === 0 && (
        <p className="mt-4 text-sm text-[#64748B]">Aún no hay vendedores registrados.</p>
      )}

      {vendedores && vendedores.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-[#F8FAFC] text-xs font-bold text-[#64748B]">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Correo</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Ciudad</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {vendedores.map((v) => (
                <tr key={v.id} className="border-t border-[#E2E8F0]">
                  <td className="px-4 py-3 font-semibold text-[#1A1A1A]">{v.fullName}</td>
                  <td className="px-4 py-3 text-[#64748B]">{v.email}</td>
                  <td className="px-4 py-3 text-[#64748B]">{v.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-[#64748B]">{v.city ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        v.status === "ACTIVE"
                          ? "bg-[#E8FAFB] text-[#0C535B]"
                          : "bg-[#F1F5F9] text-[#64748B]"
                      }`}
                    >
                      {v.status === "ACTIVE" ? "Activo" : v.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
