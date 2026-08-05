"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  MdSearch, MdExpandMore, MdBeachAccess, MdEventBusy, MdAccessTime, MdDescription,
  MdCardGiftcard, MdSupportAgent, MdPayments, MdFolderShared, MdGroups, MdRule,
} from "react-icons/md";

type Topic = {
  id: string;
  icon: React.ElementType;
  title: string;
  summary: string;
  steps: string[];
  rules?: string[];
  href: string;
  hrefLabel: string;
};

/**
 * Contenido derivado del comportamiento real del sistema (lib/vacation.ts,
 * app/api/rrhh-local/*). Si cambia una regla en el código, actualizar aquí.
 */
const TOPICS: Topic[] = [
  {
    id: "vacaciones",
    icon: MdBeachAccess,
    title: "Vacaciones",
    summary: "Cómo se calcula el saldo y quién aprueba las solicitudes.",
    steps: [
      "El colaborador solicita desde su portal, eligiendo fecha de inicio y fin.",
      "La solicitud le llega a su jefe directo, que es quien aprueba o rechaza.",
      "RRHH puede consultar el histórico y el saldo de cualquier colaborador, pero no aprueba en lugar del jefe.",
    ],
    rules: [
      "Se causan 15 días por cada 365 días trabajados, contados desde la fecha de ingreso.",
      "Saldo disponible = días causados − días ya tomados − días pendientes de aprobación.",
      "El sistema bloquea la solicitud si no hay saldo suficiente o si se cruza con otras vacaciones ya aprobadas o pendientes.",
      "No se pueden pedir fechas pasadas.",
    ],
    href: "/panel/rrhh/vacaciones",
    hrefLabel: "Ir a Vacaciones",
  },
  {
    id: "ausencias",
    icon: MdEventBusy,
    title: "Permisos e incapacidades",
    summary: "Subtipos legales disponibles y reglas de fechas.",
    steps: [
      "El colaborador elige el subtipo de permiso y adjunta el soporte cuando aplica.",
      "Aprueba el jefe directo. Al aprobar un permiso debe indicar si es remunerado o no.",
      "Para rechazar cualquier solicitud, el motivo es obligatorio.",
    ],
    rules: [
      "Subtipos de permiso: cita médica, calamidad doméstica, luto, maternidad, paternidad, diligencia judicial, sindical, estudio, personal, no remunerado, medio día, por horas y otro.",
      "Las incapacidades sí admiten fechas pasadas — el resto de solicitudes no.",
      "Cada incapacidad recibe un número consecutivo automático con el formato INC-AÑO-0000.",
    ],
    href: "/panel/rrhh/ausencias",
    hrefLabel: "Ir a Ausencias",
  },
  {
    id: "horas-extras",
    icon: MdAccessTime,
    title: "Horas extra",
    summary: "Tipos de recargo según la ley colombiana y quién autoriza.",
    steps: [
      "El colaborador registra fecha, hora de inicio, hora de fin y tipo de recargo.",
      "Aprueba el jefe directo.",
      "Las horas aprobadas quedan disponibles para el consolidado de Reportes.",
    ],
    rules: [
      "Diurna: 25% de recargo.",
      "Nocturna: 75% de recargo.",
      "Dominical o festiva diurna: 100% de recargo.",
      "Dominical o festiva nocturna: 150% de recargo.",
    ],
    href: "/panel/rrhh/horas-extras",
    hrefLabel: "Ir a Horas extra",
  },
  {
    id: "certificados",
    icon: MdDescription,
    title: "Certificados laborales",
    summary: "Requieren aprobación de RRHH antes de que el colaborador pueda descargarlos.",
    steps: [
      "El colaborador solicita el certificado e indica si quiere que incluya el salario.",
      "RRHH aprueba o rechaza desde el módulo de Certificados. Aquí sí decide RRHH, no el jefe.",
      "Solo después de la aprobación el colaborador puede descargar el PDF desde su portal.",
    ],
    rules: [
      "Una solicitud ya revisada no se puede volver a revisar.",
      "El motivo de rechazo es obligatorio.",
    ],
    href: "/panel/rrhh/certificados",
    hrefLabel: "Ir a Certificados",
  },
  {
    id: "beneficios",
    icon: MdCardGiftcard,
    title: "Beneficios",
    summary: "Catálogo de beneficios y aprobación de las solicitudes.",
    steps: [
      "RRHH publica el catálogo de beneficios activos, con categoría, vigencia y destacados.",
      "El colaborador solicita el beneficio que le interese.",
      "RRHH aprueba o rechaza la solicitud desde Beneficios o desde Flujos.",
    ],
    href: "/panel/rrhh/beneficios",
    hrefLabel: "Ir a Beneficios",
  },
  {
    id: "solicitudes",
    icon: MdSupportAgent,
    title: "Centro de Solicitudes (tickets)",
    summary: "Peticiones internas de dotación, soporte, compras y más.",
    steps: [
      "El colaborador crea el ticket eligiendo una categoría; cada categoría pide sus propios campos.",
      "RRHH asigna un responsable y va moviendo el estado del ticket.",
      "Los comentarios quedan en el historial y el colaborador los ve desde su portal.",
    ],
    rules: [
      "Cada ticket recibe un código consecutivo automático con el formato TK-000000.",
      "Estados: pendiente, en proceso, esperando respuesta, finalizado y cancelado.",
    ],
    href: "/panel/rrhh/solicitudes",
    hrefLabel: "Ir a Solicitudes",
  },
  {
    id: "nomina",
    icon: MdPayments,
    title: "Nómina y desprendibles",
    summary: "Emisión de desprendibles y su consulta por parte del colaborador.",
    steps: [
      "RRHH crea el desprendible indicando período, valor bruto y deducciones; el neto se calcula solo.",
      "Se puede adjuntar el PDF del desprendible o generarlo desde el módulo.",
      "El colaborador descarga únicamente sus propios desprendibles desde su portal.",
    ],
    href: "/panel/rrhh/nomina",
    hrefLabel: "Ir a Nómina",
  },
  {
    id: "documentos",
    icon: MdFolderShared,
    title: "Documentos",
    summary: "Hoja de vida documental de cada colaborador.",
    steps: [
      "Los documentos se cargan por colaborador y quedan clasificados por categoría.",
      "Se puede registrar fecha de vencimiento para los que caducan.",
      "El colaborador ve y descarga solo los documentos asociados a él.",
    ],
    href: "/panel/rrhh/documentos",
    hrefLabel: "Ir a Documentos",
  },
  {
    id: "empleados",
    icon: MdGroups,
    title: "Colaboradores y estructura",
    summary: "Alta de colaboradores, jefe directo y departamentos.",
    steps: [
      "Al crear un colaborador se define su cargo, departamento, tipo de contrato y fecha de ingreso.",
      "El campo de jefe directo es el que determina quién aprueba sus vacaciones, permisos y horas extra.",
      "Si un colaborador no tiene jefe asignado, sus solicitudes se quedan sin quien las apruebe.",
    ],
    rules: [
      "La fecha de ingreso es la base del cálculo de vacaciones: si está mal, el saldo queda mal.",
    ],
    href: "/panel/rrhh/empleados",
    hrefLabel: "Ir a Colaboradores",
  },
];

