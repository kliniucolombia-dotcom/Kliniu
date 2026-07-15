"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("Enlace inválido. Solicita uno nuevo desde la página de inicio de sesión.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const payload = (await response.json()) as { error?: string; message?: string };
    setIsSubmitting(false);

    if (!response.ok) {
      setError(payload.error || "No fue posible restablecer la contraseña.");
      return;
    }

    setSuccess(true);
  };

  return (
    <main className="flex min-h-[calc(100vh-88px)] items-center justify-center bg-white px-6 py-16">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#111]">
          Restablece tu <span className="text-[#27B1B8]">contraseña</span>
        </h1>

        {success ? (
          <div className="mt-6 rounded-xl border border-[#1f8b45]/20 bg-[#effaf2] px-5 py-4 text-sm font-medium text-[#1f6b39]">
            Contraseña actualizada.{" "}
            <Link href="/login" className="font-bold underline">
              Inicia sesión
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-[#6e7379]">
              Ingresa tu nueva contraseña.
            </p>

            <form noValidate onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[#333]">
                  Nueva contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="h-11 w-full rounded-xl border border-black/10 px-4 text-sm outline-none transition focus:border-[#27B1B8]"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-[#333]">
                  Confirma la contraseña
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu nueva contraseña"
                  className="h-11 w-full rounded-xl border border-black/10 px-4 text-sm outline-none transition focus:border-[#27B1B8]"
                />
              </div>

              {error && (
                <p className="rounded-xl border border-[#27B1B8]/20 bg-[#EAF8F6] px-4 py-3 text-sm font-medium text-[#0C535B]">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="h-11 w-full rounded-full bg-[#0C535B] text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Guardando..." : "Restablecer contraseña"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
