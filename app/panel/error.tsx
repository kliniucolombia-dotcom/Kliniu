"use client";

import ErrorScreen from "@/app/components/error-screen";

// Queda dentro del layout del panel: el menú lateral sigue disponible.
export default function PanelError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorScreen reset={reset} digest={error.digest} homeHref="/panel" homeLabel="Ir al panel" compact />;
}
