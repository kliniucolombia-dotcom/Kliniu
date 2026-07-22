"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  MdHome, MdPerson, MdBeachAccess, MdEventNote, MdHealthAndSafety, MdFolder, MdLogout,
  MdPayments, MdAccessTime, MdCardGiftcard, MdDescription, MdArticle, MdAccountTree,
  MdNotifications, MdExpandMore, MdSupportAgent, MdGroups,
} from "react-icons/md";

const RRHH_WHATSAPP = "573184001648";

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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [announcementCount, setAnnouncementCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

    fetch("/api/empleado/me").then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d?.avatarUrl) setAvatarUrl(d.avatarUrl);
      setIsManager(Boolean(d?.isManager));
    });
    fetch("/api/rrhh-local/announcements").then((r) => (r.ok ? r.json() : [])).then((d) => {
      if (Array.isArray(d)) setAnnouncementCount(d.length);
    });
  }, [router]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, []);

  // /empleado/perfil emite este evento al subir una foto, para refrescar el encabezado sin recargar.
  useEffect(() => {
    const onAvatarUpdated = (e: Event) => setAvatarUrl((e as CustomEvent<string>).detail);
    window.addEventListener("empleado:avatar-updated", onAvatarUpdated);
    return () => window.removeEventListener("empleado:avatar-updated", onAvatarUpdated);
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const nav = isManager
    ? [...NAV.slice(0, 7), { href: "/empleado/equipo", label: "Mi equipo", Icon: MdGroups }, ...NAV.slice(7)]
    : NAV;

  return (
    <div className="flex min-h-screen bg-[#F4F6F8] font-sans">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-[#E2E8F0] bg-white md:flex print:hidden">
        <div className="flex items-center gap-2 border-b border-[#E2E8F0] px-5 py-4">
          <Image src="/foca-icono-redondo.png" alt="Kliniu" width={32} height={32} className="h-8 w-8 shrink-0 rounded-full" />
          <div>
            <p className="text-xs font-black leading-none text-[#1A1A1A]">Portal Empleado</p>
            <p className="text-[10px] font-semibold text-[#27B1B8]">Kliniu</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => {
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
        <div className="p-3">
          <div className="space-y-2 rounded-xl bg-[#F0FDFF] p-3">
            <p className="text-xs font-black text-[#1A1A1A]">¿Necesitas ayuda?</p>
            <p className="text-[11px] text-[#64748B]">Contacta a Recursos Humanos</p>
            <a
              href={`https://wa.me/${RRHH_WHATSAPP}?text=${encodeURIComponent("Hola, necesito ayuda con Recursos Humanos.")}`}
              target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg bg-[#27B1B8] px-3 py-2 text-xs font-bold text-white hover:bg-[#1F9BA1]"
            >
              <MdSupportAgent size={16} /> Ir a contacto
            </a>
          </div>
        </div>
        <div className="border-t border-[#E2E8F0] p-3">
          <button onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50">
            <MdLogout size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-[#E2E8F0] bg-white px-5 py-4 md:hidden print:hidden">
          <div className="flex items-center gap-2">
            <Image src="/foca-icono-redondo.png" alt="Kliniu" width={32} height={32} className="h-8 w-8 shrink-0 rounded-full" />
            <p className="text-xs font-black leading-none text-[#1A1A1A]">Portal Empleado</p>
          </div>
          <button onClick={logout}
            className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-500 transition-colors hover:bg-red-100">
            Cerrar sesión
          </button>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-[#E2E8F0] bg-white px-3 py-2 md:hidden print:hidden">
          {nav.map((item) => {
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
        <header className="hidden items-center justify-end gap-4 border-b border-[#E2E8F0] bg-white px-6 py-4 md:flex print:hidden">
          <Link href="/empleado/noticias" className="relative flex h-9 w-9 items-center justify-center rounded-full text-[#64748B] hover:bg-[#F4F6F8]">
            <MdNotifications size={20} />
            {announcementCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {announcementCount}
              </span>
            )}
          </Link>
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E6FAFB] text-xs font-black text-[#27B1B8]">
                  {(user?.fullName ?? "—").split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
                </div>
              )}
              {user && <p className="text-sm font-bold text-[#1A1A1A]">{user.fullName ?? "—"}</p>}
              <MdExpandMore size={18} className="text-[#64748B]" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-10 mt-2 w-44 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-lg">
                <Link href="/empleado/perfil" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-[#F4F6F8]">
                  <MdPerson size={16} /> Mi perfil
                </Link>
                <button onClick={logout}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50">
                  <MdLogout size={16} /> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
