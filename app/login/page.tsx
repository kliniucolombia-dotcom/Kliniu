"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AccountEntryLoading from "../components/account-entry-loading";

type LoginFormState = {
  email: string;
  password: string;
};

type ToastState = {
  tone: "success" | "error";
  message: string;
} | null;

const GUEST_CART_STORAGE_KEY = "kliniu-cart";
const GUEST_CART_SYNC_KEY = "kliniu-cart-synced-user";

const initialState: LoginFormState = {
  email: "",
  password: "",
};

async function syncGuestCartAfterLogin(userId: string) {
  if (typeof window === "undefined") return;

  const storedCart = window.localStorage.getItem(GUEST_CART_STORAGE_KEY);
  if (!storedCart) {
    window.sessionStorage.setItem(`${GUEST_CART_SYNC_KEY}:${userId}`, "done");
    return;
  }

  try {
    const items = JSON.parse(storedCart);

    if (!Array.isArray(items) || items.length === 0) {
      window.localStorage.removeItem(GUEST_CART_STORAGE_KEY);
      window.sessionStorage.setItem(`${GUEST_CART_SYNC_KEY}:${userId}`, "done");
      return;
    }

    const response = await fetch("/api/cart/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items }),
    });

    if (!response.ok) {
      return;
    }

    window.localStorage.removeItem(GUEST_CART_STORAGE_KEY);
    window.sessionStorage.setItem(`${GUEST_CART_SYNC_KEY}:${userId}`, "done");
  } catch {
    window.localStorage.removeItem(GUEST_CART_STORAGE_KEY);
  }
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState<LoginFormState>(initialState);
  const [adminPin, setAdminPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [inlineError, setInlineError] = useState("");
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [pendingAdminUserId, setPendingAdminUserId] = useState<string | null>(null);
  const [isEnteringAccount, setIsEnteringAccount] = useState(false);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const [logoAnimationKey, setLogoAnimationKey] = useState(0);

  useEffect(() => {
    if (!toast) return;

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 2800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toast]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { id, value } = event.target;
    setForm((current) => ({ ...current, [id]: value }));
    setInvalidFields((current) => current.filter((field) => field !== id));
  };

  const triggerLogoError = () => {
    setLogoAnimationKey((current) => current + 1);
  };

  const validateForm = () => {
    const nextInvalidFields: string[] = [];

    if (!form.email.trim()) {
      nextInvalidFields.push("email");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextInvalidFields.push("email");
    }

    if (!form.password.trim()) {
      nextInvalidFields.push("password");
    }

    if (nextInvalidFields.length > 0) {
      setInvalidFields(nextInvalidFields);
      triggerLogoError();
      setInlineError(
        nextInvalidFields.includes("email") && nextInvalidFields.includes("password")
          ? "Llena bien el correo y la contraseña."
          : nextInvalidFields.includes("email")
            ? "Llena bien el correo electrónico."
            : "Ingresa bien la contraseña.",
      );
      setToast({
        tone: "error",
        message: "Revisa los campos marcados antes de continuar.",
      });
      return false;
    }

    return true;
  };

  const completeLogin = async (payload: {
    message?: string;
    user?: { id: string; role: "CUSTOMER" | "ADMIN" };
  }) => {
    setIsEnteringAccount(true);
    setForm(initialState);
    setAdminPin("");
    setShowAdminPinModal(false);
    setPendingAdminUserId(null);
    setInlineError("");
    setToast({
      tone: "success",
      message: payload.message || "Inicio de sesión correcto.",
    });

    const requestedPath = searchParams.get("next");
    const userId = payload.user?.id;
    const nextPath =
      payload.user?.role === "ADMIN"
        ? "/admin"
        : requestedPath === "/admin"
          ? "/mi-cuenta"
          : requestedPath || "/mi-cuenta";

    window.setTimeout(async () => {
      if (userId) {
        await syncGuestCartAfterLogin(userId);
      }
      router.push(nextPath);
      router.refresh();
    }, 500);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInlineError("");
    setToast(null);
    setInvalidFields([]);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const payload = (await response.json()) as {
      error?: string;
      message?: string;
      user?: { id: string; role: "CUSTOMER" | "ADMIN" };
      requiresAdminPin?: boolean;
    };

    setIsSubmitting(false);

    if (response.status === 202 && payload.requiresAdminPin && payload.user?.role === "ADMIN") {
      setPendingAdminUserId(payload.user.id);
      setShowAdminPinModal(true);
      setToast({
        tone: "success",
        message: payload.message || "Confirma el PIN de administrador para continuar.",
      });
      return;
    }

    if (!response.ok) {
      const message = payload.error || "No fue posible iniciar sesión.";
      setInlineError(message);
      triggerLogoError();
      setToast({ tone: "error", message });
      return;
    }

    await completeLogin(payload);
  };

  const handleAdminPinSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInlineError("");
    setToast(null);
    setIsSubmitting(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...form,
        adminPin,
      }),
    });

    const payload = (await response.json()) as {
      error?: string;
      message?: string;
      user?: { id: string; role: "CUSTOMER" | "ADMIN" };
    };

    setIsSubmitting(false);

    if (!response.ok) {
      const message = payload.error || "No fue posible validar el PIN.";
      setInlineError(message);
      triggerLogoError();
      setToast({ tone: "error", message });
      return;
    }

    await completeLogin(payload);
  };

  return (
    <main className="flex min-h-[calc(100vh-88px)] bg-white">
      {isEnteringAccount && (
        <AccountEntryLoading
          message="Entrando a tu cuenta"
          detail="Estamos validando tu acceso y cargando tu información."
        />
      )}

      {showAdminPinModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0f172a]/45 px-6 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-[1.8rem] border border-black/8 bg-white p-7 shadow-[0_30px_80px_rgba(15,23,42,0.28)]">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#27B1B8]">
              Validación extra
            </p>
            <h2 className="mt-3 text-2xl font-bold text-[#0C535B]">
              Ingresa el PIN de administrador
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Detectamos una cuenta administrativa. Para entrar al panel, confirma el código adicional.
            </p>

            <form onSubmit={handleAdminPinSubmit} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="adminPinModal"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  PIN extra
                </label>
                <input
                  id="adminPinModal"
                  type="password"
                  value={adminPin}
                  onChange={(event) => setAdminPin(event.target.value)}
                  placeholder="Ingresa el código"
                  autoFocus
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminPinModal(false);
                    setAdminPin("");
                    setPendingAdminUserId(null);
                  }}
                  className="flex-1 rounded-xl border border-[#0C535B]/20 px-4 py-3 font-semibold text-[#0C535B] transition-colors duration-200 hover:bg-[#0C535B] hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !pendingAdminUserId}
                  className="flex-1 rounded-xl bg-[#27B1B8] px-4 py-3 font-semibold text-white transition-colors duration-200 hover:bg-[#1E969B] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Validando..." : "Confirmar PIN"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed right-5 top-5 z-[80] w-[min(92vw,380px)]">
          <div
            className={`rounded-[1.4rem] border px-5 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.16)] backdrop-blur-sm ${
              toast.tone === "success"
                ? "border-[#1f8b45]/18 bg-[#effaf2] text-[#1f6b39]"
                : "border-[#27B1B8]/18 bg-[#EAF8F6] text-[#0C535B]"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em]">
                  {toast.tone === "success" ? "Correcto" : "Atención"}
                </p>
                <p className="mt-2 text-sm font-medium leading-6">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="text-lg leading-none opacity-60 transition-opacity duration-200 hover:opacity-100"
                aria-label="Cerrar notificación"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split layout */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 lg:w-1/2">
        <div className="w-full max-w-md">
          <h1 className="text-4xl font-extrabold tracking-tight text-[#111]">
            Accede a tu <span className="text-[#27B1B8]">cuenta</span>
          </h1>
          <p className="mt-2 text-sm text-[#6e7379]">
            Todo lo que necesitas para gestionar tu experiencia KLINIU.
          </p>

          {/* Tab toggle */}
          <div className="mt-6 flex border-b border-black/10">
            <span className="flex items-center gap-2 border-b-2 border-[#0C535B] pb-3 pr-6 text-sm font-bold text-[#0C535B]">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Iniciar sesión
            </span>
            <Link
              href="/registro"
              className="flex items-center gap-2 pb-3 pl-6 text-sm font-bold text-[#6e7379] transition-colors hover:text-[#27B1B8]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
              Crear cuenta
            </Link>
          </div>

          <form noValidate onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className={invalidFields.includes("email") ? "field-shake" : ""}>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#333]">
                Correo electrónico
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Ingresa tu correo electrónico"
                  className={`h-11 w-full rounded-xl border px-4 pr-10 text-sm outline-none transition focus:border-[#27B1B8] ${
                    invalidFields.includes("email") ? "border-[#27B1B8] bg-[#EFFAFA]" : "border-black/10"
                  }`}
                />
                <svg viewBox="0 0 24 24" className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#aaa]" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
            </div>

            <div className={invalidFields.includes("password") ? "field-shake" : ""}>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-[#333]">
                  Contraseña
                </label>
                <Link href="/registro" className="text-xs text-[#27B1B8] hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Ingresa tu contraseña"
                className={`h-11 w-full rounded-xl border px-4 text-sm outline-none transition focus:border-[#27B1B8] ${
                  invalidFields.includes("password") ? "border-[#27B1B8] bg-[#EFFAFA]" : "border-black/10"
                }`}
              />
            </div>

            {inlineError && (
              <p className="rounded-xl border border-[#27B1B8]/20 bg-[#EAF8F6] px-4 py-3 text-sm font-medium text-[#0C535B]">
                {inlineError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 w-full rounded-full bg-[#0C535B] text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Ingresando..." : "Ingresar a mi cuenta"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[#6e7379]">
            ¿No tienes cuenta?{" "}
            <Link href="/registro" className="font-bold text-[#27B1B8] hover:underline">
              Crear una cuenta
            </Link>
          </p>
        </div>
      </div>

      {/* Right side — account banner */}
      <div className="hidden overflow-hidden bg-[#faf5f0] lg:flex lg:w-1/2 lg:items-center lg:justify-center">
        <div className="relative h-full w-full">
          <Image
            src="/account-access-banner.png"
            alt="Foca Kliniu dando la bienvenida a tu cuenta"
            fill
            priority
            sizes="50vw"
            className="object-cover object-center"
          />
        </div>
      </div>
    </main>
  );
}
