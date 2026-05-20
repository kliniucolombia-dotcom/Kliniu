"use client";

import { usePathname } from "next/navigation";
import SiteHeader from "./site-header";
import SupportChat from "./support-chat";

type Props = {
  currentUser: { fullName: string; role: "CUSTOMER" | "ADMIN" | "SELLER" } | null;
  children: React.ReactNode;
};

export default function ConditionalShell({ currentUser, children }: Props) {
  const pathname = usePathname();
  const isPanelRoute = pathname.startsWith("/panel");

  return (
    <>
      {!isPanelRoute && <SiteHeader currentUser={currentUser} />}
      {children}
      {!isPanelRoute && <SupportChat />}
    </>
  );
}
