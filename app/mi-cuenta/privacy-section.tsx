"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { MdDeleteOutline, MdDownload, MdWarningAmber } from "react-icons/md";

// Derechos del titular: descargar sus datos y eliminar la cuenta.
export default function PrivacySection() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deleting) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, deleting]);

  const close = () => {
    if (deleting) return;
    setOpen(false);
    setPassword("");
    setError("");
  };

  const handleDelete = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDeleting(true);
    setError("");

    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(payload.error || "No fue posible eliminar la cuenta.");
        setDeleting(false);
        return;
      }

      window.location.replace("/");
    } catch {
      setError("No fue posible eliminar la cuenta.");
      setDeleting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-black/8 bg-white p-6">
      <h2 className="text-lg font-bold text-[#111]">Privacidad y datos</h2>
      <p className="mt-1 text-sm text-[#6e7379]">
        Puedes descargar una copia de tu información o eliminar tu cuenta cuando quieras.
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <a
          href="/api/account/export"
          download
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e2e8e8] bg-white px-4 py-3 text-sm font-semibold text-[#0C535B] hover:bg-[#f7fbfb]"
        >
          <MdDownload size={18} />
          Descargar mis datos
        </a>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#f3c7c7] bg-white px-4 py-3 text-sm font-semibold text-[#b42318] hover:bg-[#fef3f2]"
        >
          <MdDeleteOutline size={18} />
          Eliminar mi cuenta
        </button>
      </div>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            onClick={close}
          >
            <form
              onSubmit={handleDelete}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fef3f2] text-[#b42318]">
                  <MdWarningAmber size={22} />
                </div>
                <div className="min-w-0">
                  <h3 id="delete-account-title" className="font-black text-[#1A1A1A]">
                    Eliminar mi cuenta
                  </h3>
                  <p className="mt-1 text-sm text-[#64748B]">Esta acción no se puede deshacer.</p>
                </div>
              </div>

              <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm leading-6 text-[#4b5158]">
                <li>Se borran tu nombre, correo, teléfono, direcciones, carrito y puntos.</li>
                <li>Ya no podrás iniciar sesión con esta cuenta.</li>
                <li>
                  Tus pedidos se conservan en nuestros registros por obligación contable, sin acceso desde una cuenta.
                </li>
              </ul>

              <label htmlFor="delete-account-password" className="mt-5 block text-sm font-semibold text-[#111]">
                Escribe tu contraseña para confirmar
              </label>
              <input
                id="delete-account-password"
                type="password"
                autoComplete="current-password"
                autoFocus
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#E2E8F0] px-4 py-3 text-sm text-[#111] outline-none focus:border-[#27B1B8]"
              />

              {error && (
                <p role="alert" className="mt-3 rounded-xl bg-[#fef3f2] px-4 py-2.5 text-sm font-medium text-[#b42318]">
                  {error}
                </p>
              )}

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={close}
                  disabled={deleting}
                  className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={deleting || !password}
                  className="flex-1 rounded-xl bg-[#b42318] py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleting ? "Eliminando..." : "Eliminar cuenta"}
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )}
    </section>
  );
}
