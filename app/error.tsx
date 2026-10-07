"use client";

import ErrorScreen from "@/app/components/error-screen";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorScreen reset={reset} digest={error.digest} />;
}
