"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useProducts } from "../components/products-provider";
import { categorias, type Categoria, type ProductoCatalogo } from "../data/catalog";
import type { ProductoEspecificacion } from "../data/catalog";
import type { InventoryMovementSummary } from "@/lib/products";
import type { ShippingStatus } from "@/lib/orders";

const disponibilidades: ProductoCatalogo["disponibilidad"][] = [
  "Entrega inmediata",
  "Disponible por pedido",
  "Recoger en tienda",
];

type FormState = {
  sku: string;
  oemReferencia: string;
  referenciasAlternas: string;
  categoria: Categoria;
  nombre: string;
  marca: string;
  precioValor: string;
  precioAnteriorValor: string;
  stock: string;
  stockMinimo: string;
  disponibilidad: ProductoCatalogo["disponibilidad"];
  descripcion: string;
  aplicacion: string;
  compatibilidad: string;
  garantia: string;
};

type TechnicalSpecFormItem = {
  id: string;
  etiqueta: string;
  valor: string;
};

const initialState: FormState = {
  sku: "",
  oemReferencia: "",
  referenciasAlternas: "",
  categoria: categorias[0],
  nombre: "",
  marca: "Kliniu",
  precioValor: "",
  precioAnteriorValor: "",
  stock: "0",
  stockMinimo: "0",
  disponibilidad: "Entrega inmediata",
  descripcion: "",
  aplicacion: "",
  compatibilidad: "",
  garantia: "1 año de garantía del fabricante",
};

const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024;
const RECOMMENDED_FILE_SIZE_KB = 500;
const EXTRA_IMAGE_SLOTS = 3;
const shippingStatuses: ShippingStatus[] = [
  "PENDING",
  "PREPARING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];
const paymentStatuses: Array<"PENDING" | "PAID" | "FAILED"> = [
  "PENDING",
  "PAID",
  "FAILED",
];

function createTechnicalSpecItem(
  spec?: Partial<ProductoEspecificacion>,
): TechnicalSpecFormItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    etiqueta: spec?.etiqueta || "",
    valor: spec?.valor || "",
  };
}

function normalizeTechnicalSpecFormItems(
  items: TechnicalSpecFormItem[],
): ProductoEspecificacion[] {
  return items
    .map((item) => ({
      etiqueta: item.etiqueta.trim(),
      valor: item.valor.trim(),
    }))
    .filter((item) => item.etiqueta && item.valor);
}

type ToastState = {
  tone: "success" | "error";
  message: string;
} | null;

