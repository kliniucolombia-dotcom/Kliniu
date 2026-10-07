"use client";

import "./globals.css";
import ErrorScreen from "@/app/components/error-screen";

// Reemplaza al root layout cuando el error ocurre ahí: debe traer su propio <html> y <body>.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body>
        <ErrorScreen reset={reset} digest={error.digest} />
      </body>
    </html>
  );
}
