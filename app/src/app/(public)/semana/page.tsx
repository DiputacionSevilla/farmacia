import type { Metadata } from "next";
import Link from "next/link";
import { DateTime } from "luxon";
import {
  getActivePharmaciesWithSchedule,
  getDutySchedule,
  getHolidays,
  resolveDutyDisplay,
} from "@/lib/queries";
import { APP_TIMEZONE, nowInAppZone } from "@/lib/temporal-engine";
import { formatDateEs } from "@/lib/format";

// Datos en tiempo real: nunca prerenderizar estaticamente.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Semana" };

function startOfIsoWeek(date: DateTime): DateTime {
  return date.minus({ days: date.weekday - 1 }).startOf("day");
}

export default async function WeekPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  const { start: startParam } = await searchParams;
  const today = nowInAppZone();
  const weekStart = startParam
    ? startOfIsoWeek(DateTime.fromISO(startParam, { zone: APP_TIMEZONE }))
    : startOfIsoWeek(today);
  const weekEnd = weekStart.plus({ days: 6 });

  const [schedule, pharmacies, holidays] = await Promise.all([
    getDutySchedule(weekStart.toISODate()!, weekEnd.toISODate()!),
    getActivePharmaciesWithSchedule(),
    getHolidays(),
  ]);
  const pharmaciesById = new Map(pharmacies.map((p) => [p.id, p]));
  const holidaySet = new Set(holidays.map((h) => h.date));

  const prevWeek = weekStart.minus({ weeks: 1 }).toISODate();
  const nextWeek = weekStart.plus({ weeks: 1 }).toISODate();
  const todayIso = today.toISODate();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-bold text-brand-blue-900">Semana</h1>
      <p className="text-sm text-brand-blue-700">
        {formatDateEs(weekStart.toISODate()!)} – {formatDateEs(weekEnd.toISODate()!)}
      </p>

      <nav
        aria-label="Navegación entre semanas"
        className="mt-3 flex items-center justify-between"
      >
        <Link
          href={`/semana?start=${prevWeek}`}
          className="tap-target rounded-lg border border-brand-blue-200 px-3 py-2 text-sm font-medium text-brand-blue-900 hover:bg-brand-blue-50"
        >
          ← Semana anterior
        </Link>
        <Link
          href={`/semana?start=${nextWeek}`}
          className="tap-target rounded-lg border border-brand-blue-200 px-3 py-2 text-sm font-medium text-brand-blue-900 hover:bg-brand-blue-50"
        >
          Semana siguiente →
        </Link>
      </nav>

      <ul className="mt-4 divide-y divide-brand-blue-100 rounded-xl border border-brand-blue-100 bg-white">
        {schedule.map((day) => {
          const dayDuty = resolveDutyDisplay(day.day, pharmaciesById);
          const nightDuty = resolveDutyDisplay(day.night, pharmaciesById);
          const isToday = day.date === todayIso;
          const isHoliday = holidaySet.has(day.date);
          const label = DateTime.fromISO(day.date, { zone: APP_TIMEZONE })
            .setLocale("es")
            .toFormat("cccc d 'de' LLLL");

          return (
            <li key={day.date} className="p-4">
              <Link
                href={`/hoy?date=${day.date}`}
                className="flex flex-wrap items-center gap-2 font-semibold text-brand-blue-900 hover:underline"
              >
                <span className="capitalize">{label}</span>
                {isToday && (
                  <span className="rounded-full bg-brand-blue-900 px-2 py-0.5 text-xs font-semibold text-white">
                    Hoy
                  </span>
                )}
                {isHoliday && (
                  <span className="rounded-full bg-brand-orange-100 px-2 py-0.5 text-xs font-semibold text-brand-orange-700">
                    Festivo
                  </span>
                )}
              </Link>
              <dl className="mt-2 grid gap-1 text-sm text-brand-blue-800 sm:grid-cols-2">
                <div>
                  <dt className="font-medium text-brand-blue-700">
                    Guardia diurna
                  </dt>
                  <dd>{dayDuty ? dayDuty.name : "Sin datos"}</dd>
                </div>
                <div>
                  <dt className="font-medium text-brand-blue-700">
                    Guardia nocturna
                  </dt>
                  <dd>{nightDuty ? nightDuty.name : "Sin datos"}</dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
