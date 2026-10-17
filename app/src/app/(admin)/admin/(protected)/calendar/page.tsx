import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateEs, formatDateTimeEs } from "@/lib/format";
import { CalendarSourceActions } from "@/components/admin/CalendarSourceActions";
import { RestoreVersionButton } from "@/components/admin/RestoreVersionButton";

const STATUS_LABELS: Record<string, string> = {
  published: "Publicada",
  candidate: "Candidata",
  rejected: "Rechazada",
  archived: "Archivada",
};

const STATUS_CLASSES: Record<string, string> = {
  published: "bg-status-open-bg text-status-open",
  candidate: "bg-brand-orange-100 text-brand-orange-700",
  rejected: "bg-status-warn-bg text-status-warn",
  archived: "bg-brand-blue-100 text-brand-blue-700",
};

export default async function AdminCalendarPage() {
  const versions = await prisma.dutyCalendarVersion.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-blue-900">
        Calendario de guardias
      </h1>

      <div className="mt-4">
        <CalendarSourceActions />
      </div>

      <h2 className="mt-6 text-lg font-semibold text-brand-blue-900">
        Historial de versiones
      </h2>
      <div className="mt-2 overflow-x-auto rounded-xl border border-brand-blue-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand-blue-50 text-brand-blue-700">
            <tr>
              <th className="p-3">Estado</th>
              <th className="p-3">Periodo</th>
              <th className="p-3">Creada</th>
              <th className="p-3">Publicada</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-blue-100">
            {versions.map((v) => (
              <tr key={v.id}>
                <td className="p-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_CLASSES[v.status]}`}
                  >
                    {STATUS_LABELS[v.status]}
                  </span>
                </td>
                <td className="p-3 text-brand-blue-900">
                  {formatDateEs(v.periodStart.toISOString().slice(0, 10))} —{" "}
                  {formatDateEs(v.periodEnd.toISOString().slice(0, 10))}
                </td>
                <td className="p-3 text-brand-blue-700">
                  {formatDateTimeEs(v.createdAt.toISOString())}
                </td>
                <td className="p-3 text-brand-blue-700">
                  {v.publishedAt ? formatDateTimeEs(v.publishedAt.toISOString()) : "—"}
                </td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/admin/calendar/${v.id}`}
                      className="tap-target rounded-lg border border-brand-blue-200 px-3 py-1.5 text-brand-blue-900 hover:bg-brand-blue-50"
                    >
                      Ver
                    </Link>
                    {v.status === "archived" && (
                      <RestoreVersionButton versionId={v.id} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
