"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { departamentosColombia, getCitiesForDepartment } from "@/lib/colombia-locations";

type AccountUser = {
  id: string;
  fullName: string;
  company: string | null;
  email: string;
  phone: string | null;
  department: string | null;
  city: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  createdAt: Date;
};

type AccountOrder = {
  id: string;
  status: "PENDING" | "PAID" | "CANCELLED";
  paymentStatus: "PENDING" | "PAID" | "FAILED";
  shippingStatus: "PENDING" | "PREPARING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  department: string;
  city: string;
  addressLine1: string;
  addressLine2: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  adminNotes: string | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  totalItems: number;
  subtotal: number;
  createdAt: Date;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
};

type ToastState = {
  tone: "success" | "error";
  message: string;
} | null;

type FormState = {
  fullName: string;
  company: string;
  email: string;
  phone: string;
  department: string;
  city: string;
  addressLine1: string;
  addressLine2: string;
  newPassword: string;
  confirmPassword: string;
};

type AccountPanel = "summary" | "details" | "orders" | "facturas";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatOrderDate(value: Date) {
  return new Date(value).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getOrderStatusLabel(status: AccountOrder["status"]) {
  if (status === "PAID") return "Pagado";
  if (status === "CANCELLED") return "Cancelado";
  return "Pendiente";
}

function getPaymentStatusLabel(status: AccountOrder["paymentStatus"]) {
  if (status === "PAID") return "Pago confirmado";
  if (status === "FAILED") return "Pago fallido";
  return "Pago pendiente";
}

function getShippingStatusLabel(status: AccountOrder["shippingStatus"]) {
  if (status === "PREPARING") return "En preparación";
  if (status === "SHIPPED") return "Enviado";
  if (status === "DELIVERED") return "Entregado";
  if (status === "CANCELLED") return "Envío cancelado";
  return "Pendiente de despacho";
}

function getShippingStatusClasses(status: AccountOrder["shippingStatus"]) {
  if (status === "DELIVERED") return "border-[#1f8b45]/18 bg-[#effaf2] text-[#1f6b39]";
  if (status === "SHIPPED") return "border-[#0C535B]/15 bg-[#eaf3f8] text-[#0C535B]";
  if (status === "PREPARING") return "border-[#27B1B8]/18 bg-[#EAF8F6] text-[#0C535B]";
  if (status === "CANCELLED") return "border-black/10 bg-[#f3f4f6] text-[#60656b]";
  return "border-black/8 bg-white text-[#6e7379]";
}

function getPaymentStatusClasses(status: AccountOrder["paymentStatus"]) {
  if (status === "PAID") return "border-[#1f8b45]/18 bg-[#effaf2] text-[#1f6b39]";
  if (status === "FAILED") return "border-[#27B1B8]/18 bg-[#EAF8F6] text-[#0C535B]";
  return "border-black/8 bg-white text-[#6e7379]";
}

function getOrderProgressStep(order: AccountOrder) {
  if (order.shippingStatus === "DELIVERED") return 3;
  if (order.shippingStatus === "SHIPPED") return 2;
  if (order.shippingStatus === "PREPARING") return 1;
  if (order.paymentStatus === "PAID" || order.status === "PAID") return 0;
  return -1;
}

function OrderProgressTimeline({ order }: { order: AccountOrder }) {
  const activeStep = getOrderProgressStep(order);
  const steps = [
    {
      label: "Pedido confirmado",
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3h9l3 3v15H6z" />
          <path d="M15 3v3h3" />
          <path d="M9 12h6" />
          <path d="M9 16h4" />
        </svg>
      ),
    },
    {
      label: "En preparación",
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3 4 7l8 4 8-4-8-4Z" />
          <path d="M4 7v10l8 4 8-4V7" />
          <path d="M12 11v10" />
        </svg>
      ),
    },
    {
      label: "Enviado",
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7h11v8H3z" />
          <path d="M14 10h3l4 3v2h-7z" />
          <circle cx="7.5" cy="17.5" r="1.5" />
          <circle cx="17.5" cy="17.5" r="1.5" />
        </svg>
      ),
    },
    {
      label: "Recibido",
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12 4 4L19 6" />
        </svg>
      ),
    },
  ];

  return (
    <div className="rounded-[1.2rem] border border-black/8 bg-white px-4 py-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b8d91]">
        Seguimiento del pedido
      </p>
      <div className="mt-5 overflow-x-auto">
        <div className="relative min-w-[620px] px-1 py-2">
          <div className="absolute left-[12.5%] right-[12.5%] top-8">
            <span className="block h-[4px] rounded-full bg-black/10" />
            <span
              className="absolute left-0 top-0 h-[4px] rounded-full bg-[#27B1B8] transition-all duration-300"
              style={{
                width:
                  activeStep < 0
                    ? "0%"
                    : `${(activeStep / (steps.length - 1)) * 100}%`,
              }}
            />
          </div>

          <div className="relative flex items-start justify-between gap-0">
            {steps.map((step, index) => {
              const isCompleted = activeStep >= 0 && index <= activeStep;
              const isCurrent = index === activeStep;

              return (
                <div
                  key={step.label}
                  className="relative flex min-w-[136px] flex-1 flex-col items-center text-center"
                >
                  <span
                    className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border ${
                      isCompleted
                        ? "border-[#27B1B8] bg-[#27B1B8] text-white"
                        : "border-black/10 bg-[#f8f8f7] text-[#8b8d91]"
                    } ${isCurrent ? "shadow-[0_10px_24px_rgba(39,177,184,0.2)]" : ""}`}
                  >
                    {step.icon}
                  </span>
                  <div className="mt-3">
                    <p className={`text-sm font-semibold ${isCompleted ? "text-[#0C535B]" : "text-[#8b8d91]"}`}>
                      {step.label}
                    </p>
                    {isCurrent && (
                      <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-[#27B1B8]">
                        Actual
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AccountProfileForm({
  user,
  orders,
}: {
  user: AccountUser;
  orders: AccountOrder[];
}) {
  const router = useRouter();
  const [activePanel, setActivePanel] = useState<AccountPanel>("summary");
  const [showFullOrderHistory, setShowFullOrderHistory] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    fullName: user.fullName,
    company: user.company || "",
    email: user.email,
    phone: user.phone || "",
    department: user.department || "",
    city: user.city || "",
    addressLine1: user.addressLine1 || "",
    addressLine2: user.addressLine2 || "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [inlineError, setInlineError] = useState("");

  type StoredPrize = { label: string; detail: string; code: string; expiresAt: number };
  const [prize, setPrize] = useState<StoredPrize | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [codeCopied, setCodeCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("kliniu_prize");
      if (!raw) return;
      const stored = JSON.parse(raw) as StoredPrize;
      if (stored.expiresAt > Date.now()) {
        setPrize(stored);
        setTimeLeft(Math.floor((stored.expiresAt - Date.now()) / 1000));
      } else {
        localStorage.removeItem("kliniu_prize");
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!prize) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setPrize(null);
          localStorage.removeItem("kliniu_prize");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [prize]);
  const cityOptions = useMemo(
    () => getCitiesForDepartment(form.department),
    [form.department],
  );

  const activeShipments = orders.filter((order) =>
    ["PREPARING", "SHIPPED"].includes(order.shippingStatus),
  ).length;
  const deliveredOrders = orders.filter(
    (order) => order.shippingStatus === "DELIVERED",
  ).length;
  const paidOrders = orders.filter((order) => order.paymentStatus === "PAID").length;
  const recentOrders = showFullOrderHistory ? orders : orders.slice(0, 3);
  const visibleSelectedOrderId = recentOrders.some(
    (order) => order.id === selectedOrderId,
  )
    ? selectedOrderId
    : null;
  const selectedOrder =
    recentOrders.find((order) => order.id === visibleSelectedOrderId) ?? null;

  const userInitials = user.fullName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const memberSince = new Date(user.createdAt).toLocaleDateString("es-CO", {
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = event.target;
    setForm((current) => {
      if (id === "department") {
        return { ...current, department: value, city: "" };
      }
      return { ...current, [id]: value };
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInlineError("");
    setToast(null);

    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      const message = "Las nuevas contraseñas no coinciden.";
      setInlineError(message);
      setToast({ tone: "error", message });
      return;
    }

    setIsSubmitting(true);

    const response = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const payload = (await response.json()) as {
      error?: string;
      message?: string;
    };

    setIsSubmitting(false);

    if (!response.ok) {
      const message = payload.error || "No fue posible actualizar la cuenta.";
      setInlineError(message);
      setToast({ tone: "error", message });
      return;
    }

    setForm((current) => ({ ...current, newPassword: "", confirmPassword: "" }));
    setToast({
      tone: "success",
      message: payload.message || "Cuenta actualizada correctamente.",
    });
    router.refresh();
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const navItems: Array<{ id: Exclude<AccountPanel, "details">; label: string; icon: React.ReactNode }> = [
    {
      id: "summary",
      label: "Inicio",
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      id: "orders",
      label: "Pedidos",
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3 4 7l8 4 8-4-8-4Z" />
          <path d="M4 7v10l8 4 8-4V7" />
          <path d="M12 11v10" />
        </svg>
      ),
    },
    {
      id: "facturas",
      label: "Facturas",
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
  ];

  const sidebarIsActive = (id: Exclude<AccountPanel, "details">) =>
    activePanel === id || (id === "summary" && activePanel === "details");

  return (
    <main className="flex min-h-[calc(100vh-88px)] bg-[#f8f8f7]">
      {/* Toast */}
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

      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 flex-col bg-white border-r border-black/8 px-5 py-8 sticky top-0 h-screen overflow-y-auto">
        {/* Avatar + user info */}
        <div className="flex flex-col items-center text-center px-2">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#0C535B] text-xl font-bold text-white">
            {userInitials}
          </div>
          <p className="mt-3 text-base font-bold text-[#111]">{user.fullName}</p>
          {user.company && (
            <p className="mt-0.5 text-sm text-[#6e7379]">{user.company}</p>
          )}
          <p className="mt-1 text-xs text-[#8b8d91]">Cliente desde {memberSince}</p>
        </div>

        <div className="mt-6 h-px bg-black/8" />

        {/* Nav links */}
        <nav className="mt-5 flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActivePanel(item.id)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors duration-200 ${
                sidebarIsActive(item.id)
                  ? "bg-[#0C535B] text-white"
                  : "text-[#5d6167] hover:bg-[#f0f4f5] hover:text-[#0C535B]"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}

          <Link
            href="/mi-cuenta/puntos"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[#5d6167] transition-colors duration-200 hover:bg-[#f0f4f5] hover:text-[#0C535B]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Mis Puntos
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[#5d6167] transition-colors duration-200 hover:bg-red-50 hover:text-red-600"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Cerrar sesión
          </button>
        </nav>

        {/* Help CTA */}
        <div className="mt-auto pt-8">
          <a
            href="https://wa.me/573104033476"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </a>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="lg:hidden fixed top-[88px] left-0 right-0 z-30 flex border-b border-black/8 bg-white px-4">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActivePanel(item.id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors duration-200 ${
              sidebarIsActive(item.id)
                ? "border-[#0C535B] text-[#0C535B]"
                : "border-transparent text-[#6e7379] hover:text-[#0C535B]"
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 min-w-0 px-5 pt-20 pb-16 lg:px-10 lg:pt-10 lg:pb-16">

        {/* — Inicio panel — */}
        {(activePanel === "summary") && (
          <div className="space-y-6 max-w-4xl">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-[#111] lg:text-3xl">
                Mi <span className="text-[#27B1B8]">cuenta</span>
              </h1>
              <p className="mt-1 text-sm text-[#6e7379]">
                Revisa y gestiona tu información personal y de envío.
              </p>
            </div>

            {/* Bono digital */}
            {(() => {
              const cardStyle: React.CSSProperties = {
                borderRadius: 20,
                background: "linear-gradient(135deg, #073F43 0%, #0C535B 60%, #1B9CA1 100%)",
                boxShadow: "0 20px 50px rgba(7,63,67,0.4)",
                overflow: "hidden",
              };

              if (!prize || timeLeft <= 0) return (
                <div style={cardStyle}>
                  <div style={{ padding: "24px 28px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 14, background: "linear-gradient(135deg,#FFD000,#FF6B00)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0, boxShadow: "0 8px 20px rgba(255,107,0,0.4)" }}>🎟️</div>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.26em", color: "#27B1B8", textTransform: "uppercase", margin: 0 }}>Bono de bienvenida</p>
                      <p style={{ fontSize: 18, fontWeight: 900, color: "#fff", margin: "4px 0 2px" }}>¡Gira la ruleta y gana un descuento!</p>
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", margin: 0 }}>Tu premio aparecerá aquí con una cuenta regresiva de 12 horas.</p>
                    </div>
                    <Link
                      href="/"
                      style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, background: "linear-gradient(90deg,#FF6B00,#FFD000)", padding: "10px 22px", fontSize: 13, fontWeight: 900, color: "#fff", textDecoration: "none", boxShadow: "0 8px 20px rgba(255,107,0,0.35)" }}
                    >
                      Ir a la ruleta
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </Link>
                  </div>
                </div>
              );

              const hh = String(Math.floor(timeLeft / 3600)).padStart(2, "0");
              const mm = String(Math.floor((timeLeft % 3600) / 60)).padStart(2, "0");
              const ss = String(timeLeft % 60).padStart(2, "0");
              const isShipping = prize.detail === "gratis";
              return (
                <div style={{ borderRadius: 20, overflow: "hidden", boxShadow: "0 24px 60px rgba(7,63,67,0.3)", position: "relative", maxWidth: 520 }}>
                  {/* Imagen de fondo */}
                  <div style={{ position: "relative" }}>
                    <img src="/tarjeta-bono.jpg" alt="" style={{ width: "100%", display: "block" }} />

                    {/* Overlay con descuento real (tapa el 15% del jpg) */}
                    <div style={{ position: "absolute", left: "6%", bottom: "4%", background: "rgba(7,63,67,0.82)", borderRadius: 18, padding: "10px 20px", backdropFilter: "blur(6px)", textAlign: "center", minWidth: 90 }}>
                      <p style={{ fontSize: isShipping ? 28 : 44, fontWeight: 900, color: "#fff", lineHeight: 1, margin: 0 }}>
                        {isShipping ? "🚚" : prize.label}
                      </p>
                      <p style={{ fontSize: 12, fontWeight: 700, color: "#BFEFF0", margin: "3px 0 0" }}>
                        {isShipping ? "envío gratis" : prize.detail}
                      </p>
                    </div>
                  </div>

                  {/* Franja inferior con código + timer + CTA */}
                  <div style={{ background: "#073F43", padding: "16px 24px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
                      {/* Código */}
                      <div style={{ display: "flex", flex: 1, minWidth: 200, gap: 8, alignItems: "center" }}>
                        <div style={{ flex: 1, border: "1.5px dashed rgba(39,177,184,0.5)", borderRadius: 10, padding: "8px 12px", fontFamily: "monospace", fontSize: 14, fontWeight: 800, letterSpacing: "0.1em", color: "#27B1B8", background: "rgba(255,255,255,0.05)" }}>
                          {prize.code}
                        </div>
                        <button type="button"
                          onClick={() => { navigator.clipboard.writeText(prize.code); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); }}
                          style={{ background: "#27B1B8", color: "#fff", border: "none", borderRadius: 10, padding: "9px 16px", fontSize: 12, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
                          {codeCopied ? "✓ Copiado" : "Copiar"}
                        </button>
                      </div>

                      {/* Timer */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>Vence en</p>
                        <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                          {[hh, mm, ss].map((unit, i) => (
                            <span key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                              <span style={{ background: "rgba(255,255,255,0.12)", borderRadius: 7, padding: "3px 8px", fontSize: 18, fontWeight: 900, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{unit}</span>
                              {i < 2 && <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 900 }}>:</span>}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* CTA */}
                      <Link href="/categorias"
                        style={{ display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 999, background: "linear-gradient(90deg,#FF6B00,#FFD000)", padding: "10px 20px", fontSize: 13, fontWeight: 900, color: "#fff", textDecoration: "none", boxShadow: "0 6px 18px rgba(255,107,0,0.4)", whiteSpace: "nowrap" }}>
                        Usar bono ahora →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })()}
            {/* 3 info cards */}
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {/* Información de cuenta */}
              <div className="flex flex-col rounded-2xl border border-black/8 bg-white p-6 shadow-[0_4px_16px_rgba(15,23,42,0.06)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF8F6]">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#0C535B]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <p className="font-semibold text-[#0C535B]">Información de cuenta</p>
                </div>
                <div className="mt-4 flex-1 space-y-1.5">
                  <p className="text-sm font-semibold text-[#111]">{user.fullName}</p>
                  <p className="text-sm text-[#6e7379]">{user.email}</p>
                  <p className="text-sm text-[#6e7379]">{user.phone || "Sin teléfono registrado"}</p>
                  {user.company && (
                    <p className="text-sm text-[#6e7379]">{user.company}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setActivePanel("details")}
                  className="mt-5 w-full rounded-xl border border-[#0C535B]/20 py-2.5 text-sm font-semibold text-[#0C535B] transition-colors duration-200 hover:bg-[#0C535B] hover:text-white"
                >
                  Editar información
                </button>
              </div>

              {/* Dirección principal */}
              <div className="flex flex-col rounded-2xl border border-black/8 bg-white p-6 shadow-[0_4px_16px_rgba(15,23,42,0.06)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF8F6]">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#0C535B]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <p className="font-semibold text-[#0C535B]">Dirección principal</p>
                </div>
                <div className="mt-4 flex-1 space-y-1.5">
                  {user.addressLine1 ? (
                    <>
                      <p className="text-sm font-semibold text-[#111]">{user.addressLine1}</p>
                      {user.addressLine2 && (
                        <p className="text-sm text-[#6e7379]">{user.addressLine2}</p>
                      )}
                      <p className="text-sm text-[#6e7379]">
                        {[user.city, user.department].filter(Boolean).join(", ")}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-[#8b8d91]">Sin dirección registrada</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setActivePanel("details")}
                  className="mt-5 w-full rounded-xl border border-[#0C535B]/20 py-2.5 text-sm font-semibold text-[#0C535B] transition-colors duration-200 hover:bg-[#0C535B] hover:text-white"
                >
                  Editar información
                </button>
              </div>

              {/* Métodos de pago */}
              <div className="flex flex-col rounded-2xl border border-black/8 bg-white p-6 shadow-[0_4px_16px_rgba(15,23,42,0.06)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF8F6]">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#0C535B]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                      <line x1="1" y1="10" x2="23" y2="10" />
                    </svg>
                  </div>
                  <p className="font-semibold text-[#0C535B]">Métodos de pago</p>
                </div>
                <div className="mt-4 flex-1">
                  <p className="text-sm text-[#8b8d91]">Sin métodos de pago registrados.</p>
                </div>
                <button
                  type="button"
                  disabled
                  className="mt-5 w-full cursor-not-allowed rounded-xl border border-black/10 py-2.5 text-sm font-semibold text-[#8b8d91]"
                >
                  Próximamente
                </button>
              </div>
            </div>

            {/* Resumen de pedidos quick-stats */}
            {orders.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl border border-black/8 bg-white px-4 py-4 text-center">
                  <p className="text-2xl font-bold text-[#27B1B8]">{orders.length}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#8b8d91]">Pedidos</p>
                </div>
                <div className="rounded-xl border border-black/8 bg-white px-4 py-4 text-center">
                  <p className="text-2xl font-bold text-[#27B1B8]">{activeShipments}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#8b8d91]">En proceso</p>
                </div>
                <div className="rounded-xl border border-black/8 bg-white px-4 py-4 text-center">
                  <p className="text-2xl font-bold text-[#27B1B8]">{deliveredOrders}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#8b8d91]">Entregados</p>
                </div>
              </div>
            )}

            {/* ¿Necesitas ayuda? */}
            <div className="rounded-2xl bg-[#0C535B] p-6 md:p-8">
              <p className="text-xl font-bold text-white">¿Necesitas ayuda?</p>
              <p className="mt-1 text-sm text-white/70">
                Nuestro equipo está listo para asistirte en todo lo que necesites.
              </p>
              <a
                href="https://wa.me/573104033476"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Escribir por WhatsApp
              </a>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Asesoría gratuita", "Respuesta rápida", "Cotizaciones"].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/80"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* — Editar información panel — */}
        {activePanel === "details" && (
          <div className="max-w-2xl space-y-6">
            <div>
              <button
                type="button"
                onClick={() => setActivePanel("summary")}
                className="mb-4 flex items-center gap-2 text-sm font-medium text-[#6e7379] transition-colors hover:text-[#0C535B]"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Volver a mi cuenta
              </button>
              <h1 className="text-2xl font-extrabold tracking-tight text-[#111] lg:text-3xl">
                Editar <span className="text-[#27B1B8]">información</span>
              </h1>
              <p className="mt-1 text-sm text-[#6e7379]">
                Actualiza tus datos personales, dirección y contraseña.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-slate-700">
                  Nombre completo
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={form.fullName}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                />
              </div>

              <div>
                <label htmlFor="company" className="mb-2 block text-sm font-medium text-slate-700">
                  Empresa o taller
                </label>
                <input
                  id="company"
                  type="text"
                  value={form.company}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                />
              </div>

              <div>
                <label htmlFor="phone" className="mb-2 block text-sm font-medium text-slate-700">
                  Teléfono
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                />
              </div>

              <div>
                <label htmlFor="department" className="mb-2 block text-sm font-medium text-slate-700">
                  Departamento
                </label>
                <select
                  id="department"
                  value={form.department}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                >
                  <option value="">Selecciona un departamento</option>
                  {departamentosColombia.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="city" className="mb-2 block text-sm font-medium text-slate-700">
                  Ciudad
                </label>
                <input
                  id="city"
                  type="text"
                  value={form.city}
                  onChange={handleChange}
                  list="account-cities"
                  disabled={!form.department}
                  placeholder={
                    form.department
                      ? "Busca o escribe tu ciudad"
                      : "Primero selecciona un departamento"
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                />
                <datalist id="account-cities">
                  {cityOptions.map((city) => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="addressLine1" className="mb-2 block text-sm font-medium text-slate-700">
                  Dirección principal
                </label>
                <input
                  id="addressLine1"
                  type="text"
                  value={form.addressLine1}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="addressLine2" className="mb-2 block text-sm font-medium text-slate-700">
                  Complemento de dirección
                </label>
                <input
                  id="addressLine2"
                  type="text"
                  value={form.addressLine2}
                  onChange={handleChange}
                  placeholder="Opcional"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="mb-2 block text-sm font-medium text-slate-700">
                  Nueva contraseña
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={form.newPassword}
                  onChange={handleChange}
                  placeholder="Opcional"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-slate-700">
                  Confirmar nueva contraseña
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repite la nueva contraseña"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                />
              </div>

              {inlineError && (
                <p className="rounded-xl border border-[#27B1B8]/20 bg-[#EAF8F6] px-4 py-3 text-sm font-medium text-[#0C535B] md:col-span-2">
                  {inlineError}
                </p>
              )}

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-[#27B1B8] px-4 py-3 font-semibold text-white transition-colors duration-200 hover:bg-[#1E969B] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Guardando cambios..." : "Actualizar cuenta"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* — Pedidos panel — */}
        {activePanel === "orders" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-[#111] lg:text-3xl">
                  Tus últimos <span className="text-[#27B1B8]">pedidos</span>
                </h1>
                <p className="mt-1 text-sm text-[#6e7379]">
                  Revisa el estado y el detalle de cada compra.
                </p>
              </div>
              <Link
                href="/categorias"
                className="rounded-full border border-[#0C535B]/20 px-5 py-2.5 text-sm font-semibold text-[#0C535B] transition-colors duration-200 hover:bg-[#0C535B] hover:text-white"
              >
                Seguir comprando
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-black/8 bg-white px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b8d91]">Pedidos totales</p>
                <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[#0C535B]">{orders.length}</p>
              </div>
              <div className="rounded-xl border border-black/8 bg-white px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b8d91]">En proceso</p>
                <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[#0C535B]">{activeShipments}</p>
              </div>
              <div className="rounded-xl border border-black/8 bg-white px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b8d91]">Entregados</p>
                <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[#0C535B]">{deliveredOrders}</p>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/12 bg-white p-10 text-center">
                <p className="text-sm leading-7 text-[#6e7379]">
                  Aún no tienes pedidos. Cuando completes tu checkout, aparecerán aquí con su estado y productos.
                </p>
                <Link
                  href="/categorias"
                  className="mt-4 inline-block rounded-xl bg-[#27B1B8] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1E969B]"
                >
                  Ver productos
                </Link>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-xl border border-black/8 bg-white px-5 py-4">
                  <p className="text-sm text-[#5d6167]">
                    {paidOrders} compra{paidOrders === 1 ? "" : "s"} confirmada{paidOrders === 1 ? "" : "s"} · {orders.length} pedido{orders.length === 1 ? "" : "s"} en total
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowFullOrderHistory((current) => !current)}
                    className="rounded-full border border-[#0C535B]/20 px-4 py-2 text-xs font-semibold text-[#0C535B] transition-colors duration-200 hover:bg-[#0C535B] hover:text-white"
                  >
                    {showFullOrderHistory ? "Ver solo recientes" : "Ver todos"}
                  </button>
                </div>

                <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                  {/* Orders list */}
                  <div className="space-y-3">
                    {recentOrders.map((order) => {
                      const isSelected = selectedOrder?.id === order.id;
                      return (
                        <button
                          key={order.id}
                          type="button"
                          onClick={() => setSelectedOrderId(order.id)}
                          className={`w-full rounded-[1.4rem] border px-5 py-5 text-left transition-colors duration-200 ${
                            isSelected
                              ? "border-[#0C535B] bg-[#0C535B] text-white shadow-[0_14px_28px_rgba(22,56,79,0.18)]"
                              : "border-black/8 bg-white text-[#0C535B] hover:bg-[#f4f7f9]"
                          }`}
                        >
                          <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${isSelected ? "text-white/70" : "text-[#8b8d91]"}`}>
                            Pedido
                          </p>
                          <p className="mt-2 truncate text-[1.3rem] font-semibold leading-tight">
                            {order.id}
                          </p>
                          <p className={`mt-1.5 text-sm ${isSelected ? "text-white/80" : "text-[#5d6167]"}`}>
                            {user.fullName} · {order.city}
                          </p>
                          <p className={`mt-0.5 text-sm ${isSelected ? "text-white/70" : "text-[#7a7f86]"}`}>
                            {formatOrderDate(order.createdAt)} · {order.totalItems} producto{order.totalItems === 1 ? "" : "s"}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${isSelected ? "bg-white/12 text-white" : getShippingStatusClasses(order.shippingStatus)}`}>
                              {getShippingStatusLabel(order.shippingStatus)}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${isSelected ? "bg-white/12 text-white" : getPaymentStatusClasses(order.paymentStatus)}`}>
                              {getPaymentStatusLabel(order.paymentStatus)}
                            </span>
                          </div>
                          <p className={`mt-4 text-base font-semibold ${isSelected ? "text-white" : "text-[#27B1B8]"}`}>
                            {formatCurrency(order.subtotal)}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Order detail */}
                  {!selectedOrder ? (
                    <div className="rounded-[1.75rem] border border-dashed border-black/12 bg-white p-8 text-center text-sm leading-7 text-[#6e7379]">
                      Selecciona un pedido para ver el detalle completo.
                    </div>
                  ) : (
                    <div className="rounded-[1.75rem] border border-black/8 bg-white p-6 shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8b8d91]">
                            Pedido seleccionado
                          </p>
                          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#0C535B]">
                            {selectedOrder.id}
                          </h3>
                          <p className="mt-2 text-sm leading-7 text-[#6e7379]">
                            {user.fullName} · {user.email}
                            {user.phone ? ` · ${user.phone}` : ""}
                          </p>
                          <p className="text-sm leading-7 text-[#6e7379]">
                            {selectedOrder.department}, {selectedOrder.city} · {selectedOrder.addressLine1}
                            {selectedOrder.addressLine2 ? ` · ${selectedOrder.addressLine2}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-[#0C535B] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                            {getOrderStatusLabel(selectedOrder.status)}
                          </span>
                          <span className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${getPaymentStatusClasses(selectedOrder.paymentStatus)}`}>
                            {getPaymentStatusLabel(selectedOrder.paymentStatus)}
                          </span>
                          <span className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${getShippingStatusClasses(selectedOrder.shippingStatus)}`}>
                            {getShippingStatusLabel(selectedOrder.shippingStatus)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_280px]">
                        <div className="rounded-[1.4rem] border border-black/8 bg-[#fafaf9] p-5">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b8d91]">Resumen del pedido</p>
                              <p className="mt-1 text-sm text-[#6e7379]">Productos incluidos en esta compra.</p>
                            </div>
                            <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0C535B] shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
                              {selectedOrder.totalItems} producto{selectedOrder.totalItems === 1 ? "" : "s"}
                            </span>
                          </div>
                          <div className="mt-4 space-y-3">
                            {selectedOrder.items.map((item) => (
                              <div key={item.id} className="rounded-[1rem] border border-black/8 bg-white px-4 py-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-[#1f2328]">{item.name}</p>
                                    <p className="mt-1.5 text-xs uppercase tracking-[0.18em] text-[#8b8d91]">Cantidad</p>
                                    <p className="mt-0.5 text-sm font-medium text-[#5d6167]">{item.quantity}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs uppercase tracking-[0.18em] text-[#8b8d91]">Precio unidad</p>
                                    <p className="mt-0.5 text-sm font-semibold text-[#0C535B]">{formatCurrency(item.unitPrice)}</p>
                                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#8b8d91]">Subtotal</p>
                                    <p className="mt-0.5 text-sm font-semibold text-[#27B1B8]">{formatCurrency(item.unitPrice * item.quantity)}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid gap-3 self-start">
                          <div className="rounded-[1.4rem] border border-black/8 bg-[#fafaf9] px-5 py-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b8d91]">Total del pedido</p>
                            <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#27B1B8]">{formatCurrency(selectedOrder.subtotal)}</p>
                          </div>
                          <div className="rounded-[1.4rem] border border-black/8 bg-[#fafaf9] px-5 py-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b8d91]">Transportadora</p>
                            <p className="mt-2 text-sm font-semibold text-[#0C535B]">{selectedOrder.carrier || "Por definir"}</p>
                          </div>
                          <div className="rounded-[1.4rem] border border-black/8 bg-[#fafaf9] px-5 py-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b8d91]">Guía</p>
                            <p className="mt-2 text-sm font-semibold text-[#0C535B]">{selectedOrder.trackingNumber || "Aún no asignada"}</p>
                          </div>
                          <div className="rounded-[1.4rem] border border-black/8 bg-[#fafaf9] px-5 py-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b8d91]">Fechas clave</p>
                            <p className="mt-2 text-sm font-semibold text-[#0C535B]">Creado: {formatOrderDate(selectedOrder.createdAt)}</p>
                            <p className="mt-1.5 text-sm font-semibold text-[#0C535B]">
                              Enviado: {selectedOrder.shippedAt ? formatOrderDate(selectedOrder.shippedAt) : "Pendiente"}
                            </p>
                            <p className="mt-1.5 text-sm font-semibold text-[#0C535B]">
                              Entregado: {selectedOrder.deliveredAt ? formatOrderDate(selectedOrder.deliveredAt) : "Sin confirmar"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6">
                        <OrderProgressTimeline order={selectedOrder} />
                      </div>

                      <div className="mt-4 rounded-[1.1rem] border border-black/8 bg-[#fafaf9] px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b8d91]">Dirección de entrega</p>
                        <p className="mt-2 text-sm leading-7 text-[#5d6167]">
                          {selectedOrder.department} · {selectedOrder.city} · {selectedOrder.addressLine1}
                          {selectedOrder.addressLine2 ? ` · ${selectedOrder.addressLine2}` : ""}
                        </p>
                      </div>

                      {selectedOrder.adminNotes && (
                        <div className="mt-4 rounded-[1.1rem] border border-black/8 bg-[#fafaf9] px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b8d91]">Nota de envío</p>
                          <p className="mt-2 text-sm leading-7 text-[#5d6167]">{selectedOrder.adminNotes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* — Facturas panel — */}
        {activePanel === "facturas" && (
          <div className="flex max-w-lg flex-col items-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EAF8F6]">
              <svg viewBox="0 0 24 24" className="h-7 w-7 text-[#0C535B]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-[#111]">Facturas</h1>
            <p className="mt-2 text-sm leading-7 text-[#6e7379]">
              Próximamente podrás consultar y descargar tus facturas directamente desde aquí.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
