import type { Metadata } from "next";
import {
  getActivePharmaciesWithSchedule,
  getDayDetail,
  resolveDutyDisplay,
} from "@/lib/queries";
import { DutyShiftCard } from "@/components/DutyShiftCard";
import { formatDateEs } from "@/lib/format";
import { nowInAppZone } from "@/lib/temporal-engine";

// Datos en tiempo real: nunca prerenderizar estaticamente.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Hoy" };

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: requestedDate } = await searchParams;
  const today = requestedDate ?? nowInAppZone().toISODate()!;
  const [detail, pharmacies] = await Promise.all([
    getDayDetail(today),
    getActivePharmaciesWithSchedule(),
  ]);
  const pharmaciesById = new Map(pharmacies.map((p) => [p.id, p]));

  const dayDuty = resolveDutyDisplay(detail.duty.day, pharmaciesById);
  const nightDuty = resolveDutyDisplay(detail.duty.night, pharmaciesById);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <p className="text-sm text-brand-blue-700">{formatDateEs(today)}</p>
      <h1 className="mt-1 text-2xl font-bold text-brand-blue-900">
        {requestedDate && requestedDate !== nowInAppZone().toISODate()
          ? "Guardia de ese día"
          : "Hoy"}
      </h1>

      {detail.isHoliday && (
        <p className="mt-2 inline-block rounded-full bg-brand-orange-100 px-3 py-1 text-sm font-medium text-brand-orange-700">
          Hoy es festivo
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <DutyShiftCard label="Guardia diurna" hours="9:30–22:00" duty={dayDuty} />
        <DutyShiftCard
          label="Guardia nocturna"
          hours="22:00–9:30"
          duty={nightDuty}
        />
      </div>

      <h2 className="mt-8 text-lg font-semibold text-brand-blue-900">
        Horario ordinario de hoy
      </h2>
      <ul className="mt-3 divide-y divide-brand-blue-100 rounded-xl border border-brand-blue-100 bg-white">
        {detail.pharmacyIntervals.map(({ pharmacy, intervals, confirmed }) => (
          <li key={pharmacy.id} className="p-4">
            <p className="font-semibold text-brand-blue-900">
              {pharmacy.displayName}
            </p>
            {!confirmed ? (
              <p className="text-sm text-brand-blue-600">
                Horario pendiente de confirmar
              </p>
            ) : intervals.length === 0 ? (
              <p className="text-sm text-brand-blue-600">Cerrada hoy</p>
            ) : (
              <p className="text-sm text-brand-blue-700">
                {intervals
                  .map((i) => `${i.opensAt}–${i.closesAt}`)
                  .join(" y ")}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
