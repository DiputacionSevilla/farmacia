import { prisma } from "@/lib/prisma";
import { formatDateEs } from "@/lib/format";
import { HolidayForm } from "@/components/admin/HolidayForm";
import { DeleteHolidayButton } from "@/components/admin/DeleteHolidayButton";

const SCOPE_LABELS: Record<string, string> = {
  national: "Nacional",
  regional: "Autonómico",
  local: "Local",
};

export default async function AdminHolidaysPage() {
  const holidays = await prisma.holiday.findMany({ orderBy: { date: "asc" } });

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-blue-900">Festivos</h1>
      <p className="mt-1 text-sm text-brand-blue-700">
        No se emplea ninguna API comercial como única fuente: cada festivo
        debe referenciar su publicación oficial (BOE, BOJA o BOP).
      </p>

      <div className="mt-4">
        <HolidayForm />
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-brand-blue-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand-blue-50 text-brand-blue-700">
            <tr>
              <th className="p-3">Fecha</th>
              <th className="p-3">Nombre</th>
              <th className="p-3">Ámbito</th>
              <th className="p-3">Fuente</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-blue-100">
            {holidays.map((h) => (
              <tr key={h.id}>
                <td className="p-3 text-brand-blue-900">
                  {formatDateEs(h.date.toISOString().slice(0, 10))}
                </td>
                <td className="p-3 text-brand-blue-900">{h.name}</td>
                <td className="p-3 text-brand-blue-700">{SCOPE_LABELS[h.scope]}</td>
                <td className="p-3">
                  {h.officialSourceUrl ? (
                    <a
                      href={h.officialSourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-blue-900 underline"
                    >
                      Ver
                    </a>
                  ) : (
                    <span className="text-brand-blue-400">—</span>
                  )}
                </td>
                <td className="p-3 text-right">
                  <DeleteHolidayButton holidayId={h.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
