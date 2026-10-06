"use client";
import { useState } from "react";
import { inputCls, type Permission } from "../../_components/ops-ui";
import { efficiencyTone } from "@/lib/production-tone";
import { fmtDateOnly } from "@/lib/date";
import { addDays } from "@/lib/commercial-calendar";

export type Scope = "manage" | "own" | "read";

export type Options = {
  openOrders: { id: string; number: number; reference: string; productName: string; client: string }[];
  operations: { id: string; code: string; name: string; family: string; standardSeconds: number }[];
  operators: { id: string; fullName: string }[];
  references: { reference: string; productName: string }[];
  clients: string[];
  nextNumber: number | null;
  today: string;
  ownWindowDays: number;
  recentOperationIds: string[];
  lastSection: Section | null;
  firstEntryDate: string | null;
  lastEntryDate: string | null;
  permission: Permission;
  scope: Scope;
  me: { id: string; fullName: string };
};

export type Section = "ENSAMBLE" | "EMPAQUE";
export const SECTION_LABEL: Record<Section, string> = { ENSAMBLE: "Ensamble", EMPAQUE: "Empaque" };

export type Entry = {
  id: string; operatorId: string; workDate: string; startTime: string; endTime: string; section: Section;
  workOrderId: string | null; operationId: string; standardSeconds: number; quantity: number; sharedBy: number;
  observations: string | null;
  operator: { id: string; fullName: string };
  operation: { id: string; code: string; name: string; family: string };
  workOrder: { id: string; number: number; reference: string; productName: string; status: "OPEN" | "CLOSED"; quantity: number; producedQuantity: number | null } | null;
};

/** Minutos con un decimal ("26", "27,2"). */
export function fmtMin(n: number) {
  return n.toLocaleString("es-CO", { maximumFractionDigits: 1 });
}

/** Chip del indicador (1 = 100 %). null = bloque indirecto. */
export function EfficiencyChip({ value }: { value: number | null }) {
  if (value === null) return <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[11px] font-bold text-[#64748B]">Indirecto</span>;
  const tone = efficiencyTone(value * 100);
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ${tone.chip}`}>{Math.round(value * 100)} % · {tone.label}</span>;
}

/** Fin del rango por defecto: el último día con registros (o hoy si aún no hay o son de hoy). */
export function defaultRangeEnd(o: Pick<Options, "today" | "lastEntryDate">) {
  return o.lastEntryDate && o.lastEntryDate < o.today ? o.lastEntryDate : o.today;
}

/** Inicio del rango por defecto: `days` atrás, sin pasarse del primer día con registros. */
export function defaultRangeStart(o: Pick<Options, "today" | "firstEntryDate" | "lastEntryDate">, days: number) {
  const start = addDays(defaultRangeEnd(o), -days);
  return o.firstEntryDate && o.firstEntryDate > start ? o.firstEntryDate : start;
}

export function EntrySpanHint({ options }: { options: Options }) {
  const fmt = (d: string) => fmtDateOnly(d, { day: "2-digit", month: "short", year: "numeric" });
  return (
    <p className="mb-3 text-xs text-[#94A3B8]">
      {options.firstEntryDate && options.lastEntryDate
        ? `Hay registros del ${fmt(options.firstEntryDate)} al ${fmt(options.lastEntryDate)}.`
        : "Aún no hay registros."}
    </p>
  );
}

export type Notify = (type: "ok" | "err", msg: string) => void;

export function normalize(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Tiempo estándar en minutos por unidad, como la columna "To OPERACIÓN" del Excel. */
export function fmtStdMinutes(seconds: number) {
  return `${(seconds / 60).toLocaleString("es-CO", { maximumFractionDigits: 3 })} min`;
}

export async function jsonError(r: Response, fallback: string) {
  const d = await r.json().catch(() => ({}));
  return (d as { error?: string }).error ?? fallback;
}

/**
 * Campo de texto libre con sugerencias en línea (sin <datalist>, que en móvil no despliega).
 * `suggestions` trae lo que se muestra y el valor que se escribe al elegir.
 */
export function SuggestInput<T>({
  value, onChange, suggestions, toText, render, onPick, placeholder, uppercase,
}: {
  value: string;
  onChange: (v: string) => void;
  suggestions: T[];
  toText: (s: T) => string;
  render: (s: T) => React.ReactNode;
  onPick: (s: T) => void;
  placeholder?: string;
  uppercase?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const q = normalize(value.trim());
  const matches = q
    ? suggestions.filter((s) => normalize(toText(s)).includes(q) && normalize(toText(s)) !== q).slice(0, 6)
    : [];
  return (
    <div>
      <input
        value={value}
        onChange={(e) => onChange(uppercase ? e.target.value.toUpperCase() : e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder={placeholder}
        className={inputCls}
      />
      {focused && matches.length > 0 && (
        <div className="mt-1 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
          {matches.map((s, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onPick(s); setFocused(false); }}
              className="block w-full px-3 py-2 text-left text-sm text-[#1A1A1A] hover:bg-[#F1F5F9]"
            >
              {render(s)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
