"use client";

import { useActionState } from "react";
import {
  discoverQuarterlySourcesAction,
  regenerateDutyCalendarAction,
  type ActionResult,
  type DiscoverResult,
} from "@/lib/actions/calendar-actions";
import type { QuarterCandidate } from "@/lib/admin-service";

const initialDiscover: DiscoverResult = { error: null, candidates: [] };

const STATUS_LABELS: Record<QuarterCandidate["status"], string> = {
  vigente: "Vigente",
  futuro: "Futuro",
  pasado: "Pasado",
  ya_importado: "Ya importado",
  invalido: "No válido",
  inalcanzable: "Inalcanzable",
};

const STATUS_CLASSES: Record<QuarterCandidate["status"], string> = {
  vigente: "bg-status-open-bg text-status-open",
  futuro: "bg-brand-blue-100 text-brand-blue-700",
  pasado: "bg-brand-blue-100 text-brand-blue-500",
  ya_importado: "bg-brand-blue-100 text-brand-blue-700",
  invalido: "bg-status-warn-bg text-status-warn",
  inalcanzable: "bg-status-warn-bg text-status-warn",
};

export function CalendarSourceActions() {
  const [discoverState, discoverFormAction, discoverPending] = useActionState(
    () => discoverQuarterlySourcesAction(),
    initialDiscover
  );

  return (
    <div className="rounded-xl border border-brand-blue-100 bg-white p-4">
      <h2 className="font-semibold text-brand-blue-900">Fuente oficial</h2>
      <p className="mt-1 text-sm text-brand-blue-700">
        El origen publica el calendario por trimestre (T1-T4). El PDF se
        descarga siempre desde el servidor, nunca desde el navegador
        (RF009; Anexo de descubrimiento trimestral).
      </p>
      <form action={discoverFormAction} className="mt-3">
        <button
          type="submit"
          disabled={discoverPending}
          className="tap-target rounded-lg bg-brand-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-orange-700 disabled:opacity-60"
        >
          {discoverPending
            ? "Buscando…"
            : "Buscar y regenerar desde la fuente oficial"}
        </button>
      </form>

      {discoverState.error && (
        <p role="alert" className="mt-3 text-sm font-medium text-status-warn">
          {discoverState.error}
        </p>
      )}

      {discoverState.candidates.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-brand-blue-700">
              <tr>
                <th className="p-2">Trimestre</th>
                <th className="p-2">Estado</th>
                <th className="p-2">Periodo</th>
                <th className="p-2">Detalle</th>
                <th className="p-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-blue-100">
              {discoverState.candidates.map((c) => (
                <CandidateRow key={c.quarter + c.url} candidate={c} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const initialRegenerate: ActionResult = { error: null, message: null };

function CandidateRow({ candidate }: { candidate: QuarterCandidate }) {
  const [state, formAction, pending] = useActionState(
    () => regenerateDutyCalendarAction(candidate.url),
    initialRegenerate
  );
  const canRegenerate =
    candidate.status === "vigente" || candidate.status === "futuro";

  return (
    <tr>
      <td className="p-2 font-medium text-brand-blue-900">{candidate.quarter}</td>
      <td className="p-2">
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_CLASSES[candidate.status]}`}
        >
          {STATUS_LABELS[candidate.status]}
        </span>
      </td>
      <td className="p-2 text-brand-blue-800">
        {candidate.periodStart && candidate.periodEnd
          ? `${candidate.periodStart} — ${candidate.periodEnd}`
          : "—"}
      </td>
      <td className="p-2 text-brand-blue-600">{candidate.message}</td>
      <td className="p-2 text-right">
        {canRegenerate ? (
          <form action={formAction} className="inline-flex flex-col items-end">
            <button
              type="submit"
              disabled={pending}
              className="tap-target rounded-lg border border-brand-blue-300 px-3 py-1.5 text-xs font-medium text-brand-blue-900 hover:bg-brand-blue-50 disabled:opacity-60"
            >
              {pending ? "Regenerando…" : "Regenerar este"}
            </button>
            {(state.message || state.error) && (
              <span
                className={`mt-1 text-xs ${state.error ? "text-status-warn" : "text-brand-blue-700"}`}
              >
                {state.error ?? state.message}
              </span>
            )}
          </form>
        ) : (
          <span className="text-xs text-brand-blue-400">—</span>
        )}
      </td>
    </tr>
  );
}
