"use client";
import { cloneElement, isValidElement, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MdApps, MdClose, MdExpandLess, MdLogout, MdMoreHoriz, MdSearch, MdStorefront } from "react-icons/md";
import { NotificationBell } from "./notification-bell";
import { NAV, type NavChild, type NavItem } from "./panel-nav";

type DockUser = { fullName: string; avatarUrl: string | null } | null;

const BTN = "grid h-11 w-11 shrink-0 place-items-center rounded-[14px] transition-transform hover:-translate-y-1";
const DARK = "bg-gradient-to-b from-[#3a4a4c] to-[#101a1b] text-white";
const RING = "ring-2 ring-[#5fbecc]";
// Inicio y Notificaciones tienen su propio botón en la barra.
const SHORT: Record<string, string> = { rrhh: "RRHH", integraciones: "Integrac.", configuracion: "Config.", operaciones: "Operación" };
/** Más páginas que esto => botón + panel en cuadrícula en vez de una fila deslizable. */
const MANY = 7;
/** Distancia al borde inferior (px) en la que el mouse hace reaparecer la barra. */
const EDGE = 140;
const HIDDEN_KEYS = new Set(["inicio", "notificaciones"]);

const sized = (el: React.ReactNode, size: number) => (isValidElement(el) ? cloneElement(el as React.ReactElement<{ size?: number }>, { size }) : el);
const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const matches = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + "/");

type Cat = NavItem & { children?: NavChild[]; tone: number; target: string };

