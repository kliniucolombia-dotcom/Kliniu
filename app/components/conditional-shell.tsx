"use client";

import { usePathname } from "next/navigation";
import SiteHeader from "./site-header";
import SupportChat from "./support-chat";
import type { UserRole } from "@/generated/prisma/client";

type Props = {
  currentUser: { fullName: string; role: UserRole } | null;
  children: React.ReactNode;
};

export default function ConditionalShell({ currentUser, children }: Props) {
  const pathname = usePathname();
  const isPanelRoute = pathname.startsWith("/panel") || pathname.startsWith("/empaque") || pathname.startsWith("/imprimir-cotizacion") || pathname.startsWith("/empleado");

  return (
    <>
      {!isPanelRoute && <SiteHeader currentUser={currentUser} />}
      <div className={!isPanelRoute ? "pt-[62px] pb-16 lg:pt-[66px] lg:pb-0" : undefined}>
        {children}
      </div>
      {!isPanelRoute && <SupportChat />}
    </>
  );
}
