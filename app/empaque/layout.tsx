"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function EmpaqueLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<{ fullName?: string; role?: string } | null>(null);

  useEffect(() => {
    fetch("/api/account")
      .then((r) => r.json())
      .then((d) => {
        const u = d?.user ?? d;
        if (!u || u.role !== "PACKING") {
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
    <div className="flex min-h-screen bg-[#F4F6F8] font-sans">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-[#E2E8F0] bg-white" style={{ minHeight: "100vh", position: "sticky", top: 0, height: "100vh" }}>
        <div className="flex items-center gap-2 border-b border-[#E2E8F0] px-4 py-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F07826] text-sm font-black text-white">
            K
          </div>
          <div>
            <p className="text-xs font-black leading-none text-[#1A1A1A]">Empaque</p>
            <p className="text-[10px] font-semibold text-[#F07826]">Kliniu</p>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3">
          <div className="flex items-center gap-3 rounded-xl bg-[#F07826] px-3 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(240,120,38,0.3)]">
            <span className="text-base">📦</span>
            <span>Pedidos</span>
          </div>
        </nav>

        <div className="border-t border-[#E2E8F0] p-3 space-y-2">
          {user && (
            <div className="rounded-xl bg-[#F8FAFC] p-2.5">
              <p className="truncate text-xs font-bold text-[#1A1A1A]">{user.fullName ?? "—"}</p>
              <p className="truncate text-[10px] text-[#94A3B8]">Empaque</p>
            </div>
          )}
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-500 transition-colors hover:bg-red-100"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
