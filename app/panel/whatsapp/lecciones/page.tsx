"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MdArrowBack, MdAutorenew, MdCheck, MdClose, MdEdit, MdPsychology, MdSave } from "react-icons/md";

type Category = "VOCABULARIO" | "ERROR" | "ESTILO" | "PROCESO" | "VENTA" | "REVISAR";
type Status = "PENDING" | "APPROVED" | "REJECTED";

type Lesson = {
  id: string;
  text: string;
  category: Category;
  status: Status;
  evidence: string;
  createdAt: string;
};

type Counts = Record<Status, number>;

const TABS: Array<{ value: Status; label: string }> = [
  { value: "PENDING", label: "Pendientes" },
  { value: "APPROVED", label: "Aprobadas" },
  { value: "REJECTED", label: "Descartadas" },
];

const CATEGORY_META: Record<Category, { label: string; className: string }> = {
  VOCABULARIO: { label: "Vocabulario", className: "bg-[#DBEAFE] text-[#1D4ED8]" },
  ERROR: { label: "Error", className: "bg-[#FEE2E2] text-[#B91C1C]" },
  ESTILO: { label: "Estilo", className: "bg-[#EDE9FE] text-[#6D28D9]" },
  PROCESO: { label: "Proceso", className: "bg-[#FEF3C7] text-[#92400E]" },
  VENTA: { label: "Venta", className: "bg-[#DCFCE7] text-[#15803D]" },
  REVISAR: { label: "Revisar dato", className: "bg-[#FFEDD5] text-[#C2410C]" },
};

const inputClass =
  "w-full rounded-xl border border-[#DCE5EA] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#27B1B8] focus:ring-2 focus:ring-[#27B1B8]/20";

