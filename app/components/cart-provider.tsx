"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartItem = {
  id: string;
  nombre: string;
  precio: string;
  precioOriginal?: string;
  imagen: string;
  cantidad: number;
};

function normalizeCartId(id: string) {
  return id.replace(/^(home|catalogo|detalle)-/, "");
}

function normalizeCartItems(items: CartItem[]) {
  return items.reduce<CartItem[]>((acc, item) => {
    const normalizedId = normalizeCartId(item.id);
    const existing = acc.find((entry) => entry.id === normalizedId);

    if (existing) {
      existing.cantidad += item.cantidad;
      return acc;
    }

    acc.push({ ...item, id: normalizedId });
    return acc;
  }, []);
}

function mergeCartItem(
  items: CartItem[],
  item: Omit<CartItem, "cantidad"> & { cantidad?: number },
  quantityToAdd: number,
  normalizedId: string,
) {
  const existing = items.find((entry) => entry.id === normalizedId);

  if (existing) {
    return items.map((entry) =>
      entry.id === normalizedId
        ? {
            ...entry,
            precio: item.precio,
            precioOriginal: item.precioOriginal,
            cantidad: entry.cantidad + quantityToAdd,
          }
        : entry,
    );
  }

  return [
    ...items,
    { ...item, id: normalizedId, cantidad: quantityToAdd },
  ];
}

type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  totalProducts: number;
  addItem: (item: Omit<CartItem, "cantidad"> & { cantidad?: number }) => void;
  incrementItem: (id: string) => void;
  decrementItem: (id: string) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "kliniu-cart";
const SYNC_KEY = "kliniu-cart-synced-user";

type CartProviderProps = {
  children: ReactNode;
  initialItems: CartItem[];
  currentUserId: string | null;
};

function readStoredCart() {
  if (typeof window === "undefined") return [];
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    return normalizeCartItems(JSON.parse(stored));
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

export function CartProvider({
  children,
  initialItems,
  currentUserId,
}: CartProviderProps) {
  const [items, setItems] = useState<CartItem[]>(initialItems);
  const [cartHydrated, setCartHydrated] = useState(false);

  useEffect(() => {
    if (currentUserId) {
      setCartHydrated(true);
      return;
    }

    setItems(readStoredCart());
    setCartHydrated(true);
  }, [currentUserId]);

  useEffect(() => {
    if (typeof window === "undefined" || !cartHydrated) return;

    if (!currentUserId) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      return;
    }

    window.localStorage.removeItem(STORAGE_KEY);
  }, [cartHydrated, currentUserId, items]);

  useEffect(() => {
    if (typeof window === "undefined" || !currentUserId) return;

    const syncKey = `${SYNC_KEY}:${currentUserId}`;
    if (window.sessionStorage.getItem(syncKey) === "done") return;

    const guestItems = readStoredCart();
    if (guestItems.length === 0) {
      window.sessionStorage.setItem(syncKey, "done");
      return;
    }

    void (async () => {
      const response = await fetch("/api/cart/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items: guestItems }),
      });

      if (!response.ok) return;

      const payload = (await response.json()) as { items?: CartItem[] };
      if (payload.items) {
        setItems(payload.items);
      }
      window.localStorage.removeItem(STORAGE_KEY);
      window.sessionStorage.setItem(syncKey, "done");
    })();
  }, [currentUserId]);

  const value = useMemo(
    () => ({
      items,
      totalItems: items.reduce((acc, item) => acc + item.cantidad, 0),
      totalProducts: items.length,
      addItem: (item: Omit<CartItem, "cantidad"> & { cantidad?: number }) => {
        const normalizedId = normalizeCartId(item.id);
        const quantityToAdd = Math.max(1, Math.trunc(item.cantidad ?? 1));

        setItems((current) =>
          mergeCartItem(current, item, quantityToAdd, normalizedId),
        );

        if (currentUserId) {
          void (async () => {
            const response = await fetch("/api/cart", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                ...item,
                id: normalizedId,
                cantidad: quantityToAdd,
              }),
            });
            if (!response.ok) return;
            const payload = (await response.json()) as { items?: CartItem[] };
            if (payload.items) {
              setItems(payload.items);
            }
          })();
          return;
        }
      },
      incrementItem: (id: string) => {
        const normalizedId = normalizeCartId(id);

        if (currentUserId) {
          void (async () => {
            const response = await fetch(`/api/cart/${normalizedId}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ action: "increment" }),
            });
            if (!response.ok) return;
            const payload = (await response.json()) as { items?: CartItem[] };
            if (payload.items) {
              setItems(payload.items);
            }
          })();
          return;
        }

        setItems((current) =>
          current.map((item) =>
            item.id === normalizedId
              ? { ...item, cantidad: item.cantidad + 1 }
              : item,
          ),
        );
      },
      decrementItem: (id: string) => {
        const normalizedId = normalizeCartId(id);

        if (currentUserId) {
          void (async () => {
            const response = await fetch(`/api/cart/${normalizedId}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ action: "decrement" }),
            });
            if (!response.ok) return;
            const payload = (await response.json()) as { items?: CartItem[] };
            if (payload.items) {
              setItems(payload.items);
            }
          })();
          return;
        }

        setItems((current) =>
          current.flatMap((item) => {
            if (item.id !== normalizedId) return [item];
            if (item.cantidad <= 1) return [];
            return [{ ...item, cantidad: item.cantidad - 1 }];
          }),
        );
      },
      removeItem: (id: string) => {
        const normalizedId = normalizeCartId(id);

        if (currentUserId) {
          void (async () => {
            const response = await fetch(`/api/cart/${normalizedId}`, {
              method: "DELETE",
            });
            if (!response.ok) return;
            const payload = (await response.json()) as { items?: CartItem[] };
            if (payload.items) {
              setItems(payload.items);
            }
          })();
          return;
        }

        setItems((current) =>
          current.filter((item) => item.id !== normalizedId),
        );
      },
      clearCart: () => {
        if (currentUserId) {
          void (async () => {
            const response = await fetch("/api/cart", {
              method: "DELETE",
            });
            if (!response.ok) return;
            setItems([]);
          })();
          return;
        }

        setItems([]);
      },
    }),
    [currentUserId, items],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
