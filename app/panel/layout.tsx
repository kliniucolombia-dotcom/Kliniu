"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConfirmProvider, useConfirm } from "@/app/components/confirm-dialog";
import AccountEntryLoading from "@/app/components/account-entry-loading";
import { NotificationBell } from "@/app/panel/_components/notification-bell";
import { NotificationToast } from "@/app/panel/_components/notification-toast";
import { NotificationDetailProvider } from "@/app/panel/_components/notification-detail-modal";
import { PanelDock } from "@/app/panel/_components/panel-dock";
import { ROLE_LABELS } from "@/lib/roles";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/panel";
  const [visibleModules, setVisibleModules] = useState<Set<string> | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userInfo, setUserInfo] = useState<{ fullName: string; email: string; avatarUrl: string | null; role: string } | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ fullName: "", email: "", phone: "", company: "", currentPassword: "" });
  const [profileOriginalEmail, setProfileOriginalEmail] = useState("");
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [profileAvatarFile, setProfileAvatarFile] = useState<File | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/panel/permissions")
      .then((r) => {
        // Sesión de una cuenta eliminada o inactiva: se limpia la cookie y va a login,
        // en vez de renderizar el panel sin datos de usuario.
        if (r.status === 401) {
          window.location.replace("/api/auth/session-expired");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        setIsSuperAdmin(d.role === "SUPERADMIN");
        setUserInfo({ fullName: d.fullName, email: d.email, avatarUrl: d.avatarUrl, role: d.role });
        const perms = d.permissions as Record<string, { canView: boolean }> | undefined;
        if (!perms) {
          setVisibleModules(new Set());
          return;
        }
        setVisibleModules(new Set(Object.entries(perms).filter(([, p]) => p.canView).map(([m]) => m)));
      })
      .catch(() => setVisibleModules(new Set()));
  }, []);

  const [loggingOut, setLoggingOut] = useState(false);
  const confirm = useConfirm();
  const logout = async () => {
    if (loggingOut) return;
    const ok = await confirm({
      title: "Cerrar sesión",
      message: "¿Seguro que quieres cerrar tu sesión?",
      confirmLabel: "Cerrar sesión",
      danger: false,
    });
    if (!ok) return;
    setLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error("logout falló");
    } catch {
      setLoggingOut(false);
      return;
    }
    window.location.replace("/login?logout=1");
  };

  const openProfileModal = async () => {
    setShowProfileModal(true);
    setProfileMsg(null);
    try {
      const r = await fetch("/api/account");
      if (r.ok) {
        const d = await r.json();
        const u = d.user;
        setProfileForm({ fullName: u.fullName ?? "", email: u.email ?? "", phone: u.phone ?? "", company: u.company ?? "", currentPassword: "" });
        setProfileOriginalEmail(u.email ?? "");
        setProfileAvatar(u.avatarUrl ?? null);
      }
    } catch {}
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileAvatarFile(file);
    const url = URL.createObjectURL(file);
    setProfileAvatar(url);
  };

  const saveProfile = async () => {
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      let avatarUrl = profileAvatar;
      if (profileAvatarFile) {
        const fd = new FormData();
        fd.append("file", profileAvatarFile);
        const upRes = await fetch("/api/empleado/avatar", { method: "POST", body: fd });
        if (upRes.ok) {
          const upData = await upRes.json();
          avatarUrl = upData.avatarUrl;
        }
      }
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: profileForm.fullName, email: profileForm.email, phone: profileForm.phone, company: profileForm.company, currentPassword: profileForm.currentPassword || undefined }),
      });
      if (res.ok) {
        setProfileMsg({ type: "ok", text: "Perfil actualizado" });
        setUserInfo((prev) => prev ? { ...prev, fullName: profileForm.fullName, avatarUrl } : prev);
        setTimeout(() => setShowProfileModal(false), 1200);
      } else {
        const d = await res.json();
        setProfileMsg({ type: "err", text: d.error || "Error al guardar" });
      }
    } catch {
      setProfileMsg({ type: "err", text: "Error de conexión" });
    }
    setProfileSaving(false);
  };

  return (
    <NotificationDetailProvider>
    <div className="flex h-screen bg-[#F4F6F8] font-sans">
      {/* ── Content ── */}
      <div className={`min-h-0 flex-1 overflow-x-hidden overflow-y-auto md:pt-0 ${isHome ? "" : "pb-40"}`}>
        {isHome && (
          <header className="flex items-center justify-between border-b-[3px] border-[#27B1B8] bg-white px-4 py-3 text-[#002A2E] sm:px-8">
            <div className="flex items-center gap-3.5">
              <Link href="/" aria-label="Ir a la tienda Kliniu" title="Ir a la tienda" className="rounded-lg outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#27B1B8]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Kliniu" className="h-7 w-auto" />
              </Link>
              <span aria-hidden className="h-7 w-px bg-[#002A2E]/20" />
              <span className="text-lg font-extrabold italic">Panel</span>
            </div>
            <div className="flex items-center gap-2.5">
              {userInfo && (
                <span className="hidden rounded-full bg-[#27B1B8] px-3 py-1.5 text-[11px] font-bold uppercase text-white sm:inline">
                  {ROLE_LABELS[userInfo.role as keyof typeof ROLE_LABELS] ?? userInfo.role}
                </span>
              )}
              <NotificationBell />
              <button
                onClick={logout}
                disabled={loggingOut}
                className="rounded-[10px] border border-[#002A2E]/30 px-3.5 py-2 text-[13px] font-semibold text-[#002A2E] transition-colors hover:bg-[#F4F6F8] disabled:opacity-60"
              >
                Salir
              </button>
            </div>
          </header>
        )}
        <ConfirmProvider>{children}</ConfirmProvider>
      </div>
      <PanelDock
        visibleModules={visibleModules}
        isSuperAdmin={isSuperAdmin}
        user={userInfo}
        onProfile={openProfileModal}
        onLogout={logout}
        loggingOut={loggingOut}
      />

      {/* ── Profile Modal ── */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowProfileModal(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
              <h3 className="text-sm font-bold text-[#1A1A1A]">Editar perfil</h3>
              <button onClick={() => setShowProfileModal(false)} className="text-[#94A3B8] hover:text-[#1A1A1A] text-lg leading-none">&times;</button>
            </div>
            <div className="px-5 py-4 space-y-4">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="group relative shrink-0">
                  {profileAvatar ? (
                    <img src={profileAvatar} alt="Avatar" className="h-16 w-16 rounded-full object-cover ring-2 ring-[#E2E8F0] group-hover:ring-[#27B1B8] transition-all" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#27B1B8] text-lg font-bold text-white ring-2 ring-[#E2E8F0] group-hover:ring-[#27B1B8] transition-all">
                      {profileForm.fullName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?"}
                    </div>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-semibold">Cambiar</span>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                <div>
                  <p className="text-xs font-semibold text-[#1A1A1A]">Foto de perfil</p>
                  <p className="text-[10px] text-[#94A3B8]">JPG, PNG o WEBP. Max 10 MB.</p>
                </div>
              </div>

              {/* Nombre */}
              <div>
                <label className="mb-1 block text-xs font-medium text-[#64748B]">Nombre completo</label>
                <input value={profileForm.fullName} onChange={(e) => setProfileForm((f) => ({ ...f, fullName: e.target.value }))} className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]" />
              </div>

              {/* Email */}
              <div>
                <label className="mb-1 block text-xs font-medium text-[#64748B]">Correo</label>
                <input type="email" value={profileForm.email} onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))} className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]" />
              </div>

              {/* Cambiar el correo exige la contraseña actual */}
              {profileForm.email.trim().toLowerCase() !== profileOriginalEmail && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#64748B]">Contraseña actual</label>
                  <input type="password" autoComplete="current-password" value={profileForm.currentPassword} onChange={(e) => setProfileForm((f) => ({ ...f, currentPassword: e.target.value }))} placeholder="Para confirmar el cambio de correo" className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]" />
                </div>
              )}

              {/* Teléfono */}
              <div>
                <label className="mb-1 block text-xs font-medium text-[#64748B]">Teléfono</label>
                <input value={profileForm.phone} onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))} className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]" />
              </div>

              {/* Empresa */}
              <div>
                <label className="mb-1 block text-xs font-medium text-[#64748B]">Empresa</label>
                <input value={profileForm.company} onChange={(e) => setProfileForm((f) => ({ ...f, company: e.target.value }))} className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]" />
              </div>

              {/* Mensaje */}
              {profileMsg && (
                <p className={`text-xs font-medium ${profileMsg.type === "ok" ? "text-green-600" : "text-red-500"}`}>{profileMsg.text}</p>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-[#E2E8F0] px-5 py-3">
              <button onClick={() => setShowProfileModal(false)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9]">Cancelar</button>
              <button onClick={saveProfile} disabled={profileSaving || !profileForm.fullName.trim() || !profileForm.email.trim()} className="rounded-lg bg-[#27B1B8] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#1f9499] disabled:opacity-50 transition-colors">
                {profileSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
      <NotificationToast />
      {loggingOut && <AccountEntryLoading message="Cerrando sesión" detail="Nos vemos pronto." />}
    </div>
    </NotificationDetailProvider>
  );
}
