"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function EmpleadoLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<{ fullName?: string; role?: string } | null>(null);

  useEffect(() => {
    fetch("/api/account")
      .then((r) => r.json())
      .then((d) => {
        const u = d?.user ?? d;
        if (!u || u.role !== "EMPLOYEE") {
          router.replace("/login");
        } else {
          setUser(u);
        }
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] font-sans">
      <header className="flex items-center justify-between border-b border-[#E2E8F0] bg-white px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#27B1B8] text-sm font-black text-white">
            K
          </div>
          <div>
            <p className="text-xs font-black leading-none text-[#1A1A1A]">Portal Empleado</p>
            <p className="text-[10px] font-semibold text-[#27B1B8]">Kliniu</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user && <p className="text-xs font-bold text-[#1A1A1A]">{user.fullName ?? "—"}</p>}
          <button
            onClick={logout}
            className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-500 transition-colors hover:bg-red-100"
          >
            Cerrar sesión
          </button>
        </div>
      </header>
      <div>{children}</div>
    </div>
  );
}