export default function LessonsPage() {
  const [tab, setTab] = useState<Status>("PENDING");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [counts, setCounts] = useState<Counts>({ PENDING: 0, APPROVED: 0, REJECTED: 0 });
  const [canApprove, setCanApprove] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const load = useCallback(async (status: Status) => {
    const response = await fetch(`/api/panel/whatsapp/lessons?status=${status}`, { cache: "no-store" });
    if (!response.ok) {
      setError("No fue posible cargar las lecciones.");
      setLoading(false);
      return;
    }
    const data = (await response.json()) as { lessons: Lesson[]; counts: Counts; canApprove: boolean };
    setLessons(data.lessons);
    setCounts(data.counts);
    setCanApprove(data.canApprove);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    void load(tab);
  }, [tab, load]);

  async function patchLesson(id: string, body: { status?: Status; text?: string }) {
    const response = await fetch(`/api/panel/whatsapp/lessons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "No fue posible guardar.");
      return;
    }
    setError(null);
    setEditingId(null);
    await load(tab);
  }

  async function analyze() {
    setAnalyzing(true);
    setNotice(null);
    setError(null);
    try {
      const response = await fetch("/api/panel/whatsapp/lessons/analyze", { method: "POST" });
      const data = (await response.json()) as { analyzed?: number; created?: number; remaining?: number; error?: string };
      if (!response.ok) {
        setError(data.error ?? "No fue posible analizar.");
        return;
      }
      setNotice(
        `Se analizaron ${data.analyzed} conversaciones y se propusieron ${data.created} lecciones.${
          data.remaining ? ` Quedan ${data.remaining} por revisar: vuelve a pulsar Analizar.` : ""
        }`,
      );
      await load(tab);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/panel/whatsapp"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DCE5EA] bg-white text-[#0C535B] hover:bg-[#F1F7F8]"
            aria-label="Volver a WhatsApp"
          >
            <MdArrowBack size={20} />
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold text-[#0C535B]">
              <MdPsychology size={22} /> Lecciones de la IA
            </h1>
            <p className="text-xs text-[#64748B]">
              Lo que el bot propone aprender de las conversaciones. Solo las aprobadas llegan al bot.
            </p>
          </div>
        </div>
        {canApprove ? (
          <button
            type="button"
            onClick={analyze}
            disabled={analyzing}
            className="flex items-center gap-2 rounded-xl bg-[#0C535B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0E6670] disabled:opacity-60"
          >
            <MdAutorenew size={18} className={analyzing ? "animate-spin" : ""} />
            {analyzing ? "Analizando…" : "Analizar conversaciones"}
          </button>
        ) : null}
      </div>

      {notice ? <p className="rounded-xl bg-[#ECFDF5] px-4 py-3 text-sm text-[#065F46]">{notice}</p> : null}
      {error ? <p role="alert" className="rounded-xl bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">{error}</p> : null}

      <div className="flex gap-1.5 rounded-xl bg-[#F1F7F8] p-1" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={tab === item.value}
            onClick={() => setTab(item.value)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              tab === item.value ? "bg-white text-[#0C535B] shadow-sm" : "text-[#64748B] hover:text-[#0C535B]"
            }`}
          >
            {item.label} ({counts[item.value]})
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-[#64748B]">Cargando…</p>
      ) : lessons.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#DCE5EA] bg-white py-10 text-center text-sm text-[#64748B]">
          {tab === "PENDING" ? "No hay lecciones pendientes. Pulsa Analizar para buscar nuevas." : "Sin lecciones aquí todavía."}
        </p>
      ) : (
        <ul className="space-y-3">
          {lessons.map((lesson) => {
            const meta = CATEGORY_META[lesson.category];
            const isEditing = editingId === lesson.id;
            return (
              <li key={lesson.id} className="min-w-0 rounded-2xl border border-[#DCE5EA] bg-white p-4 shadow-sm">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.className}`}>{meta.label}</span>
                  <time className="text-[11px] text-[#94A3B8]">{new Date(lesson.createdAt).toLocaleDateString("es-CO")}</time>
                </div>

                {isEditing ? (
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    rows={3}
                    maxLength={500}
                    className={inputClass}
                    aria-label="Editar lección"
                  />
                ) : (
                  <p className="text-sm font-medium text-[#0F172A]">{lesson.text}</p>
                )}

                <details className="mt-2 text-xs text-[#64748B]">
                  <summary className="cursor-pointer font-semibold text-[#0E7C82]">Ver evidencia</summary>
                  <p className="mt-1 whitespace-pre-wrap rounded-lg bg-[#F8FAFC] p-2.5">{lesson.evidence}</p>
                </details>

                {lesson.category === "REVISAR" ? (
                  <p className="mt-2 text-[11px] text-[#C2410C]">
                    No se enseña al bot. Corrige el dato en su fuente (catálogo, base oficial) y descarta esta nota.
                  </p>
                ) : null}

                {canApprove ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => patchLesson(lesson.id, { text: draft })}
                          className="flex items-center gap-1.5 rounded-lg bg-[#0C535B] px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          <MdSave size={15} /> Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-lg border border-[#DCE5EA] px-3 py-1.5 text-xs font-semibold text-[#475569]"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        {lesson.status !== "APPROVED" && lesson.category !== "REVISAR" ? (
                          <button
                            type="button"
                            onClick={() => patchLesson(lesson.id, { status: "APPROVED" })}
                            className="flex items-center gap-1.5 rounded-lg bg-[#16A34A] px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            <MdCheck size={15} /> Aprobar
                          </button>
                        ) : null}
                        {lesson.category !== "REVISAR" ? (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(lesson.id);
                              setDraft(lesson.text);
                            }}
                            className="flex items-center gap-1.5 rounded-lg border border-[#DCE5EA] px-3 py-1.5 text-xs font-semibold text-[#475569]"
                          >
                            <MdEdit size={15} /> Editar
                          </button>
                        ) : null}
                        {lesson.status !== "REJECTED" ? (
                          <button
                            type="button"
                            onClick={() => patchLesson(lesson.id, { status: "REJECTED" })}
                            className="flex items-center gap-1.5 rounded-lg border border-[#FECACA] px-3 py-1.5 text-xs font-semibold text-[#B91C1C]"
                          >
                            <MdClose size={15} /> Descartar
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
