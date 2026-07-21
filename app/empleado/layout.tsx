"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  MdHome, MdPerson, MdBeachAccess, MdEventNote, MdHealthAndSafety, MdFolder, MdLogout,
  MdPayments, MdAccessTime, MdCardGiftcard, MdDescription, MdArticle, MdAccountTree,
} from "react-icons/md";

const NAV = [
  { href: "/empleado", label: "Inicio", Icon: MdHome },
  { href: "/empleado/perfil", label: "Mi perfil", Icon: MdPerson },
  { href: "/empleado/vacaciones", label: "Vacaciones", Icon: MdBeachAccess },
  { href: "/empleado/permisos", label: "Permisos", Icon: MdEventNote },
  { href: "/empleado/incapacidades", label: "Incapacidades", Icon: MdHealthAndSafety },
  { href: "/empleado/horas-extras", label: "Horas extras", Icon: MdAccessTime },
  { href: "/empleado/solicitudes", label: "Mis solicitudes", Icon: MdFolder },
  { href: "/empleado/nomina", label: "Nómina", Icon: MdPayments },
  { href: "/empleado/beneficios", label: "Beneficios", Icon: MdCardGiftcard },
  { href: "/empleado/documentos", label: "Documentos", Icon: MdDescription },
  { href: "/empleado/noticias", label: "Noticias", Icon: MdArticle },
  { href: "/empleado/organigrama", label: "Organigrama", Icon: MdAccountTree },
];

export default function EmpleadoLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
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
    <div className="flex min-h-screen bg-[#F4F6F8] font-sans">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-[#E2E8F0] bg-white md:flex">
        <div className="flex items-center gap-2 border-b border-[#E2E8F0] px-5 py-4">
          <Image src="/foca-icono-redondo.png" alt="Kliniu" width={32} height={32} className="h-8 w-8 shrink-0 rounded-full" />
          <div>
            <p className="text-xs font-black leading-none text-[#1A1A1A]">Portal Empleado</p>
            <p className="text-[10px] font-semibold text-[#27B1B8]">Kliniu</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                  active ? "bg-[#E6FAFB] text-[#27B1B8]" : "text-[#64748B] hover:bg-[#F4F6F8]"
                }`}>
                <item.Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[#E2E8F0] p-3">
          <button onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50">
            <MdLogout size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-[#E2E8F0] bg-white px-5 py-4 md:hidden">
          <div className="flex items-center gap-2">
            <Image src="/foca-icono-redondo.png" alt="Kliniu" width={32} height={32} className="h-8 w-8 shrink-0 rounded-full" />
            <p className="text-xs font-black leading-none text-[#1A1A1A]">Portal Empleado</p>
          </div>
          <button onClick={logout}
            className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-500 transition-colors hover:bg-red-100">
            Cerrar sesión
          </button>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-[#E2E8F0] bg-white px-3 py-2 md:hidden">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active ? "bg-[#E6FAFB] text-[#27B1B8]" : "text-[#64748B]"
                }`}>
                <item.Icon size={14} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <header className="hidden items-center justify-end gap-3 border-b border-[#E2E8F0] bg-white px-6 py-4 md:flex">
          {user && <p className="text-sm font-bold text-[#1A1A1A]">{user.fullName ?? "—"}</p>}
        </header>
        {children}
      </div>
    </div>
  );
}
