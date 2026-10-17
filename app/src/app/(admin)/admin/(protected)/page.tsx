import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateEs } from "@/lib/format";

export default async function AdminDashboardPage() {
  const [published, candidate, pendingPharmacies, totalPharmacies, holidayCount] =
    await Promise.all([
      prisma.dutyCalendarVersion.findFirst({ where: { status: "published" } }),
      prisma.dutyCalendarVersion.findFirst({
        where: { status: "candidate" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.pharmacy.count({ where: { verificationStatus: "pending", active: true } }),
      prisma.pharmacy.count({ where: { active: true } }),
      prisma.holiday.count(),
    ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-blue-900">
        Panel de estado
      </h1>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-brand-blue-100 bg-white p-4">
          <h2 className="font-semibold text-brand-blue-900">
            Calendario de guardias
          </h2>
          {published ? (
            <p className="mt-2 text-sm text-brand-blue-800">
              Publicado hasta el{" "}
              {formatDateEs(published.periodEnd.toISOString().slice(0, 10))}.
            </p>
          ) : (
            <p className="mt-2 text-sm text-status-warn">
              No hay ninguna versión publicada.
            </p>
          )}
          {candidate && (
            <p className="mt-2 rounded-lg bg-brand-orange-100 px-2 py-1 text-sm text-brand-orange-700">
              Hay una versión candidata pendiente de revisión.
            </p>
          )}
          <Link
            href="/admin/calendar"
            className="mt-3 inline-block text-sm font-medium text-brand-blue-900 underline"
          >
            Ir al calendario →
          </Link>
        </div>

        <div className="rounded-xl border border-brand-blue-100 bg-white p-4">
          <h2 className="font-semibold text-brand-blue-900">Directorio</h2>
          <p className="mt-2 text-sm text-brand-blue-800">
            {totalPharmacies} farmacias activas, {pendingPharmacies} con
            horario pendiente de confirmar.
          </p>
          <Link
            href="/admin/pharmacies"
            className="mt-3 inline-block text-sm font-medium text-brand-blue-900 underline"
          >
            Gestionar farmacias →
          </Link>
        </div>

        <div className="rounded-xl border border-brand-blue-100 bg-white p-4">
          <h2 className="font-semibold text-brand-blue-900">Festivos</h2>
          <p className="mt-2 text-sm text-brand-blue-800">
            {holidayCount} festivos registrados.
          </p>
          <Link
            href="/admin/holidays"
            className="mt-3 inline-block text-sm font-medium text-brand-blue-900 underline"
          >
            Gestionar festivos →
          </Link>
        </div>
      </div>
    </div>
  );
}