const QUICK_RULES = [
  { label: "Vacaciones causadas", value: "15 días por cada 365 trabajados" },
  { label: "Recargo hora extra diurna", value: "25%" },
  { label: "Recargo hora extra nocturna", value: "75%" },
  { label: "Recargo dominical/festivo diurno", value: "100%" },
  { label: "Recargo dominical/festivo nocturno", value: "150%" },
  { label: "Aprueba vacaciones, permisos y horas extra", value: "El jefe directo" },
  { label: "Aprueba certificados y beneficios", value: "Recursos Humanos" },
];

export default function AyudaPanelPage() {
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(TOPICS[0].id);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return TOPICS;
    return TOPICS.filter((t) =>
      [t.title, t.summary, ...t.steps, ...(t.rules ?? [])].join(" ").toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-black text-[#1A1A1A]">Ayuda</h1>
        <p className="text-xs text-[#64748B]">Cómo funciona cada módulo del panel de Recursos Humanos y qué reglas aplica el sistema.</p>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-3">
        <MdSearch size={20} className="text-[#94A3B8]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar un tema: vacaciones, recargo, certificado…"
          className="w-full text-sm text-[#1A1A1A] outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-3">
          {filtered.map((topic) => {
            const Icon = topic.icon;
            const open = openId === topic.id;
            return (
              <div key={topic.id} className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
                <button
                  onClick={() => setOpenId(open ? null : topic.id)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-3 p-4 text-left hover:bg-[#F8FAFC]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E6FAFB] text-[#27B1B8]">
                    <Icon size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-[#1A1A1A]">{topic.title}</span>
                    <span className="block truncate text-xs text-[#64748B]">{topic.summary}</span>
                  </span>
                  <MdExpandMore size={20} className={`shrink-0 text-[#94A3B8] transition-transform ${open ? "rotate-180" : ""}`} />
                </button>

                {open && (
                  <div className="border-t border-[#E2E8F0] p-5 pt-4">
                    <p className="text-xs font-bold text-[#64748B]">Cómo funciona</p>
                    <ol className="mt-2 space-y-2">
                      {topic.steps.map((step, i) => (
                        <li key={i} className="flex gap-2.5 text-sm text-[#1A1A1A]">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[10px] font-bold text-[#64748B]">
                            {i + 1}
                          </span>
                          <span className="min-w-0">{step}</span>
                        </li>
                      ))}
                    </ol>

                    {topic.rules && (
                      <>
                        <p className="mt-5 text-xs font-bold text-[#64748B]">Reglas que aplica el sistema</p>
                        <ul className="mt-2 space-y-1.5">
                          {topic.rules.map((rule, i) => (
                            <li key={i} className="flex gap-2 text-sm text-[#64748B]">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#27B1B8]" />
                              <span className="min-w-0">{rule}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    <Link
                      href={topic.href}
                      className="mt-5 inline-flex rounded-lg bg-[#27B1B8] px-3 py-2 text-sm font-bold text-white hover:bg-[#1E969B]"
                    >
                      {topic.hrefLabel}
                    </Link>
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <p className="rounded-xl border border-[#E2E8F0] bg-white p-6 text-sm text-[#94A3B8]">
              No hay temas que coincidan con &quot;{search}&quot;.
            </p>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
            <div className="flex items-center gap-2">
              <MdRule size={16} className="text-[#27B1B8]" />
              <h3 className="text-sm font-black text-[#1A1A1A]">Referencia rápida</h3>
            </div>
            <p className="mb-4 mt-1 text-xs text-[#64748B]">Valores que el sistema aplica automáticamente.</p>
            <div className="space-y-3">
              {QUICK_RULES.map((r) => (
                <div key={r.label}>
                  <p className="text-xs text-[#64748B]">{r.label}</p>
                  <p className="text-sm font-bold text-[#1A1A1A]">{r.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
            <h3 className="text-sm font-black text-[#1A1A1A]">¿Algo no cuadra?</h3>
            <p className="mt-1 text-xs leading-5 text-[#64748B]">
              Si una solicitud se quedó sin quien la apruebe, revisa que el colaborador tenga jefe directo asignado.
              Si un saldo de vacaciones no coincide, verifica su fecha de ingreso.
            </p>
            <div className="mt-4 space-y-2">
              <Link href="/panel/rrhh/empleados" className="block text-sm font-bold text-[#27B1B8] hover:underline">
                Revisar colaboradores y jefes
              </Link>
              <Link href="/panel/rrhh/flujos" className="block text-sm font-bold text-[#27B1B8] hover:underline">
                Ver todo lo pendiente de aprobar
              </Link>
              <Link href="/panel/rrhh/solicitudes" className="block text-sm font-bold text-[#27B1B8] hover:underline">
                Abrir el Centro de Solicitudes
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