export function PanelDock({
  visibleModules, isSuperAdmin, user, onProfile, onLogout, loggingOut,
}: {
  visibleModules: Set<string> | null;
  isSuperAdmin: boolean;
  user: DockUser;
  onProfile: () => void;
  onLogout: () => void;
  loggingOut: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  // Las hojas se cierran solas al cambiar de ruta (se guarda en qué ruta se abrieron).
  const [sheetState, setSheetState] = useState<{ kind: "cats" | "more"; path: string } | null>(null);
  const sheet = sheetState?.path === pathname ? sheetState.kind : null;
  const setSheet = (kind: "cats" | "more" | null) => setSheetState(kind ? { kind, path: pathname } : null);

  const cats = useMemo<Cat[]>(() => {
    if (!visibleModules) return [];
    const canSee = (c: NavChild) =>
      c.superAdminOnly ? isSuperAdmin : c.anyModule ? c.anyModule.some((m) => visibleModules.has(m)) : visibleModules.has(c.module);
    const out: Cat[] = [];
    for (const item of NAV) {
      if (HIDDEN_KEYS.has(item.key)) continue;
      if (!item.children) {
        if (item.module && visibleModules.has(item.module)) out.push({ ...item, tone: 0, target: item.href });
        continue;
      }
      const children = item.children.filter(canSee);
      if (children.length) out.push({ ...item, children, tone: 0, target: children[0].href });
    }
    return out.map((c, i) => ({ ...c, tone: (i % 5) + 1 }));
  }, [visibleModules, isSuperAdmin]);

  // Categoría activa = la que tiene la ruta más específica que coincide con la URL actual.
  const active = useMemo(() => {
    let best: { cat: Cat; len: number } | null = null;
    for (const cat of cats) {
      const hrefs = cat.children ? cat.children.map((c) => c.href) : [cat.href];
      for (const h of hrefs) if (matches(pathname, h) && (!best || h.length > best.len)) best = { cat, len: h.length };
    }
    return best?.cat ?? null;
  }, [cats, pathname]);

  // Auto-ocultar estilo macOS: se esconde al bajar el scroll y reaparece al subir,
  // al acercar el mouse al borde inferior, al tocar la rayita o al enfocar con teclado.
  const [hiddenState, setHiddenState] = useState<{ hidden: boolean; path: string }>({ hidden: false, path: pathname });
  const hidden = hiddenState.hidden && hiddenState.path === pathname; // al cambiar de ruta vuelve a mostrarse
  const setHidden = (v: boolean) => setHiddenState({ hidden: v, path: pathname });
  const hoverRef = useRef(false);
  const mouseYRef = useRef(-1);
  const show = () => setHidden(false);

  useEffect(() => {
    const last = new WeakMap<EventTarget, number>();
    const nearBottom = () => mouseYRef.current > window.innerHeight - EDGE;
    const onMove = (e: MouseEvent) => {
      mouseYRef.current = e.clientY;
      if (nearBottom()) setHidden(false);
    };
    const onScroll = (e: Event) => {
      if (!e.target) return;
      const top = e.target instanceof Element ? e.target.scrollTop : window.scrollY;
      const prev = last.get(e.target) ?? 0;
      if (top > prev + 8 && top > 80 && !hoverRef.current && !nearBottom()) setHidden(true);
      else if (top < prev - 8 || top < 40) setHidden(false);
      last.set(e.target, top);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Atajo ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!visibleModules || pathname === "/panel") return null;

  const divider = <li aria-hidden className="mx-0.5 h-8 w-px shrink-0 self-start bg-white/20 mt-1.5" />;

  return (
    <>
      <button
        type="button"
        onClick={show}
        onMouseEnter={show}
        aria-label="Mostrar barra del panel"
        tabIndex={hidden ? 0 : -1}
        className={`fixed bottom-0 left-1/2 z-40 h-6 w-28 -translate-x-1/2 transition-opacity duration-300 ${hidden ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <span className="mx-auto mt-4 block h-1.5 w-16 rounded-full bg-[#002A2E]/70 shadow-[0_0_0_1px_rgba(255,255,255,0.5)]" />
      </button>
      <div
        className="panel-dock fixed bottom-3 left-1/2 z-40 max-w-[calc(100vw-16px)] -translate-x-1/2"
        onMouseEnter={() => { hoverRef.current = true; show(); }}
        onMouseLeave={() => { hoverRef.current = false; }}
        onFocusCapture={show}
      >
       <div
        className={`flex flex-col items-center gap-2 transition-transform duration-300 ease-out motion-reduce:transition-none ${hidden ? "translate-y-[calc(100%+24px)]" : ""}`}
        aria-hidden={hidden || undefined}
        inert={hidden || undefined}
       >
        {active?.children && active.children.length > MANY && <SubBarMany cat={active} pathname={pathname} />}
        {active?.children && active.children.length > 1 && active.children.length <= MANY && <SubBar cat={active} pathname={pathname} />}

        <nav
          aria-label="Categorías del panel"
          className="hidden sm:block max-w-full overflow-x-auto rounded-[22px] bg-[#002A2E]/85 p-2 shadow-[0_10px_40px_rgba(0,42,46,0.45)] ring-1 ring-white/10 backdrop-blur-md [scrollbar-width:none]"
        >
          <ul className="flex items-start gap-1.5">
            <li className="flex w-16 shrink-0 flex-col items-center gap-1">
              <Link href="/panel" aria-label="Inicio del panel" title="Inicio" className={`${BTN} ${DARK}`}>
                <MdApps size={22} />
              </Link>
              <span className="text-[10px] font-semibold text-white/80">Inicio</span>
            </li>
            <li className="flex w-16 shrink-0 flex-col items-center gap-1">
              <Link href="/" aria-label="Ir a la tienda Kliniu" title="Ir a la tienda" className={`${BTN} bg-gradient-to-b from-[#3cb8bf] to-[#1D9199] text-white`}>
                <MdStorefront size={22} />
              </Link>
              <span className="text-[10px] font-semibold text-white/80">Tienda</span>
            </li>
            {divider}
            {cats.map((c) => {
              const isActive = active?.key === c.key;
              return (
                <li key={c.key} className="flex w-16 shrink-0 flex-col items-center gap-1">
                  <Link
                    href={c.target}
                    aria-label={c.label}
                    title={c.label}
                    aria-current={isActive ? "page" : undefined}
                    className={`${BTN} panel-tile panel-tone-${c.tone} ${isActive ? RING : ""}`}
                  >
                    {sized(c.icon, 22)}
                  </Link>
                  <span className={`max-w-full truncate text-[10px] font-semibold ${isActive ? "text-white" : "text-white/70"}`}>
                    {SHORT[c.key] ?? c.label}
                  </span>
                </li>
              );
            })}
            {divider}
            <li className="flex w-16 shrink-0 flex-col items-center gap-1">
              <button type="button" onClick={() => setSearchOpen(true)} aria-label="Buscar (Ctrl K)" title="Buscar (Ctrl/⌘ K)" className={`${BTN} ${DARK}`}>
                <MdSearch size={22} />
              </button>
              <span className="text-[10px] font-semibold text-white/80">Buscar</span>
            </li>
            <li className="flex w-16 shrink-0 flex-col items-center gap-1">
              <div className="[&>button]:!h-11 [&>button]:!w-11 [&>button]:!rounded-[14px]"><NotificationBell /></div>
              <span className="text-[10px] font-semibold text-white/80">Avisos</span>
            </li>
            <li className="flex w-16 shrink-0 flex-col items-center gap-1">
              <button type="button" onClick={onProfile} aria-label="Mi perfil" title={user?.fullName ?? "Mi perfil"} className={`${BTN} ${DARK} overflow-hidden`}>
                {user?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-bold">{(user?.fullName ?? "?").charAt(0).toUpperCase()}</span>
                )}
              </button>
              <span className="text-[10px] font-semibold text-white/80">Perfil</span>
            </li>
            <li className="flex w-16 shrink-0 flex-col items-center gap-1">
              <button type="button" onClick={onLogout} disabled={loggingOut} aria-label="Cerrar sesión" title="Cerrar sesión" className={`${BTN} bg-gradient-to-b from-[#f2a0a0] to-[#d9534f] text-white disabled:opacity-60`}>
                <MdLogout size={21} />
              </button>
              <span className="text-[10px] font-semibold text-white/80">Salir</span>
            </li>
          </ul>
        </nav>

        {/* Móvil: 5 accesos; categorías y cuenta viven en hojas inferiores */}
        <nav aria-label="Panel" className="rounded-[22px] bg-[#002A2E]/90 px-2 py-2 shadow-[0_10px_40px_rgba(0,42,46,0.45)] ring-1 ring-white/10 backdrop-blur-md sm:hidden">
          <ul className="flex items-start justify-between gap-1">
            <li className="flex w-[68px] flex-col items-center gap-1">
              <Link href="/panel" aria-label="Inicio del panel" className={`${BTN} ${DARK}`}><MdApps size={22} /></Link>
              <span className="text-[10px] font-semibold text-white/80">Inicio</span>
            </li>
            <li className="flex w-[68px] flex-col items-center gap-1">
              <button type="button" onClick={() => setSheet("cats")} aria-label="Todas las categorías" className={`${BTN} panel-tile panel-tone-${active?.tone ?? 1} ${RING}`}>
                {sized(active?.icon ?? <MdApps />, 22)}
              </button>
              <span className="max-w-full truncate text-[10px] font-semibold text-white">{active ? (SHORT[active.key] ?? active.label) : "Módulos"}</span>
            </li>
            <li className="flex w-[68px] flex-col items-center gap-1">
              <button type="button" onClick={() => setSearchOpen(true)} aria-label="Buscar" className={`${BTN} ${DARK}`}><MdSearch size={22} /></button>
              <span className="text-[10px] font-semibold text-white/80">Buscar</span>
            </li>
            <li className="flex w-[68px] flex-col items-center gap-1">
              <div className="[&>button]:!h-11 [&>button]:!w-11 [&>button]:!rounded-[14px]"><NotificationBell /></div>
              <span className="text-[10px] font-semibold text-white/80">Avisos</span>
            </li>
            <li className="flex w-[68px] flex-col items-center gap-1">
              <button type="button" onClick={() => setSheet("more")} aria-label="Más opciones" className={`${BTN} ${DARK}`}><MdMoreHoriz size={24} /></button>
              <span className="text-[10px] font-semibold text-white/80">Más</span>
            </li>
          </ul>
        </nav>
       </div>
      </div>

      {sheet === "cats" && (
        <BottomSheet title="Categorías" onClose={() => setSheet(null)}>
          <ul className="grid grid-cols-3 gap-3">
            {cats.map((c) => (
              <li key={c.key}>
                <Link href={c.target} className="flex flex-col items-center gap-1.5 text-center">
                  <span className={`panel-tile panel-tone-${c.tone} grid h-14 w-14 place-items-center rounded-2xl ${active?.key === c.key ? RING : ""}`}>{sized(c.icon, 26)}</span>
                  <span className="text-xs font-bold text-[#002A2E]">{c.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </BottomSheet>
      )}
      {sheet === "more" && (
        <BottomSheet title={user?.fullName ?? "Mi cuenta"} onClose={() => setSheet(null)}>
          <div className="grid gap-2">
            <Link href="/" className="flex items-center gap-3 rounded-xl bg-[#E8FAFB] px-4 py-3 text-left text-sm font-semibold text-[#004B52]">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#1D9199] text-white"><MdStorefront size={18} /></span>
              Ir a la tienda
            </Link>
            <button type="button" onClick={() => { setSheet(null); onProfile(); }} className="flex items-center gap-3 rounded-xl bg-[#F4F6F8] px-4 py-3 text-left text-sm font-semibold text-[#002A2E]">
              <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-[#004B52] text-sm font-bold text-white">
                {user?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (user?.fullName ?? "?").charAt(0).toUpperCase()}
              </span>
              Mi perfil
            </button>
            <button type="button" onClick={() => { setSheet(null); onLogout(); }} disabled={loggingOut} className="flex items-center gap-3 rounded-xl bg-[#FDECEC] px-4 py-3 text-left text-sm font-semibold text-[#C0392B] disabled:opacity-60">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#d9534f] text-white"><MdLogout size={18} /></span>
              Cerrar sesión
            </button>
          </div>
        </BottomSheet>
      )}

      {searchOpen && (
        <SearchPalette
          cats={cats}
          onClose={() => setSearchOpen(false)}
          onGo={(href) => {
            setSearchOpen(false);
            router.push(href);
          }}
        />
      )}
    </>
  );
}

/** Segunda barra: las páginas de la categoría activa, separadas por grupo. */
function SubBar({ cat, pathname }: { cat: Cat; pathname: string }) {
  const activeRef = useRef<HTMLAnchorElement>(null);
  const kids = cat.children ?? [];
  // Solo el hijo más específico queda marcado (evita marcar /produccion y /produccion/ordenes a la vez).
  const current = kids.filter((c) => matches(pathname, c.href)).sort((a, b) => b.href.length - a.href.length)[0]?.href;

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [current]);

  return (
    <nav
      aria-label={`Páginas de ${cat.label}`}
      className="max-w-full overflow-x-auto rounded-full bg-white/95 px-2 py-1.5 shadow-[0_8px_30px_rgba(0,42,46,0.25)] ring-1 ring-[#CFE8EA] backdrop-blur-md [scrollbar-width:none]"
    >
      <ul className="flex items-center gap-1">
        {kids.map((c, i) => {
          const isCurrent = c.href === current;
          return (
            <li key={c.href} className="flex shrink-0 items-center gap-1">
              {c.group && i > 0 && <span aria-hidden className="mx-1 h-5 w-px bg-[#CFE8EA]" />}
              {c.group && <span className="px-1 text-[10px] font-bold uppercase tracking-wider text-[#6285a0]">{c.group}</span>}
              <Link
                ref={isCurrent ? activeRef : undefined}
                href={c.href}
                aria-current={isCurrent ? "page" : undefined}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isCurrent ? "bg-[#004B52] text-white" : "text-[#004B52] hover:bg-[#E8FAFB]"
                }`}
              >
                {sized(c.icon, 15)}
                {c.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SearchPalette({ cats, onClose, onGo }: { cats: Cat[]; onClose: () => void; onGo: (href: string) => void }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const entries = useMemo(
    () =>
      cats.flatMap((c) =>
        c.children
          ? c.children.map((k) => ({ label: k.label, href: k.href, cat: c.label, icon: k.icon ?? c.icon }))
          : [{ label: c.label, href: c.href, cat: "", icon: c.icon }],
      ),
    [cats],
  );
  const results = useMemo(() => {
    const t = norm(q.trim());
    return t ? entries.filter((e) => norm(e.label).includes(t) || norm(e.cat).includes(t)) : entries;
  }, [entries, q]);

  useEffect(() => {
    listRef.current?.children[sel]?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    else if (e.key === "Enter" && results[sel]) onGo(results[sel].href);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center bg-black/40 p-4 pt-[12vh]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-label="Buscar en el panel"
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2 border-b border-[#E2E8F0] px-4">
          <MdSearch size={20} className="text-[#6285a0]" />
          <input
            autoFocus
            value={q}
            onChange={(e) => { setQ(e.target.value); setSel(0); }}
            placeholder="¿A dónde quieres ir? Ej: nómina, pedidos…"
            className="w-full bg-transparent py-4 text-sm outline-none"
          />
          <kbd className="rounded border border-[#E2E8F0] px-1.5 py-0.5 text-[10px] text-[#94A3B8]">Esc</kbd>
        </div>
        <ul ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-[#94A3B8]">Sin resultados</li>}
          {results.map((r, i) => (
            <li key={r.href + r.label}>
              <button
                type="button"
                onClick={() => onGo(r.href)}
                onMouseMove={() => setSel(i)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${i === sel ? "bg-[#E8FAFB] text-[#004B52]" : "text-[#334155]"}`}
              >
                <span className="text-[#1D9199]">{sized(r.icon, 18)}</span>
                <span className="flex-1 font-semibold">{r.label}</span>
                {r.cat && <span className="text-xs text-[#94A3B8]">{r.cat}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Categorías con muchas páginas: un botón con la página actual que abre un panel agrupado. */
function SubBarMany({ cat, pathname }: { cat: Cat; pathname: string }) {
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname; // se cierra solo al navegar
  const setOpen = (v: boolean | ((o: boolean) => boolean)) => setOpenAt((typeof v === "function" ? v(open) : v) ? pathname : null);
  const kids = cat.children ?? [];
  const current = kids.filter((c) => matches(pathname, c.href)).sort((a, b) => b.href.length - a.href.length)[0];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const sections: { title: string; items: NavChild[] }[] = [];
  kids.forEach((k) => {
    if (k.group || sections.length === 0) sections.push({ title: k.group ?? cat.label, items: [k] });
    else sections[sections.length - 1].items.push(k);
  });

  return (
    <div className="relative">
      {open && <div className="fixed inset-0 z-[-1]" onMouseDown={() => setOpen(false)} />}
      {open && (
        <div
          role="menu"
          aria-label={`Páginas de ${cat.label}`}
          className="absolute bottom-full left-1/2 mb-2 max-h-[60vh] w-[min(92vw,760px)] -translate-x-1/2 overflow-y-auto rounded-2xl bg-white p-4 shadow-[0_12px_40px_rgba(0,42,46,0.3)] ring-1 ring-[#CFE8EA]"
        >
          {sections.map((sec) => (
            <section key={sec.title} className="mb-3 last:mb-0">
              <h3 className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-[#6285a0]">{sec.title}</h3>
              <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4">
                {sec.items.map((c) => {
                  const isCurrent = c.href === current?.href;
                  return (
                    <li key={c.href}>
                      <Link
                        href={c.href}
                        role="menuitem"
                        aria-current={isCurrent ? "page" : undefined}
                        className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors ${
                          isCurrent ? "bg-[#004B52] text-white" : "text-[#004B52] hover:bg-[#E8FAFB]"
                        }`}
                      >
                        <span className={isCurrent ? "text-[#eecf98]" : "text-[#1D9199]"}>{sized(c.icon, 17)}</span>
                        <span className="truncate">{c.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs font-semibold text-[#004B52] shadow-[0_8px_30px_rgba(0,42,46,0.25)] ring-1 ring-[#CFE8EA] backdrop-blur-md"
      >
        <span className="text-[#1D9199]">{sized(cat.icon, 16)}</span>
        <span className="hidden whitespace-nowrap text-[#6285a0] sm:inline">{cat.label}</span>
        {current && (
          <>
            <span aria-hidden className="hidden text-[#6285a0] sm:inline">/</span>
            <span className="whitespace-nowrap">{current.label}</span>
          </>
        )}
        <span className="ml-1 whitespace-nowrap rounded-full bg-[#E8FAFB] px-2 py-0.5 text-[10px] text-[#1D9199]">{open ? "Cerrar" : `Ver ${kids.length} páginas`}</span>
        <MdExpandLess size={18} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
    </div>
  );
}

function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[250] flex items-end bg-black/40 sm:hidden" onMouseDown={onClose}>
      <div role="dialog" aria-label={title} className="max-h-[75vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-8" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-[#002A2E]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-8 w-8 place-items-center rounded-full bg-[#F4F6F8] text-[#004B52]"><MdClose size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
