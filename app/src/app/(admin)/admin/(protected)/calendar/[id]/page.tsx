import { notFound } from "next/navigation";
import { getCandidateDiff, type ValidationSummary } from "@/lib/admin-service";
import { formatDateEs, formatDateTimeEs } from "@/lib/format";
import { PublishCandidateForm } from "@/components/admin/PublishCandidateForm";

const DIFF_LABELS: Record<string, string> = {
  added: "Añadido",
  removed: "Eliminado",
  modified: "Modificado",
  unchanged: "Sin cambios",
};

const DIFF_CLASSES: Record<string, string> = {
  added: "bg-status-open-bg text-status-open",
  removed: "bg-status-warn-bg text-status-warn",
  modified: "bg-brand-orange-100 text-brand-orange-700",
  unchanged: "text-brand-blue-500",
};

export default async function CalendarCandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let data;
  try {
    data = await getCandidateDiff(id);
  } catch {
    notFound();
  }
  const { candidate, diff } = data;
  const validation = candidate.validationSummary as unknown as ValidationSummary | null;
  const changedEntries = diff.filter((d) => d.change !== "unchanged");

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-blue-900">
        Versión del {formatDateTimeEs(candidate.createdAt.toISOString())}
      </h1>
      <p className="text-sm text-brand-blue-700">
        Periodo: {formatDateEs(candidate.periodStart.toISOString().slice(0, 10))} —{" "}
        {formatDateEs(candidate.periodEnd.toISOString().slice(0, 10))} · Estado:{" "}
        <strong>{candidate.status}</strong>
      </p>
      <p className="mt-1 text-xs text-brand-blue-500">
        SHA-256 del PDF origen: {candidate.sourceSha256}
      </p>

      {validation && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {validation.errors.length > 0 && (
            <div className="rounded-xl border border-status-warn bg-status-warn-bg p-4">
              <h2 className="font-semibold text-status-warn">
                Errores bloqueantes
              </h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-status-warn">
                {validation.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          {validation.warnings.length > 0 && (
            <div className="rounded-xl border border-brand-orange-300 bg-brand-orange-50 p-4">
              <h2 className="font-semibold text-brand-orange-700">Avisos</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-brand-orange-700">
                {validation.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {candidate.status === "candidate" && validation?.errors.length === 0 && (
        <div className="mt-6">
          <PublishCandidateForm candidateId={candidate.id} />
        </div>
      )}

      <h2 className="mt-6 text-lg font-semibold text-brand-blue-900">
        Diferencias frente a la versión publicada ({changedEntries.length} cambios de {diff.length} turnos)
      </h2>
      <div className="mt-2 max-h-[32rem] overflow-y-auto rounded-xl border border-brand-blue-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-brand-blue-50 text-brand-blue-700">
            <tr>
              <th className="p-2">Fecha</th>
              <th className="p-2">Turno</th>
              <th className="p-2">Cambio</th>
              <th className="p-2">Antes</th>
              <th className="p-2">Después</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-blue-100">
            {diff.map((d) => (
              <tr key={`${d.date}-${d.shiftType}`}>
                <td className="p-2">{d.date}</td>
                <td className="p-2">{d.shiftType === "day" ? "Día" : "Noche"}</td>
                <td className="p-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${DIFF_CLASSES[d.change]}`}
                  >
                    {DIFF_LABELS[d.change]}
                  </span>
                </td>
                <td className="p-2 text-brand-blue-700">{d.before ?? "—"}</td>
                <td className="p-2 text-brand-blue-900">{d.after ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