type AdminOrder = {
  id: string;
  status: "PENDING" | "PAID" | "CANCELLED";
  paymentStatus: "PENDING" | "PAID" | "FAILED";
  shippingStatus: ShippingStatus;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  company: string | null;
  department: string;
  city: string;
  addressLine1: string;
  addressLine2: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  adminNotes: string | null;
  shippedAt: string | Date | null;
  deliveredAt: string | Date | null;
  totalItems: number;
  subtotal: number;
  createdAt: string | Date;
  user: {
    id: string;
    fullName: string;
    email: string;
  };
  items: Array<{
    id: string;
    name: string;
    productId?: string | null;
    image?: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
};

type OrderEditState = {
  shippingStatus: ShippingStatus;
  paymentStatus: "PENDING" | "PAID" | "FAILED";
  carrier: string;
  trackingNumber: string;
  adminNotes: string;
};

type ProductImageChoice = {
  label: string;
  image: string | null;
};

function getInventoryTone(
  status?: ProductoCatalogo["estadoInventario"],
) {
  if (status === "out-of-stock") {
    return {
      label: "Agotado",
      className: "bg-[#fff1f1] text-[#c53b3b]",
    };
  }

  if (status === "low-stock") {
    return {
      label: "Stock bajo",
      className: "bg-[#EAF8F6] text-[#0C535B]",
    };
  }

  return {
    label: "En stock",
    className: "bg-[#effaf2] text-[#1f6b39]",
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function normalizeComparableText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getShippingStatusLabel(status: ShippingStatus) {
  if (status === "PREPARING") return "En preparación";
  if (status === "SHIPPED") return "Enviado";
  if (status === "DELIVERED") return "Entregado";
  if (status === "CANCELLED") return "Cancelado";
  return "Pendiente";
}

function getPaymentStatusLabel(status: "PENDING" | "PAID" | "FAILED") {
  if (status === "PAID") return "Pago confirmado";
  if (status === "FAILED") return "Pago fallido";
  return "Pago pendiente";
}

function getOrderEditState(order: AdminOrder): OrderEditState {
  return {
    shippingStatus: order.shippingStatus,
    paymentStatus: order.paymentStatus,
    carrier: order.carrier || "",
    trackingNumber: order.trackingNumber || "",
    adminNotes: order.adminNotes || "",
  };
}

function getDerivedOrderStatus(
  shippingStatus: ShippingStatus,
  paymentStatus: "PENDING" | "PAID" | "FAILED",
): AdminOrder["status"] {
  if (shippingStatus === "CANCELLED") return "CANCELLED";
  if (paymentStatus === "PAID") return "PAID";
  return "PENDING";
}

function getAdminOrderProgressStep(order: AdminOrder) {
  if (order.shippingStatus === "DELIVERED") return 3;
  if (order.shippingStatus === "SHIPPED") return 2;
  if (order.shippingStatus === "PREPARING") return 1;
  if (order.paymentStatus === "PAID" || order.status === "PAID") return 0;
  return -1;
}

function AdminOrderProgress({ order }: { order: AdminOrder }) {
  const activeStep = getAdminOrderProgressStep(order);
  const steps = [
    {
      label: "Pedido confirmado",
      icon: (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
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
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3 4 7l8 4 8-4-8-4Z" />
          <path d="M4 7v10l8 4 8-4V7" />
          <path d="M12 11v10" />
        </svg>
      ),
    },
    {
      label: "Enviado",
      icon: (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
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
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m5 12 4 4L19 6" />
        </svg>
      ),
    },
  ];

  return (
    <div className="rounded-[1.4rem] border border-black/8 bg-[#fafaf9] px-5 py-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b8d91]">
            Flujo del pedido
          </p>
          <p className="mt-2 text-sm leading-7 text-[#6e7379]">
            Muestra el mismo progreso que verá el cliente en su cuenta.
          </p>
        </div>
        <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#0C535B] shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
          {getShippingStatusLabel(order.shippingStatus)}
        </span>
      </div>

      <div className="mt-5 overflow-x-auto">
        <div className="relative min-w-[620px] px-1 py-2">
          <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-6 z-0">
            <span className="block h-[6px] rounded-full bg-[#d9dde4] shadow-[inset_0_1px_2px_rgba(15,23,42,0.08)]" />
            <span
              className="absolute left-0 top-0 h-[6px] rounded-full bg-gradient-to-r from-[#27B1B8] to-[#f4a261] shadow-[0_6px_16px_rgba(237,132,53,0.25)] transition-all duration-300"
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
                    } ${isCurrent ? "shadow-[0_10px_24px_rgba(237,132,53,0.2)]" : ""}`}
                  >
                    {step.icon}
                  </span>
                  <div className="mt-3">
                    <p
                      className={`text-sm font-semibold ${
                        isCompleted ? "text-[#0C535B]" : "text-[#8b8d91]"
                      }`}
                    >
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

function ProductImageSelector({
  choices,
  primaryImageIndex,
  onSelect,
  description,
}: {
  choices: ProductImageChoice[];
  primaryImageIndex: number;
  onSelect: (index: number) => void;
  description: string;
}) {
  return (
    <div className="md:col-span-2 rounded-[1.5rem] border border-black/8 bg-[#fafaf9] p-4">
      <p className="text-sm font-medium text-[#4f545a]">Elegir imagen principal</p>
      <p className="mt-2 text-xs leading-6 text-[#6e7379]">{description}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {choices.map((item, index) => {
          const hasImage = Boolean(item.image);

          return (
            <button
              key={`choice-${item.label}-${index}`}
              type="button"
              onClick={() => hasImage && onSelect(index)}
              disabled={!hasImage}
              className={`group rounded-[1.15rem] border p-2.5 text-left transition-all duration-200 ${
                primaryImageIndex === index && hasImage
                  ? "border-[#0C535B] bg-white shadow-[0_14px_28px_rgba(22,56,79,0.12)]"
                  : "border-black/8 bg-white/96"
              } ${hasImage ? "hover:-translate-y-0.5 hover:border-[#0C535B]/30" : "cursor-not-allowed opacity-55"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9a9da2]">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xs text-[#5c6167]">
                    {hasImage ? "Haz clic para usarla" : "Sin imagen"}
                  </p>
                </div>
                <div
                  className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                    primaryImageIndex === index && hasImage
                      ? "bg-[#0C535B] text-white"
                      : "border border-black/8 text-[#8b8d91]"
                  }`}
                >
                  {primaryImageIndex === index && hasImage ? "Principal" : "Vista"}
                </div>
              </div>
              <div className="mt-3 overflow-hidden rounded-[0.95rem] border border-black/8 bg-[linear-gradient(180deg,#ffffff_0%,#f4f6f8_100%)]">
                {item.image ? (
                  <div className="relative p-2">
                    {primaryImageIndex === index && hasImage && (
                      <div className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-[#27B1B8] text-white shadow-[0_10px_20px_rgba(237,132,53,0.28)]">
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 20 20"
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M4.5 10.5 8 14l7.5-8" />
                        </svg>
                      </div>
                    )}
                    <div className="overflow-hidden rounded-[0.8rem] bg-white shadow-[inset_0_0_0_1px_rgba(15,23,42,0.04)]">
                      <Image
                        src={item.image}
                        alt={`Opción ${item.label}`}
                        width={320}
                        height={240}
                        className="h-20 w-full object-cover md:h-24"
                        unoptimized={item.image.startsWith("blob:")}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex h-24 items-center justify-center text-xs font-medium text-[#a2a5aa] md:h-28">
                    Sin imagen
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TechnicalSpecsEditor({
  items,
  onChange,
}: {
  items: TechnicalSpecFormItem[];
  onChange: (items: TechnicalSpecFormItem[]) => void;
}) {
  const updateItem = (
    id: string,
    field: "etiqueta" | "valor",
    value: string,
  ) => {
    onChange(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const addItem = () => {
    onChange([...items, createTechnicalSpecItem()]);
  };

  return (
    <div className="md:col-span-2 rounded-[1.5rem] border border-black/8 bg-[#fafaf9] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#4f545a]">
            Ficha técnica del producto
          </p>
          <p className="mt-2 text-xs leading-6 text-[#6e7379]">
            Agrega solo las especificaciones que apliquen para este producto. Puedes dejar pocas o muchas.
          </p>
        </div>
        <button
          type="button"
          onClick={addItem}
          className="inline-flex rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[#0C535B] transition-colors duration-200 hover:bg-[#0C535B] hover:text-white"
        >
          Agregar especificación
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {items.length === 0 && (
          <div className="rounded-[1.2rem] border border-dashed border-black/12 bg-white px-4 py-5 text-sm text-[#6e7379]">
            Aún no hay especificaciones. Agrega las filas que necesites para esta categoría.
          </div>
        )}

        {items.map((item, index) => (
          <div
            key={item.id}
            className="grid gap-3 rounded-[1.2rem] border border-black/8 bg-white p-4 md:grid-cols-[220px_minmax(0,1fr)_auto]"
          >
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b8d91]">
                Etiqueta
              </span>
              <input
                value={item.etiqueta}
                onChange={(event) => updateItem(item.id, "etiqueta", event.target.value)}
                placeholder={index === 0 ? "Ej. Material" : "Nombre del dato"}
                className="w-full rounded-xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b8d91]">
                Valor
              </span>
              <input
                value={item.valor}
                onChange={(event) => updateItem(item.id, "valor", event.target.value)}
                placeholder="Escribe la especificación"
                className="w-full rounded-xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
              />
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="inline-flex rounded-full border border-black/10 px-4 py-3 text-sm font-semibold text-[#0C535B] transition-colors duration-200 hover:bg-[#0C535B] hover:text-white"
              >
                Quitar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function splitCommaSeparatedValues(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function AdminPage() {
  const router = useRouter();
  const {
    adminProducts,
    createProduct,
    updateProduct,
    removeProduct,
    adjustInventory,
  } = useProducts();
  const [activeTab, setActiveTab] = useState<
    "create" | "edit" | "inventory" | "orders" | null
  >(null);
  const [editSearch, setEditSearch] = useState("");
  const [editCategoryFilter, setEditCategoryFilter] = useState<"Todas" | Categoria>("Todas");
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState<
    "all" | "low-stock" | "out-of-stock"
  >("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderShippingFilter, setOrderShippingFilter] = useState<
    "all" | ShippingStatus
  >("all");
  const [form, setForm] = useState<FormState>(initialState);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [technicalSpecs, setTechnicalSpecs] = useState<TechnicalSpecFormItem[]>([
    createTechnicalSpecItem({ etiqueta: "Observaciones" }),
  ]);
  const [selectedExtraImages, setSelectedExtraImages] = useState<Array<File | null>>(
    () => Array.from({ length: EXTRA_IMAGE_SLOTS }, () => null),
  );
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [inventoryAdjustments, setInventoryAdjustments] = useState<Record<string, string>>({});
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovementSummary[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderForm, setOrderForm] = useState<OrderEditState>({
    shippingStatus: "PENDING",
    paymentStatus: "PENDING",
    carrier: "",
    trackingNumber: "",
    adminNotes: "",
  });
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const editFormRef = useRef<HTMLFormElement | null>(null);
  const editingProduct =
    adminProducts.find((product) => product.slug === editingSlug) ?? null;
  const previewImageUrl = useMemo(() => {
    if (selectedImage) {
      return URL.createObjectURL(selectedImage);
    }

    return editingProduct?.imagen ?? null;
  }, [editingProduct?.imagen, selectedImage]);
  const previewExtraImageUrls = useMemo(
    () =>
      Array.from({ length: EXTRA_IMAGE_SLOTS }, (_, index) => {
        const file = selectedExtraImages[index];

        if (file) {
          return URL.createObjectURL(file);
        }

        return editingProduct?.imagenesExtra?.[index] ?? null;
      }),
    [editingProduct?.imagenesExtra, selectedExtraImages],
  );
  const productImageChoices = useMemo(
    () => [
      {
        label: "Principal",
        image: previewImageUrl,
      },
      ...previewExtraImageUrls.map((image, index) => ({
        label: `Extra ${index + 1}`,
        image,
      })),
    ],
    [previewExtraImageUrls, previewImageUrl],
  );
  const selectedOrder =
    orders.find((order) => order.id === selectedOrderId) ?? null;
  const selectedOrderPreview = useMemo(() => {
    if (!selectedOrder) return null;

    return {
      ...selectedOrder,
      status: getDerivedOrderStatus(
        orderForm.shippingStatus,
        orderForm.paymentStatus,
      ),
      shippingStatus: orderForm.shippingStatus,
      paymentStatus: orderForm.paymentStatus,
      carrier: orderForm.carrier.trim() || null,
      trackingNumber: orderForm.trackingNumber.trim() || null,
      adminNotes: orderForm.adminNotes.trim() || null,
    };
  }, [orderForm, selectedOrder]);
  const filteredProducts = useMemo(() => {
    const search = editSearch.trim().toLowerCase();

    return adminProducts.filter((product) => {
      const matchesCategory =
        editCategoryFilter === "Todas" || product.categoria === editCategoryFilter;
      const matchesSearch =
        search.length === 0 ||
        product.nombre.toLowerCase().includes(search) ||
        product.marca.toLowerCase().includes(search) ||
        (product.sku || "").toLowerCase().includes(search);
      const matchesInventory =
        inventoryStatusFilter === "all" ||
        product.estadoInventario === inventoryStatusFilter;

      return matchesCategory && matchesSearch && matchesInventory;
    });
  }, [adminProducts, editCategoryFilter, editSearch, inventoryStatusFilter]);
  const filteredOrders = useMemo(() => {
    const search = orderSearch.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesFilter =
        orderShippingFilter === "all" || order.shippingStatus === orderShippingFilter;
      const matchesSearch =
        search.length === 0 ||
        order.id.toLowerCase().includes(search) ||
        order.customerName.toLowerCase().includes(search) ||
        order.customerEmail.toLowerCase().includes(search) ||
        order.city.toLowerCase().includes(search) ||
        (order.trackingNumber || "").toLowerCase().includes(search);

      return matchesFilter && matchesSearch;
    });
  }, [orderSearch, orderShippingFilter, orders]);

  const productCountLabel = `${adminProducts.length} producto${adminProducts.length === 1 ? "" : "s"} en catálogo`;

  useEffect(() => {
    if (previewImageUrl?.startsWith("blob:")) {
      return () => {
        URL.revokeObjectURL(previewImageUrl);
      };
    }
  }, [previewImageUrl]);

  useEffect(() => {
    return () => {
      previewExtraImageUrls.forEach((image) => {
        if (image?.startsWith("blob:")) {
          URL.revokeObjectURL(image);
        }
      });
    };
  }, [previewExtraImageUrls]);

  useEffect(() => {
    if (!toast) return;

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 2800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toast]);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/account");

      if (!response.ok) {
        setIsAuthenticated(false);
        setAdminName("");
        setIsCheckingSession(false);
        return;
      }

      const payload = (await response.json()) as {
        user?: { fullName: string; role: "CUSTOMER" | "ADMIN" };
      };

      if (payload.user?.role === "ADMIN") {
        setIsAuthenticated(true);
        setAdminName(payload.user.fullName);
      } else {
        setIsAuthenticated(false);
        setAdminName("");
      }

      setIsCheckingSession(false);
    })();
  }, []);

  useEffect(() => {
    if (activeTab === "edit" && editingSlug && editFormRef.current) {
      editFormRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [activeTab, editingSlug]);

  useEffect(() => {
    if (!isCheckingSession && !isAuthenticated) {
      router.replace("/login?next=/admin");
    }
  }, [isAuthenticated, isCheckingSession, router]);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (file && file.size > MAX_FILE_SIZE_BYTES) {
      setRequestError("La imagen supera el límite de 3 MB. Intenta con una versión más liviana.");
      setSelectedImage(null);
      setFileInputKey((current) => current + 1);
      return;
    }

    setRequestError("");
    setSelectedImage(file);
  };

  const handleExtraImageChange =
    (index: number) => (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;

      if (file && file.size > MAX_FILE_SIZE_BYTES) {
        setRequestError("Una de las imágenes extra supera el límite de 3 MB. Intenta con una versión más liviana.");
        setSelectedExtraImages((current) =>
          current.map((item, itemIndex) => (itemIndex === index ? null : item)),
        );
        setFileInputKey((current) => current + 1);
        return;
      }

      setRequestError("");
      setSelectedExtraImages((current) =>
        current.map((item, itemIndex) => (itemIndex === index ? file : item)),
      );
    };

  const uploadProductImage = async (file: File, productName: string) => {
    const uploadData = new FormData();
    uploadData.append("file", file);
    uploadData.append("productName", productName);

    const uploadResponse = await fetch("/api/uploads", {
      method: "POST",
      body: uploadData,
    });

    const uploadPayload = (await uploadResponse.json()) as {
      error?: string;
      publicUrl?: string;
    };

    if (!uploadResponse.ok || !uploadPayload.publicUrl) {
      throw new Error(
        uploadPayload.error || "No fue posible subir la imagen a Supabase Storage.",
      );
    }

    return uploadPayload.publicUrl;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingProduct(true);
    setRequestError("");
    setToast(null);
    const isEditing = Boolean(editingSlug);

    if (!editingSlug && !selectedImage) {
      setIsSavingProduct(false);
      setRequestError("Selecciona una imagen para el producto.");
      setToast({
        tone: "error",
        message: "Selecciona una imagen antes de guardar el producto.",
      });
      return;
    }

    let imageUrl =
      adminProducts.find((product) => product.slug === editingSlug)?.imagen ||
      "/hero-kliniu.jpg";

    try {
      if (selectedImage) {
        imageUrl = await uploadProductImage(selectedImage, form.nombre);
      }

      const currentExtraImages =
        adminProducts.find((product) => product.slug === editingSlug)?.imagenesExtra || [];
      const extraImageUrls = await Promise.all(
        Array.from({ length: EXTRA_IMAGE_SLOTS }, async (_, index) => {
          const selectedFile = selectedExtraImages[index];

          if (selectedFile) {
            return await uploadProductImage(
              selectedFile,
              `${form.nombre}-extra-${index + 1}`,
            );
          }

          return currentExtraImages[index] || null;
        }),
      );

      const orderedImages = [imageUrl, ...extraImageUrls];
      const nextPrimaryImage = orderedImages[primaryImageIndex];

      if (!nextPrimaryImage) {
        setIsSavingProduct(false);
        setRequestError("Selecciona una imagen válida como principal.");
        setToast({
          tone: "error",
          message: "Selecciona una imagen válida como principal.",
        });
        return;
      }

      const reorderedExtraImages = orderedImages.filter(
        (image, index): image is string =>
          index !== primaryImageIndex && Boolean(image),
      );

      const payload = {
        sku: form.sku,
        categoria: form.categoria,
        nombre: form.nombre,
        marca: form.marca,
        precioValor: Number(form.precioValor),
        precioAnteriorValor: Number(form.precioAnteriorValor || form.precioValor),
        stock: Number(form.stock),
        stockMinimo: Number(form.stockMinimo),
        imagen: nextPrimaryImage,
        imagenesExtra: reorderedExtraImages.slice(0, EXTRA_IMAGE_SLOTS),
        disponibilidad: form.disponibilidad,
        descripcion: form.descripcion,
        oemReferencia: form.oemReferencia,
        referenciasAlternas: splitCommaSeparatedValues(form.referenciasAlternas),
        aplicacion: form.aplicacion,
        compatibilidad: splitCommaSeparatedValues(form.compatibilidad),
        garantia: form.garantia,
        especificacionesTecnicas: normalizeTechnicalSpecFormItems(technicalSpecs),
      };
      const result = editingSlug
        ? await updateProduct(editingSlug, payload)
        : await createProduct(payload);

      setIsSavingProduct(false);

      if (!result.ok) {
        setRequestError(result.message);
        setToast({
          tone: "error",
          message: result.message,
        });
        return;
      }

      setForm(initialState);
      setSelectedImage(null);
      setTechnicalSpecs([createTechnicalSpecItem({ etiqueta: "Observaciones" })]);
      setSelectedExtraImages(Array.from({ length: EXTRA_IMAGE_SLOTS }, () => null));
      setPrimaryImageIndex(0);
      setFileInputKey((current) => current + 1);
      setEditingSlug(null);
      setActiveTab(null);
      setSaved(true);
      setToast({
        tone: "success",
        message: isEditing
          ? "Producto editado correctamente."
          : "Producto creado correctamente.",
      });
      window.setTimeout(() => setSaved(false), 1800);
    } catch (error) {
      setIsSavingProduct(false);
      const message =
        error instanceof Error
          ? error.message
          : "No fue posible subir una de las imágenes.";
      setRequestError(message);
      setToast({
        tone: "error",
        message,
      });
    }
  };

  const handleEditProduct = (slug: string) => {
    const product = adminProducts.find((item) => item.slug === slug);
    if (!product) return;

    const precioAnteriorValor = Number(product.precioAnterior.replace(/\D/g, "")) || product.precioValor;

    setForm({
      sku: product.sku || "",
      oemReferencia: product.oemReferencia || "",
      referenciasAlternas: product.referenciasAlternas?.join(", ") || "",
      categoria: product.categoria,
      nombre: product.nombre,
      marca: product.marca,
      precioValor: String(product.precioValor),
      precioAnteriorValor: String(precioAnteriorValor),
      stock: String(product.stock ?? 0),
      stockMinimo: String(product.stockMinimo ?? 0),
      disponibilidad: product.disponibilidad,
      aplicacion: product.aplicacion || "",
      compatibilidad: product.compatibilidad?.join(", ") || "",
      garantia: product.garantia || initialState.garantia,
      descripcion: product.descripcion || "",
    });
    setTechnicalSpecs(
      (product.especificacionesTecnicas || []).length > 0
        ? (product.especificacionesTecnicas || []).map((item) =>
            createTechnicalSpecItem(item),
          )
        : [createTechnicalSpecItem({ etiqueta: "Observaciones" })],
    );
    setEditingSlug(product.slug);
    setActiveTab("edit");
    setSelectedImage(null);
    setSelectedExtraImages(Array.from({ length: EXTRA_IMAGE_SLOTS }, () => null));
    setPrimaryImageIndex(0);
    setRequestError("");
    setFileInputKey((current) => current + 1);
  };

  const handleResetForm = () => {
    setForm(initialState);
    setSelectedImage(null);
    setTechnicalSpecs([createTechnicalSpecItem({ etiqueta: "Observaciones" })]);
    setSelectedExtraImages(Array.from({ length: EXTRA_IMAGE_SLOTS }, () => null));
    setPrimaryImageIndex(0);
    setEditingSlug(null);
    setRequestError("");
    setFileInputKey((current) => current + 1);
    setSelectedOrderId(null);
    setOrderSearch("");
    setOrderShippingFilter("all");
    setActiveTab(null);
  };

  const handleDeleteProduct = async (slug: string) => {
    setRequestError("");
    setToast(null);
    const result = await removeProduct(slug);

    if (!result.ok) {
      setRequestError(result.message);
      setToast({
        tone: "error",
        message: result.message,
      });
      return;
    }

    setToast({
      tone: "success",
      message: "Producto eliminado correctamente.",
    });
  };

  async function loadInventoryMovements() {
    setIsLoadingInventory(true);
    const response = await fetch("/api/inventory");
    const payload = (await response.json()) as {
      error?: string;
      movements?: InventoryMovementSummary[];
    };

    setIsLoadingInventory(false);

    if (!response.ok || !payload.movements) {
      setToast({
        tone: "error",
        message:
          payload.error || "No fue posible cargar los movimientos de inventario.",
      });
      return;
    }

    setInventoryMovements(payload.movements);
  }

  async function loadOrders() {
    setIsLoadingOrders(true);

    const response = await fetch("/api/orders");
    const payload = (await response.json()) as {
      error?: string;
      orders?: AdminOrder[];
    };

    setIsLoadingOrders(false);

    if (!response.ok || !payload.orders) {
      setToast({
        tone: "error",
        message: payload.error || "No fue posible cargar los pedidos.",
      });
      return;
    }

    setOrders(payload.orders);
  }

  const handleQuickInventoryAdjust = async (
    slug: string,
    quantity: number,
    note?: string,
  ) => {
    setRequestError("");
    setToast(null);

    const result = await adjustInventory(slug, quantity, note);

    if (!result.ok) {
      setToast({
        tone: "error",
        message: result.message,
      });
      return;
    }

    setInventoryAdjustments((current) => ({ ...current, [slug]: "" }));
    setToast({
      tone: "success",
      message: "Inventario ajustado correctamente.",
    });
    await loadInventoryMovements();
  };

  const openCreateView = () => {
    setForm(initialState);
    setSelectedImage(null);
    setSelectedExtraImages(Array.from({ length: EXTRA_IMAGE_SLOTS }, () => null));
    setPrimaryImageIndex(0);
    setEditingSlug(null);
    setRequestError("");
    setFileInputKey((current) => current + 1);
    setActiveTab("create");
  };

  const openEditView = () => {
    setSelectedImage(null);
    setRequestError("");
    setPrimaryImageIndex(0);
    setActiveTab("edit");
  };

  const openInventoryView = () => {
    setSelectedImage(null);
    setRequestError("");
    setPrimaryImageIndex(0);
    setEditingSlug(null);
    setInventoryStatusFilter("all");
    setActiveTab("inventory");
    void loadInventoryMovements();
  };

  const openOrdersView = () => {
    setSelectedImage(null);
    setRequestError("");
    setPrimaryImageIndex(0);
    setEditingSlug(null);
    setOrderShippingFilter("all");
    setActiveTab("orders");
    void loadOrders();
  };

  const handleOrderFieldChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setOrderForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSaveOrder = async () => {
    if (!selectedOrderId) return;

    setIsSavingOrder(true);
    setToast(null);

    const response = await fetch(`/api/orders/${selectedOrderId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderForm),
    });

    const payload = (await response.json()) as {
      error?: string;
      message?: string;
      order?: AdminOrder;
    };

    setIsSavingOrder(false);

    if (!response.ok || !payload.order) {
      setToast({
        tone: "error",
        message: payload.error || "No fue posible actualizar el pedido.",
      });
      return;
    }

    setOrders((current) =>
      current.map((order) => (order.id === payload.order?.id ? payload.order : order)),
    );
    setToast({
      tone: "success",
      message: payload.message || "Pedido actualizado correctamente.",
    });
  };

  if (isCheckingSession) {
    return (
      <main className="min-h-screen bg-[#f5f5f5] text-[#111]">
        <section className="mx-auto flex max-w-[1440px] px-6 py-16">
          <div className="mx-auto w-full max-w-md rounded-[2rem] border border-black/8 bg-white p-8 text-center shadow-[0_16px_35px_rgba(15,23,42,0.05)]">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#27B1B8]">
              Administrador
            </p>
            <p className="mt-4 text-sm text-[#6e7379]">
              Verificando acceso al panel...
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#f5f5f5] text-[#111]">
        <section className="mx-auto flex max-w-[1440px] px-6 py-16">
          <div className="mx-auto w-full max-w-md rounded-[2rem] border border-black/8 bg-white p-8 text-center shadow-[0_16px_35px_rgba(15,23,42,0.05)]">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#27B1B8]">
              Administrador
            </p>
            <p className="mt-4 text-sm leading-7 text-[#6e7379]">
              Redirigiendo al ingreso general para validar tu cuenta.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f5f5] text-[#111]">
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

      <section className="py-16">
        <div className="space-y-8">
          <div className="admin-fade-up mx-auto max-w-[1440px] px-6">
            <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(560px,1.1fr)]">
              <div className="order-2 lg:order-1">
                <div className="max-w-[640px]">
                  <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#8b8d91]">
                    Flujo de administración
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#1f2328]">
                    Elige el módulo que necesitas
                  </h2>
                  <p className="mt-2 max-w-[38rem] text-sm leading-7 text-[#6e7379]">
                    {productCountLabel}. Dejamos una navegación más directa para crear, editar,
                    inventario y pedidos sin tanto ruido visual.
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={openCreateView}
                    className={`inline-flex min-h-12 items-center gap-3 rounded-full border px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                      activeTab === "create"
                        ? "border-[#0C535B] bg-[#0C535B] text-white"
                        : "border-black/8 bg-white text-[#0C535B] hover:border-[#0C535B]/18 hover:bg-[#f8f8f7]"
                    }`}
                  >
                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                        activeTab === "create" ? "bg-white/14 text-white" : "bg-[#0C535B] text-white"
                      }`}
                    >
                      +
                    </span>
                    Crear producto
                  </button>

                  <button
                    type="button"
                    onClick={openEditView}
                    className={`inline-flex min-h-12 items-center gap-3 rounded-full border px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                      activeTab === "edit"
                        ? "border-[#0C535B] bg-[#0C535B] text-white"
                        : "border-black/8 bg-white text-[#0C535B] hover:border-[#0C535B]/18 hover:bg-[#f8f8f7]"
                    }`}
                  >
                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
                        activeTab === "edit" ? "bg-white/14 text-white" : "bg-[#27B1B8] text-white"
                      }`}
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 20h9" />
                        <path d="m16.5 3.5 4 4L7 21l-4 1 1-4Z" />
                      </svg>
                    </span>
                    Editar productos
                  </button>

                  <button
                    type="button"
                    onClick={openInventoryView}
                    className={`inline-flex min-h-12 items-center gap-3 rounded-full border px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                      activeTab === "inventory"
                        ? "border-[#0C535B] bg-[#0C535B] text-white"
                        : "border-black/8 bg-white text-[#0C535B] hover:border-[#0C535B]/18 hover:bg-[#f8f8f7]"
                    }`}
                  >
                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                        activeTab === "inventory" ? "bg-white/14 text-white" : "bg-[#1f8b45] text-white"
                      }`}
                    >
                      ≡
                    </span>
                    Inventario
                  </button>

                  <button
                    type="button"
                    onClick={openOrdersView}
                    className={`inline-flex min-h-12 items-center gap-3 rounded-full border px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                      activeTab === "orders"
                        ? "border-[#0C535B] bg-[#0C535B] text-white"
                        : "border-black/8 bg-white text-[#0C535B] hover:border-[#0C535B]/18 hover:bg-[#f8f8f7]"
                    }`}
                  >
                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                        activeTab === "orders" ? "bg-white/14 text-white" : "bg-[#6366f1] text-white"
                      }`}
                    >
                      ↗
                    </span>
                    Pedidos y envíos
                  </button>

                  {activeTab && (
                    <button
                      type="button"
                      onClick={handleResetForm}
                      className="inline-flex min-h-12 items-center rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#5d6167] transition-colors duration-200 hover:border-[#0C535B]/18 hover:bg-[#0C535B] hover:text-white"
                    >
                      Vista limpia
                    </button>
                  )}
                </div>
              </div>

              <div className="order-1 lg:order-2">
                <div className="flex min-h-[360px] items-center justify-center lg:min-h-[460px]">
                  <Image
                    src="/admin-banner.jpg"
                    alt="Banner del administrador de productos"
                    width={1600}
                    height={900}
                    priority
                    sizes="(min-width: 1024px) 52vw, 100vw"
                    className="h-auto w-full max-w-[820px] object-contain"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-[1440px] px-6">

          {activeTab === "create" && (
            <form
              onSubmit={handleSubmit}
              className="admin-fade-up rounded-[2rem] border border-black/8 bg-white p-6 shadow-[0_16px_35px_rgba(15,23,42,0.05)] md:p-8"
            >
              <div className="mb-8 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8b8d91]">
                    Nuevo producto
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#0C535B]">
                    Crear producto
                  </h2>
                </div>
                {saved && (
                  <span className="rounded-full bg-[#0C535B] px-4 py-2 text-sm font-semibold text-white">
                    Guardado
                  </span>
                )}
              </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-[#4f545a]">SKU</span>
                    <input
                      name="sku"
                      value={form.sku}
                      onChange={handleChange}
                      placeholder="Ej. FAROLA001"
                      className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-[#4f545a]">Categoría</span>
                    <select
                    name="categoria"
                    value={form.categoria}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                  >
                    {categorias.map((categoria) => (
                      <option key={categoria} value={categoria}>
                        {categoria}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-[#4f545a]">Marca</span>
                  <input
                    name="marca"
                    value={form.marca}
                    onChange={handleChange}
                    required
                    className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-[#4f545a]">Nombre del producto</span>
                  <input
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    required
                    className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-[#4f545a]">Referencia OEM</span>
                  <input
                    name="oemReferencia"
                    value={form.oemReferencia}
                    onChange={handleChange}
                    placeholder="Ej. OEM-45892"
                    className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-[#4f545a]">Referencias alternas</span>
                  <input
                    name="referenciasAlternas"
                    value={form.referenciasAlternas}
                    onChange={handleChange}
                    placeholder="Separadas por coma"
                    className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-[#4f545a]">Precio actual</span>
                  <input
                    name="precioValor"
                    type="number"
                    min="1"
                    value={form.precioValor}
                    onChange={handleChange}
                    required
                    className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-[#4f545a]">Stock actual</span>
                  <input
                    name="stock"
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-[#4f545a]">Precio anterior</span>
                  <input
                    name="precioAnteriorValor"
                    type="number"
                    min="1"
                    value={form.precioAnteriorValor}
                    onChange={handleChange}
                    required
                    className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-[#4f545a]">Stock mínimo</span>
                  <input
                    name="stockMinimo"
                    type="number"
                    min="0"
                    value={form.stockMinimo}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-[#4f545a]">
                    Subir imagen a Supabase Storage
                  </span>
                  <input
                    key={fileInputKey}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    required
                    className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 file:mr-4 file:rounded-full file:border-0 file:bg-[#0C535B] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#073D43]"
                  />
                  <p className="text-xs leading-6 text-[#6e7379]">
                    Sube la foto directamente aquí. Formatos permitidos: JPG, PNG o WEBP.
                  </p>
                  <p className="text-xs leading-6 text-[#6e7379]">
                    Recomendado: hasta {RECOMMENDED_FILE_SIZE_KB} KB por imagen. Límite máximo: 3 MB.
                  </p>
                  {selectedImage && (
                    <p className="text-xs leading-6 text-[#0C535B]">
                      Archivo seleccionado: {selectedImage.name} ({Math.round(selectedImage.size / 1024)} KB)
                    </p>
                  )}
                </label>

                <div className="grid gap-5 md:col-span-2 md:grid-cols-3">
                  {Array.from({ length: EXTRA_IMAGE_SLOTS }, (_, index) => (
                    <label
                      key={`create-extra-${index}`}
                      className="space-y-2 rounded-[1.4rem] border border-black/8 bg-[#fafaf9] p-4"
                    >
                      <span className="text-sm font-medium text-[#4f545a]">
                        Imagen extra {index + 1}
                      </span>
                      <input
                        key={`${fileInputKey}-create-extra-${index}`}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleExtraImageChange(index)}
                        className="w-full rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 file:mr-3 file:rounded-full file:border-0 file:bg-[#0C535B] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-[#073D43]"
                      />
                      <p className="text-xs leading-6 text-[#6e7379]">
                        Opcional. Se mostrará como miniatura en la galería.
                      </p>
                      {selectedExtraImages[index] && (
                        <p className="text-xs leading-6 text-[#0C535B]">
                          Archivo: {selectedExtraImages[index]?.name} ({Math.round((selectedExtraImages[index]?.size || 0) / 1024)} KB)
                        </p>
                      )}
                      {previewExtraImageUrls[index] && (
                        <div className="overflow-hidden rounded-[1rem] border border-black/8 bg-white">
                          <Image
                            src={previewExtraImageUrls[index] || ""}
                            alt={`Vista previa extra ${index + 1}`}
                            width={500}
                            height={500}
                            className="h-28 w-full object-contain bg-white"
                            unoptimized={previewExtraImageUrls[index]?.startsWith("blob:")}
                          />
                        </div>
                      )}
                    </label>
                  ))}
                </div>

                {previewImageUrl && (
                  <div className="md:col-span-2 rounded-[1.5rem] border border-black/8 bg-[#fafaf9] p-4">
                    <p className="text-sm font-medium text-[#4f545a]">
                      Vista previa de la nueva imagen
                    </p>
                    <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-black/8 bg-white">
                      <Image
                        src={previewImageUrl}
                        alt={form.nombre || "Vista previa del producto"}
                        width={1200}
                        height={900}
                        className="h-64 w-full object-contain bg-white"
                        unoptimized={previewImageUrl.startsWith("blob:")}
                      />
                    </div>
                  </div>
                )}

                <ProductImageSelector
                  choices={productImageChoices}
                  primaryImageIndex={primaryImageIndex}
                  onSelect={setPrimaryImageIndex}
                  description="Puedes escoger cuál de las imágenes será la principal del producto."
                />

                <TechnicalSpecsEditor
                  items={technicalSpecs}
                  onChange={setTechnicalSpecs}
                />

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-[#4f545a]">Descripción comercial</span>
                  <textarea
                    name="descripcion"
                    value={form.descripcion}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Describe el producto, su uso principal y el beneficio para el cliente."
                    className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm leading-7 text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-[#4f545a]">Disponibilidad</span>
                  <select
                    name="disponibilidad"
                    value={form.disponibilidad}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                  >
                    {disponibilidades.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                {requestError && (
                  <p className="w-full rounded-2xl border border-[#27B1B8]/20 bg-[#EAF8F6] px-4 py-3 text-sm font-medium text-[#0C535B]">
                    {requestError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="inline-flex rounded-full bg-[#27B1B8] px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#1E969B]"
                >
                  {isSavingProduct ? "Guardando..." : "Crear producto"}
                </button>
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="inline-flex rounded-full border border-black/10 px-6 py-3 text-sm font-semibold text-[#0C535B] transition-colors duration-200 hover:bg-[#0C535B] hover:text-white"
                >
                  Limpiar
                </button>
              </div>
            </form>
          )}

          {activeTab === "edit" && (
            <div className="admin-fade-up space-y-8">
              <div className="grid gap-8 xl:grid-cols-[300px_minmax(0,1fr)]">
                <aside className="space-y-5">
                  <div className="rounded-[1.75rem] border border-black/8 bg-white p-6 shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8b8d91]">
                      Edición
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#0C535B]">
                      Productos
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-[#6e7379]">
                      Usa la misma lógica visual del catálogo para encontrar el producto y editarlo más rápido.
                    </p>
                    {editingSlug && (
                      <button
                        type="button"
                        onClick={handleResetForm}
                        className="mt-5 inline-flex rounded-full border border-black/10 bg-[#f8f8f7] px-5 py-3 text-sm font-semibold text-[#0C535B] transition-colors duration-200 hover:bg-[#0C535B] hover:text-white"
                      >
                        Salir de edición
                      </button>
                    )}
                  </div>

                  <div className="rounded-[1.75rem] border border-black/8 bg-white p-6 shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-[#0C535B]">
                      Categorías
                    </h3>
                    <div className="mt-4 space-y-2">
                      <button
                        type="button"
                        onClick={() => setEditCategoryFilter("Todas")}
                        className={`block w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors duration-200 ${
                          editCategoryFilter === "Todas"
                            ? "bg-[#0C535B] text-white shadow-[0_12px_24px_rgba(22,56,79,0.18)]"
                            : "bg-[#f8f8f7] text-[#5d6167] hover:bg-[#ececea]"
                        }`}
                      >
                        Todas
                      </button>
                      {categorias.map((categoria) => (
                        <button
                          key={categoria}
                          type="button"
                          onClick={() => setEditCategoryFilter(categoria)}
                          className={`block w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors duration-200 ${
                            editCategoryFilter === categoria
                              ? "bg-[#0C535B] text-white shadow-[0_12px_24px_rgba(22,56,79,0.18)]"
                              : "bg-[#f8f8f7] text-[#5d6167] hover:bg-[#ececea]"
                          }`}
                        >
                          {categoria}
                        </button>
                      ))}
                    </div>
                  </div>
                </aside>

                <div className="space-y-8">
                  <div className="rounded-[1.75rem] border border-black/8 bg-white p-6 shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-[#4f545a]">
                        Buscar por nombre o marca
                      </span>
                      <input
                        type="search"
                        value={editSearch}
                        onChange={(event) => setEditSearch(event.target.value)}
                        placeholder="Ej: farola, Kliniu, ventilador..."
                        className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                      />
                    </label>

                    <p className="mt-4 text-sm text-[#6e7379]">
                      Mostrando {filteredProducts.length} producto{filteredProducts.length === 1 ? "" : "s"} según los filtros actuales.
                    </p>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {filteredProducts.map((product) => {
                      const inventoryTone = getInventoryTone(product.estadoInventario);

                      return (
                        <article
                          key={product.slug}
                          className={`overflow-hidden rounded-[1.75rem] border bg-white shadow-[0_16px_35px_rgba(15,23,42,0.05)] transition-transform duration-300 hover:-translate-y-1 ${
                            editingSlug === product.slug
                              ? "border-[#0C535B] ring-2 ring-[#0C535B]/12"
                              : "border-black/8"
                          }`}
                        >
                        <div className="relative">
                          <span className="absolute left-4 top-4 z-10 rounded-lg bg-[#27B1B8] px-3 py-1 text-sm font-semibold text-white">
                            {product.descuento}
                          </span>
                          <Image
                            src={product.imagen}
                            alt={product.nombre}
                            width={900}
                            height={700}
                            className="h-56 w-full object-cover"
                          />
                        </div>

                        <div className="space-y-4 p-5">
                          <div>
                            <p className="mb-2 text-xs font-medium uppercase tracking-[0.24em] text-[#8b8d91]">
                              {product.categoria} · {product.marca}
                            </p>
                            <h3 className="text-xl font-semibold leading-tight tracking-[-0.03em] text-[#1f2328]">
                              {product.nombre}
                            </h3>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="text-[#6e7379]">{product.disponibilidad}</span>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${inventoryTone.className}`}
                            >
                              {inventoryTone.label}
                            </span>
                          </div>

                          <div className="rounded-[1rem] border border-black/8 bg-[#fafaf9] px-4 py-3 text-sm text-[#5d6167]">
                            <div className="flex items-center justify-between gap-3">
                              <span>SKU</span>
                              <span className="font-semibold text-[#0C535B]">
                                {product.sku || "Sin SKU"}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-3">
                              <span>Stock</span>
                              <span className="font-semibold text-[#0C535B]">
                                {product.stock ?? 0}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-3">
                              <span>Stock mínimo</span>
                              <span className="font-semibold text-[#0C535B]">
                                {product.stockMinimo ?? 0}
                              </span>
                            </div>
                          </div>

                          <div className="border-t border-black/6 pt-4">
                            <p className="text-sm text-[#a0a3a8] line-through">
                              {product.precioAnterior}
                            </p>
                            <p className="text-3xl font-semibold tracking-[-0.03em] text-[#27B1B8]">
                              {product.precio}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => handleEditProduct(product.slug)}
                              className="inline-flex rounded-full bg-[#0C535B] px-5 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#073D43]"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(product.slug)}
                              className="inline-flex rounded-full border border-black/10 px-5 py-3 text-sm font-semibold text-[#0C535B] transition-colors duration-200 hover:bg-[#0C535B] hover:text-white"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                        </article>
                      );
                    })}
                  </div>

                  {filteredProducts.length === 0 && (
                    <div className="rounded-[1.75rem] border border-dashed border-black/12 bg-white p-10 text-center text-[#6e7379]">
                      No encontramos productos con ese nombre, marca o categoría.
                    </div>
                  )}
                </div>
              </div>

              {editingSlug && (
                <form
                  ref={editFormRef}
                  onSubmit={handleSubmit}
                  className="admin-fade-up rounded-[2rem] border border-black/8 bg-white p-6 shadow-[0_16px_35px_rgba(15,23,42,0.05)] md:p-8"
                >
                  <div className="mb-8 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8b8d91]">
                        Producto seleccionado
                      </p>
                      <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#0C535B]">
                        Actualizar producto
                      </h2>
                    </div>
                    {saved && (
                      <span className="rounded-full bg-[#0C535B] px-4 py-2 text-sm font-semibold text-white">
                        Guardado
                      </span>
                    )}
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-[#4f545a]">SKU</span>
                      <input
                        name="sku"
                        value={form.sku}
                        onChange={handleChange}
                        placeholder="Ej. FAROLA001"
                        className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-[#4f545a]">Categoría</span>
                      <select
                        name="categoria"
                        value={form.categoria}
                        onChange={handleChange}
                        className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                      >
                        {categorias.map((categoria) => (
                          <option key={categoria} value={categoria}>
                            {categoria}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-[#4f545a]">Marca</span>
                      <input
                        name="marca"
                        value={form.marca}
                        onChange={handleChange}
                        required
                        className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                      />
                    </label>

                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-[#4f545a]">Nombre del producto</span>
                      <input
                        name="nombre"
                        value={form.nombre}
                        onChange={handleChange}
                        required
                        className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-[#4f545a]">Referencia OEM</span>
                      <input
                        name="oemReferencia"
                        value={form.oemReferencia}
                        onChange={handleChange}
                        placeholder="Ej. OEM-45892"
                        className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-[#4f545a]">Referencias alternas</span>
                      <input
                        name="referenciasAlternas"
                        value={form.referenciasAlternas}
                        onChange={handleChange}
                        placeholder="Separadas por coma"
                        className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-[#4f545a]">Precio actual</span>
                      <input
                        name="precioValor"
                        type="number"
                        min="1"
                        value={form.precioValor}
                        onChange={handleChange}
                        required
                        className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-[#4f545a]">Stock actual</span>
                      <input
                        name="stock"
                        type="number"
                        min="0"
                        value={form.stock}
                        onChange={handleChange}
                        className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-[#4f545a]">Precio anterior</span>
                      <input
                        name="precioAnteriorValor"
                        type="number"
                        min="1"
                        value={form.precioAnteriorValor}
                        onChange={handleChange}
                        required
                        className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-[#4f545a]">Stock mínimo</span>
                      <input
                        name="stockMinimo"
                        type="number"
                        min="0"
                        value={form.stockMinimo}
                        onChange={handleChange}
                        className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                      />
                    </label>

                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-[#4f545a]">
                        Cambiar imagen en Supabase Storage
                      </span>
                      <input
                        key={fileInputKey}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageChange}
                        className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 file:mr-4 file:rounded-full file:border-0 file:bg-[#0C535B] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#073D43]"
                      />
                      <p className="text-xs leading-6 text-[#6e7379]">
                        Si no subes una nueva imagen, se conserva la actual.
                      </p>
                      {selectedImage && (
                        <p className="text-xs leading-6 text-[#0C535B]">
                          Archivo seleccionado: {selectedImage.name} ({Math.round(selectedImage.size / 1024)} KB)
                        </p>
                      )}
                    </label>

                    <div className="grid gap-5 md:col-span-2 md:grid-cols-3">
                      {Array.from({ length: EXTRA_IMAGE_SLOTS }, (_, index) => (
                        <label
                          key={`edit-extra-${index}`}
                          className="space-y-2 rounded-[1.4rem] border border-black/8 bg-[#fafaf9] p-4"
                        >
                          <span className="text-sm font-medium text-[#4f545a]">
                            Imagen extra {index + 1}
                          </span>
                          <input
                            key={`${fileInputKey}-edit-extra-${index}`}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleExtraImageChange(index)}
                            className="w-full rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 file:mr-3 file:rounded-full file:border-0 file:bg-[#0C535B] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-[#073D43]"
                          />
                          <p className="text-xs leading-6 text-[#6e7379]">
                            Opcional. Si no subes una nueva, se conserva la actual.
                          </p>
                          {selectedExtraImages[index] && (
                            <p className="text-xs leading-6 text-[#0C535B]">
                              Archivo: {selectedExtraImages[index]?.name} ({Math.round((selectedExtraImages[index]?.size || 0) / 1024)} KB)
                            </p>
                          )}
                          {previewExtraImageUrls[index] && (
                            <div className="overflow-hidden rounded-[1rem] border border-black/8 bg-white">
                              <Image
                                src={previewExtraImageUrls[index] || ""}
                                alt={`Imagen extra ${index + 1}`}
                                width={500}
                                height={500}
                                className="h-28 w-full object-contain bg-white"
                                unoptimized={previewExtraImageUrls[index]?.startsWith("blob:")}
                              />
                            </div>
                          )}
                        </label>
                      ))}
                    </div>

                    {previewImageUrl && (
                      <div className="md:col-span-2 rounded-[1.5rem] border border-black/8 bg-[#fafaf9] p-4">
                        <p className="text-sm font-medium text-[#4f545a]">
                          {selectedImage ? "Vista previa de la nueva imagen" : "Imagen actual del producto"}
                        </p>
                        <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-black/8 bg-white">
                          <Image
                            src={previewImageUrl}
                            alt={form.nombre || "Vista previa del producto"}
                            width={1200}
                            height={900}
                            className="h-64 w-full object-contain bg-white"
                            unoptimized={previewImageUrl.startsWith("blob:")}
                          />
                        </div>
                      </div>
                    )}

                    <ProductImageSelector
                      choices={productImageChoices}
                      primaryImageIndex={primaryImageIndex}
                      onSelect={setPrimaryImageIndex}
                      description="La imagen marcada como principal será la que verá primero el cliente."
                    />

                    <TechnicalSpecsEditor
                      items={technicalSpecs}
                      onChange={setTechnicalSpecs}
                    />

                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-[#4f545a]">Descripción comercial</span>
                      <textarea
                        name="descripcion"
                        value={form.descripcion}
                        onChange={handleChange}
                        rows={4}
                        placeholder="Describe el producto, su uso principal y el beneficio para el cliente."
                        className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm leading-7 text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                      />
                    </label>

                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-[#4f545a]">Disponibilidad</span>
                      <select
                        name="disponibilidad"
                        value={form.disponibilidad}
                        onChange={handleChange}
                        className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                      >
                        {disponibilidades.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="mt-8 flex flex-wrap gap-3">
                    {requestError && (
                      <p className="w-full rounded-2xl border border-[#27B1B8]/20 bg-[#EAF8F6] px-4 py-3 text-sm font-medium text-[#0C535B]">
                        {requestError}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={isSavingProduct}
                      className="inline-flex rounded-full bg-[#27B1B8] px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#1E969B]"
                    >
                      {isSavingProduct ? "Guardando..." : "Guardar cambios"}
                    </button>
                    <button
                      type="button"
                      onClick={handleResetForm}
                      className="inline-flex rounded-full border border-black/10 px-6 py-3 text-sm font-semibold text-[#0C535B] transition-colors duration-200 hover:bg-[#0C535B] hover:text-white"
                    >
                      Cancelar edición
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === "orders" && (
            <div className="admin-fade-up space-y-8">
              <div
                className={
                  selectedOrder && selectedOrderPreview
                    ? "space-y-8"
                    : "mx-auto w-full max-w-[980px] space-y-5"
                }
              >
                <aside
                  className={`space-y-5 ${
                    selectedOrder && selectedOrderPreview ? "hidden" : ""
                  }`}
                >
                  <div className="rounded-[1.75rem] border border-black/8 bg-white p-6 shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8b8d91]">
                      Pedidos
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#0C535B]">
                      Gestión de envíos
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-[#6e7379]">
                      Aquí controlas el estado logístico del pedido, la transportadora y el número de guía que verá el cliente.
                    </p>
                  </div>

                  <div className="rounded-[1.75rem] border border-black/8 bg-white p-6 shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-[#4f545a]">
                        Buscar por pedido, cliente o guía
                      </span>
                      <input
                        type="search"
                        value={orderSearch}
                        onChange={(event) => setOrderSearch(event.target.value)}
                        placeholder="Ej: cm..., Brandon, 12345..."
                        className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                      />
                    </label>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setOrderShippingFilter("all")}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
                          orderShippingFilter === "all"
                            ? "bg-[#0C535B] text-white"
                            : "border border-black/10 bg-[#fafaf9] text-[#5d6167] hover:bg-[#ececea]"
                        }`}
                      >
                        Todos
                      </button>
                      {shippingStatuses.map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setOrderShippingFilter(status)}
                          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
                            orderShippingFilter === status
                              ? "bg-[#6366f1] text-white"
                              : "border border-black/10 bg-[#fafaf9] text-[#5d6167] hover:bg-[#ececea]"
                          }`}
                        >
                          {getShippingStatusLabel(status)}
                        </button>
                      ))}
                    </div>

                    <p className="mt-5 text-sm text-[#6e7379]">
                      Mostrando {filteredOrders.length} pedido{filteredOrders.length === 1 ? "" : "s"}.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {isLoadingOrders ? (
                      <div className="rounded-[1.5rem] border border-black/8 bg-white p-5 text-sm text-[#6e7379] shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
                        Cargando pedidos...
                      </div>
                    ) : filteredOrders.length === 0 ? (
                      <div className="rounded-[1.5rem] border border-dashed border-black/12 bg-white p-5 text-sm leading-7 text-[#6e7379] shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
                        Aún no hay pedidos que coincidan con los filtros actuales.
                      </div>
                    ) : (
                      filteredOrders.map((order) => {
                        const previewItems = order.items
                          .map((item) => {
                            const normalizedItemName = normalizeComparableText(item.name);
                            const fallbackBySlug = item.productId
                              ? adminProducts.find((product) => product.slug === item.productId)
                              : null;
                            const fallbackByName =
                              fallbackBySlug ||
                              adminProducts.find((product) => {
                                const normalizedProductName = normalizeComparableText(product.nombre);

                                return (
                                  normalizedProductName === normalizedItemName ||
                                  normalizedProductName.includes(normalizedItemName) ||
                                  normalizedItemName.includes(normalizedProductName)
                                );
                              });
                            const fallbackImage = item.productId
                              ? fallbackBySlug?.imagen || fallbackByName?.imagen || null
                              : null;

                            return {
                              name: item.name,
                              image: item.image || fallbackImage || fallbackByName?.imagen || null,
                            };
                          })
                          .filter(
                            (item): item is { name: string; image: string } => Boolean(item.image),
                          )
                          .slice(0, 3);

                        return (
                          <button
                            key={order.id}
                            type="button"
                            onClick={() => {
                              setSelectedOrderId(order.id);
                              setOrderForm(getOrderEditState(order));
                            }}
                            className={`block w-full rounded-[1.5rem] border px-5 py-5 text-left shadow-[0_14px_28px_rgba(15,23,42,0.05)] transition-all duration-200 ${
                              selectedOrderId === order.id
                                ? "border-[#0C535B]/22 bg-white shadow-[0_18px_32px_rgba(22,56,79,0.12)] ring-2 ring-[#0C535B]/12"
                                : "border-black/8 bg-white hover:-translate-y-0.5 hover:border-[#0C535B]/18"
                            }`}
                          >
                            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] xl:grid-cols-[minmax(220px,0.9fr)_minmax(320px,1.1fr)_minmax(180px,auto)] xl:items-center">
                              <div className="min-w-0">
                                <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#8b8d91]">
                                  Pedido
                                </p>
                                <p className="mt-3 break-words text-[1.42rem] font-semibold leading-tight text-[#1f2328]">
                                  {order.id}
                                </p>
                                <p className="mt-3 text-[15px] text-[#5d6167]">
                                  {order.customerName} · {order.city}
                                </p>
                                <p className="mt-1 text-[15px] text-[#7a7f86]">
                                  {new Date(order.createdAt).toLocaleDateString("es-CO")} · {order.totalItems} producto
                                  {order.totalItems === 1 ? "" : "s"}
                                </p>
                                <p className="mt-5 text-[1.45rem] font-semibold text-[#27B1B8]">
                                  {formatCurrency(order.subtotal)}
                                </p>
                                <div className="mt-4 border-t border-black/8 pt-3">
                                  <p className="line-clamp-2 text-[13px] leading-5 text-[#7a7f86]">
                                    {order.items[0]?.name || "Pedido con productos varios"}
                                  </p>
                                </div>
                              </div>

                              <div className="min-w-0 lg:row-start-2 lg:col-span-2 xl:row-start-auto xl:col-span-1">
                                {previewItems.length > 0 ? (
                                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:justify-items-center">
                                    {previewItems.map((item, index) => (
                                      <div
                                        key={`${order.id}-preview-${index}`}
                                        className="min-w-0 max-w-[118px] text-center"
                                      >
                                        <div className="mx-auto h-[94px] w-full overflow-hidden rounded-[0.95rem] border border-black/8 bg-white shadow-[0_10px_20px_rgba(15,23,42,0.12)]">
                                          <Image
                                            src={item.image}
                                            alt={`Producto ${index + 1} del pedido ${order.id}`}
                                            width={118}
                                            height={94}
                                            sizes="118px"
                                            className="h-full w-full object-cover"
                                          />
                                        </div>
                                        <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-[#5d6167]">
                                          {item.name || "Producto"}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="flex h-[94px] w-[118px] items-center justify-center rounded-[0.95rem] border border-black/8 bg-[#0C535B] text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_10px_20px_rgba(15,23,42,0.12)]">
                                    {order.items[0]?.name?.slice(0, 2) || "UP"}
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-3 lg:justify-end lg:self-start xl:flex-col xl:items-end xl:justify-center">
                                <span className="rounded-full bg-[#EAF8F6] px-4 py-2 text-sm font-semibold text-[#0C535B]">
                                  {getPaymentStatusLabel(order.paymentStatus)}
                                </span>
                                <span className="hidden text-black/20 xl:inline">|</span>
                                <span className="rounded-full bg-[#effaf2] px-4 py-2 text-sm font-semibold text-[#1f6b39]">
                                  {getShippingStatusLabel(order.shippingStatus)}
                                </span>
                                <span className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full text-[#27B1B8] lg:ml-0">
                                  <svg
                                    aria-hidden="true"
                                    viewBox="0 0 24 24"
                                    className="h-5 w-5"
                                    fill="currentColor"
                                  >
                                    <path d="m8 5 8 7-8 7z" />
                                  </svg>
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </aside>

                <div
                  className={
                    selectedOrder && selectedOrderPreview ? "space-y-8" : "hidden"
                  }
                >
                  {!selectedOrder || !selectedOrderPreview ? null : (
                    <>
                      <button
                        type="button"
                        onClick={() => setSelectedOrderId(null)}
                        className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-[#0C535B] transition-colors duration-200 hover:bg-[#0C535B] hover:text-white"
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m15 18-6-6 6-6" />
                        </svg>
                        Atrás
                      </button>

                      <div className="rounded-[1.75rem] border border-black/8 bg-white p-6 shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8b8d91]">
                              Pedido seleccionado
                            </p>
                            <h3 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#0C535B]">
                              {selectedOrderPreview.id}
                            </h3>
                            <p className="mt-3 text-sm leading-7 text-[#6e7379]">
                              {selectedOrderPreview.customerName} · {selectedOrderPreview.customerEmail} · {selectedOrderPreview.customerPhone}
                            </p>
                            <p className="text-sm leading-7 text-[#6e7379]">
                              {selectedOrderPreview.department}, {selectedOrderPreview.city} · {selectedOrderPreview.addressLine1}
                              {selectedOrderPreview.addressLine2 ? ` · ${selectedOrderPreview.addressLine2}` : ""}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-[#0C535B] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                              {selectedOrderPreview.status}
                            </span>
                            <span className="rounded-full border border-[#27B1B8]/18 bg-[#EAF8F6] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#0C535B]">
                              {getPaymentStatusLabel(selectedOrderPreview.paymentStatus)}
                            </span>
                            <span className="rounded-full border border-[#1f8b45]/18 bg-[#effaf2] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#1f6b39]">
                              {getShippingStatusLabel(selectedOrderPreview.shippingStatus)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_320px]">
                          <div className="rounded-[1.4rem] border border-black/8 bg-[#fafaf9] p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b8d91]">
                                  Resumen del pedido
                                </p>
                                <p className="mt-2 text-sm text-[#6e7379]">
                                  Revisa qué compró el cliente antes de actualizar envío y guía.
                                </p>
                              </div>
                              <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0C535B] shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
                                {selectedOrderPreview.totalItems} producto
                                {selectedOrderPreview.totalItems === 1 ? "" : "s"}
                              </span>
                            </div>

                            <div className="mt-5 space-y-3">
                              {selectedOrderPreview.items.map((item) => (
                                <div
                                  key={`summary-${item.id}`}
                                  className="rounded-[1rem] border border-black/8 bg-white px-4 py-4"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-semibold text-[#1f2328]">
                                        {item.name}
                                      </p>
                                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#8b8d91]">
                                        Cantidad
                                      </p>
                                      <p className="mt-1 text-sm font-medium text-[#5d6167]">
                                        {item.quantity}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-xs uppercase tracking-[0.18em] text-[#8b8d91]">
                                        Precio unidad
                                      </p>
                                      <p className="mt-1 text-sm font-semibold text-[#0C535B]">
                                        {formatCurrency(item.unitPrice)}
                                      </p>
                                      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#8b8d91]">
                                        Subtotal
                                      </p>
                                      <p className="mt-1 text-sm font-semibold text-[#27B1B8]">
                                        {formatCurrency(item.lineTotal)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="grid gap-3">
                            <div className="rounded-[1.4rem] border border-black/8 bg-[#fafaf9] px-5 py-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b8d91]">
                                Total del pedido
                              </p>
                              <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#27B1B8]">
                                {formatCurrency(selectedOrderPreview.subtotal)}
                              </p>
                            </div>
                            <div className="rounded-[1.4rem] border border-black/8 bg-[#fafaf9] px-5 py-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b8d91]">
                                Transportadora actual
                              </p>
                              <p className="mt-2 text-sm font-semibold text-[#0C535B]">
                                {selectedOrderPreview.carrier || "Por definir"}
                              </p>
                            </div>
                            <div className="rounded-[1.4rem] border border-black/8 bg-[#fafaf9] px-5 py-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b8d91]">
                                Guía actual
                              </p>
                              <p className="mt-2 text-sm font-semibold text-[#0C535B]">
                                {selectedOrderPreview.trackingNumber || "Aún no asignada"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6">
                          <AdminOrderProgress order={selectedOrderPreview} />
                        </div>

                        <div className="mt-6 grid gap-5 md:grid-cols-2">
                          <label className="space-y-2">
                            <span className="text-sm font-medium text-[#4f545a]">Estado de envío</span>
                            <select
                              name="shippingStatus"
                              value={orderForm.shippingStatus}
                              onChange={handleOrderFieldChange}
                              className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                            >
                              {shippingStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {getShippingStatusLabel(status)}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="space-y-2">
                            <span className="text-sm font-medium text-[#4f545a]">Estado de pago</span>
                            <select
                              name="paymentStatus"
                              value={orderForm.paymentStatus}
                              onChange={handleOrderFieldChange}
                              className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                            >
                              {paymentStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {getPaymentStatusLabel(status)}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="space-y-2">
                            <span className="text-sm font-medium text-[#4f545a]">Transportadora</span>
                            <input
                              name="carrier"
                              value={orderForm.carrier}
                              onChange={handleOrderFieldChange}
                              placeholder="Ej. Coordinadora, Servientrega..."
                              className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                            />
                          </label>

                          <label className="space-y-2">
                            <span className="text-sm font-medium text-[#4f545a]">Número de guía</span>
                            <input
                              name="trackingNumber"
                              value={orderForm.trackingNumber}
                              onChange={handleOrderFieldChange}
                              placeholder="Ej. 123456789"
                              className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                            />
                          </label>

                          <label className="space-y-2 md:col-span-2">
                            <span className="text-sm font-medium text-[#4f545a]">Notas internas del envío</span>
                            <textarea
                              name="adminNotes"
                              value={orderForm.adminNotes}
                              onChange={handleOrderFieldChange}
                              rows={4}
                              placeholder="Ej. Sale hoy en la tarde, cliente pidió entregar en portería..."
                              className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                            />
                          </label>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={handleSaveOrder}
                            disabled={isSavingOrder}
                            className="inline-flex rounded-full bg-[#0C535B] px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#073D43] disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {isSavingOrder ? "Guardando..." : "Actualizar pedido"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void loadOrders()}
                            className="inline-flex rounded-full border border-black/10 px-6 py-3 text-sm font-semibold text-[#0C535B] transition-colors duration-200 hover:bg-[#0C535B] hover:text-white"
                          >
                            Recargar pedidos
                          </button>
                        </div>
                      </div>

                      <div className="rounded-[1.75rem] border border-black/8 bg-white p-6 shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
                        <h3 className="text-2xl font-semibold tracking-[-0.04em] text-[#0C535B]">
                          Productos del pedido
                        </h3>
                        <div className="mt-5 grid gap-3 md:grid-cols-2">
                          {selectedOrder.items.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-[1.1rem] border border-black/8 bg-[#fafaf9] px-4 py-4"
                            >
                              <p className="text-sm font-semibold text-[#1f2328]">{item.name}</p>
                              <div className="mt-2 flex items-center justify-between text-sm text-[#6e7379]">
                                <span>Cantidad: {item.quantity}</span>
                                <span className="font-semibold text-[#0C535B]">
                                  {formatCurrency(item.unitPrice)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-black/8 pt-4 text-sm">
                          <span className="text-[#6e7379]">
                            {selectedOrder.totalItems} producto{selectedOrder.totalItems === 1 ? "" : "s"}
                          </span>
                          <span className="text-lg font-semibold text-[#27B1B8]">
                            {formatCurrency(selectedOrder.subtotal)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "inventory" && (
            <div className="admin-fade-up space-y-8">
              <div className="grid gap-8 xl:grid-cols-[300px_minmax(0,1fr)]">
                <aside className="space-y-5">
                  <div className="rounded-[1.75rem] border border-black/8 bg-white p-6 shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8b8d91]">
                      Inventario
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#0C535B]">
                      Control rápido
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-[#6e7379]">
                      Ajusta existencias sin abrir el editor completo y revisa los últimos movimientos del stock.
                    </p>
                  </div>

                  <div className="rounded-[1.75rem] border border-black/8 bg-white p-6 shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-[#0C535B]">
                      Categorías
                    </h3>
                    <div className="mt-4 space-y-2">
                      <button
                        type="button"
                        onClick={() => setEditCategoryFilter("Todas")}
                        className={`block w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors duration-200 ${
                          editCategoryFilter === "Todas"
                            ? "bg-[#0C535B] text-white shadow-[0_12px_24px_rgba(22,56,79,0.18)]"
                            : "bg-[#f8f8f7] text-[#5d6167] hover:bg-[#ececea]"
                        }`}
                      >
                        Todas
                      </button>
                      {categorias.map((categoria) => (
                        <button
                          key={categoria}
                          type="button"
                          onClick={() => setEditCategoryFilter(categoria)}
                          className={`block w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors duration-200 ${
                            editCategoryFilter === categoria
                              ? "bg-[#0C535B] text-white shadow-[0_12px_24px_rgba(22,56,79,0.18)]"
                              : "bg-[#f8f8f7] text-[#5d6167] hover:bg-[#ececea]"
                          }`}
                        >
                          {categoria}
                        </button>
                      ))}
                    </div>
                  </div>
                </aside>

                <div className="space-y-8">
                  <div className="rounded-[1.75rem] border border-black/8 bg-white p-6 shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-[#4f545a]">
                        Buscar por nombre, marca o SKU
                      </span>
                      <input
                        type="search"
                        value={editSearch}
                        onChange={(event) => setEditSearch(event.target.value)}
                        placeholder="Ej: farola, Kliniu, FAROLA001..."
                        className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                      />
                    </label>

                    <p className="mt-4 text-sm text-[#6e7379]">
                      Mostrando {filteredProducts.length} producto{filteredProducts.length === 1 ? "" : "s"} para control de stock.
                    </p>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setInventoryStatusFilter("all")}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
                          inventoryStatusFilter === "all"
                            ? "bg-[#0C535B] text-white"
                            : "border border-black/10 bg-[#fafaf9] text-[#5d6167] hover:bg-[#ececea]"
                        }`}
                      >
                        Todos
                      </button>
                      <button
                        type="button"
                        onClick={() => setInventoryStatusFilter("low-stock")}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
                          inventoryStatusFilter === "low-stock"
                            ? "bg-[#27B1B8] text-white"
                            : "border border-[#27B1B8]/20 bg-[#EAF8F6] text-[#0C535B] hover:bg-[#D8F1EE]"
                        }`}
                      >
                        Solo stock bajo
                      </button>
                      <button
                        type="button"
                        onClick={() => setInventoryStatusFilter("out-of-stock")}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
                          inventoryStatusFilter === "out-of-stock"
                            ? "bg-[#c53b3b] text-white"
                            : "border border-[#c53b3b]/20 bg-[#fff1f1] text-[#c53b3b] hover:bg-[#ffe2e2]"
                        }`}
                      >
                        Solo agotados
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    {filteredProducts.map((product) => {
                      const inventoryTone = getInventoryTone(product.estadoInventario);
                      const adjustmentValue = inventoryAdjustments[product.slug] || "";

                      return (
                        <article
                          key={`inventory-${product.slug}`}
                          className="rounded-[1.5rem] border border-black/8 bg-white p-5 shadow-[0_14px_28px_rgba(15,23,42,0.05)]"
                        >
                          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex min-w-0 items-center gap-4">
                              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[1rem] border border-black/8 bg-[#fafaf9]">
                                <Image
                                  src={product.imagen}
                                  alt={product.nombre}
                                  fill
                                  sizes="96px"
                                  className="object-cover"
                                />
                              </div>

                              <div className="min-w-0">
                                <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#8b8d91]">
                                  {product.categoria} · {product.marca}
                                </p>
                                <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#1f2328]">
                                  {product.nombre}
                                </h3>
                                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                                  <span className="rounded-full border border-black/8 bg-[#fafaf9] px-3 py-1 text-[#5d6167]">
                                    SKU: {product.sku || "Sin SKU"}
                                  </span>
                                  <span className={`rounded-full px-3 py-1 font-semibold ${inventoryTone.className}`}>
                                    {inventoryTone.label}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[540px]">
                              <div className="rounded-[1.1rem] border border-black/8 bg-[#fafaf9] px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b8d91]">
                                  Stock actual
                                </p>
                                <p className="mt-2 text-2xl font-semibold text-[#0C535B]">
                                  {product.stock ?? 0}
                                </p>
                              </div>

                              <div className="rounded-[1.1rem] border border-black/8 bg-[#fafaf9] px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b8d91]">
                                  Stock mínimo
                                </p>
                                <p className="mt-2 text-2xl font-semibold text-[#0C535B]">
                                  {product.stockMinimo ?? 0}
                                </p>
                              </div>

                              <div className="rounded-[1.1rem] border border-black/8 bg-[#fafaf9] px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b8d91]">
                                  Ajuste rápido
                                </p>
                                <input
                                  type="number"
                                  value={adjustmentValue}
                                  onChange={(event) =>
                                    setInventoryAdjustments((current) => ({
                                      ...current,
                                      [product.slug]: event.target.value,
                                    }))
                                  }
                                  placeholder="+5 o -2"
                                  className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                handleQuickInventoryAdjust(
                                  product.slug,
                                  Number(adjustmentValue || 0),
                                )
                              }
                              className="inline-flex rounded-full bg-[#0C535B] px-5 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#073D43]"
                            >
                              Aplicar ajuste
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleQuickInventoryAdjust(
                                  product.slug,
                                  1,
                                  "Entrada rápida de una unidad",
                                )
                              }
                              className="inline-flex rounded-full border border-[#1f8b45]/20 bg-[#effaf2] px-5 py-3 text-sm font-semibold text-[#1f6b39] transition-colors duration-200 hover:bg-[#dcf5e4]"
                            >
                              +1 unidad
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleQuickInventoryAdjust(
                                  product.slug,
                                  -1,
                                  "Salida rápida de una unidad",
                                )
                              }
                              className="inline-flex rounded-full border border-[#27B1B8]/20 bg-[#EAF8F6] px-5 py-3 text-sm font-semibold text-[#0C535B] transition-colors duration-200 hover:bg-[#D8F1EE]"
                            >
                              -1 unidad
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditProduct(product.slug)}
                              className="inline-flex rounded-full border border-black/10 px-5 py-3 text-sm font-semibold text-[#0C535B] transition-colors duration-200 hover:bg-[#0C535B] hover:text-white"
                            >
                              Editar completo
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <div className="rounded-[1.75rem] border border-black/8 bg-white p-6 shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8b8d91]">
                          Movimientos
                        </p>
                        <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#0C535B]">
                          Últimos cambios de inventario
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => void loadInventoryMovements()}
                        className="inline-flex rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-[#0C535B] transition-colors duration-200 hover:bg-[#0C535B] hover:text-white"
                      >
                        Recargar
                      </button>
                    </div>

                    <div className="mt-5 space-y-3">
                      {isLoadingInventory ? (
                        <p className="text-sm text-[#6e7379]">Cargando movimientos...</p>
                      ) : inventoryMovements.length === 0 ? (
                        <p className="text-sm text-[#6e7379]">
                          Aún no hay movimientos recientes para mostrar.
                        </p>
                      ) : (
                        inventoryMovements.map((movement) => (
                          <div
                            key={movement.id}
                            className="rounded-[1.1rem] border border-black/8 bg-[#fafaf9] px-4 py-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-[#1f2328]">
                                  {movement.productName}
                                </p>
                                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#8b8d91]">
                                  {movement.productSku || "Sin SKU"} · {movement.type}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className={`text-sm font-semibold ${movement.quantity >= 0 ? "text-[#1f6b39]" : "text-[#0C535B]"}`}>
                                  {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
                                </p>
                                <p className="mt-1 text-xs text-[#6e7379]">
                                  Stock final: {movement.stockAfter}
                                </p>
                              </div>
                            </div>
                            {movement.note && (
                              <p className="mt-3 text-sm text-[#5d6167]">{movement.note}</p>
                            )}
                            <p className="mt-2 text-xs text-[#8b8d91]">
                              {new Date(movement.createdAt).toLocaleString("es-CO")}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </section>
    </main>
  );
}
