import type { Metadata } from "next";
import Link from "next/link";
import { DateTime } from "luxon";
import { getDutySchedule, getHolidays, getPublishedCalendarVersion } from "@/lib/queries";
import { APP_TIMEZONE, nowInAppZone } from "@/lib/temporal-engine";

// Datos en tiempo real: nunca prerenderizar estaticamente.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Mes" };

const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

export default async function MonthPage({
  params,
}: {
  params: Promise<{ ym?: string[] }>;
}) {
  const { ym } = await params;
  const today = nowInAppZone();
  const year = ym?.[0] ? Number(ym[0]) : today.year;
  const month = ym?.[1] ? Number(ym[1]) : today.month;

  const monthStart = DateTime.fromObject(
    { year, month, day: 1 },
    { zone: APP_TIMEZONE }
  );
  const monthEnd = monthStart.endOf("month");
  const gridStart = monthStart.minus({ days: monthStart.weekday - 1 });
  const gridEnd = monthEnd.plus({ days: 7 - monthEnd.weekday });

  const [schedule, holidays, version] = await Promise.all([
    getDutySchedule(gridStart.toISODate()!, gridEnd.toISODate()!),
    getHolidays(),
    getPublishedCalendarVersion(),
  ]);
  const scheduleByDate = new Map(schedule.map((d) => [d.date, d]));
  const holidaySet = new Set(holidays.map((h) => h.date));
  const periodStart = version
    ? DateTime.fromJSDate(version.periodStart, { zone: "utc" }).toISODate()
    : null;
  const periodEnd = version
    ? DateTime.fromJSDate(version.periodEnd, { zone: "utc" }).toISODate()
    : null;

  const days: DateTime[] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    days.push(cursor);
    cursor = cursor.plus({ days: 1 });
  }

  const prevMonth = monthStart.minus({ months: 1 });
  const nextMonth = monthStart.plus({ months: 1 });
  const todayIso = today.toISODate();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-bold text-brand-blue-900 capitalize">
        {monthStart.setLocale("es").toFormat("LLLL yyyy")}
      </h1>

      <nav
        aria-label="Navegación entre meses"
        className="mt-3 flex items-center justify-between"
      >
        <Link
          href={`/mes/${prevMonth.year}/${prevMonth.month}`}
          className="tap-target rounded-lg border border-brand-blue-200 px-3 py-2 text-sm font-medium text-brand-blue-900 hover:bg-brand-blue-50"
        >
          ← Mes anterior
        </Link>
        <Link
          href={`/mes/${nextMonth.year}/${nextMonth.month}`}
          className="tap-target rounded-lg border border-brand-blue-200 px-3 py-2 text-sm font-medium text-brand-blue-900 hover:bg-brand-blue-50"
        >
          Mes siguiente →
        </Link>
      </nav>

      <div
        role="grid"
        aria-label="Calendario de guardias"
        className="mt-4 grid grid-cols-7 gap-1 text-center text-xs"
      >
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="py-1 font-semibold text-brand-blue-700">
            {w}
          </div>
        ))}
        {days.map((day) => {
          const iso = day.toISODate()!;
          const inMonth = day.month === month;
          const hasData =
            periodStart !== null &&
            periodEnd !== null &&
            iso >= periodStart &&
            iso <= periodEnd;
          const dutyInfo = scheduleByDate.get(iso);
          const isToday = iso === todayIso;
          const isHoliday = holidaySet.has(iso);

          return (
            <Link
              key={iso}
              href={`/hoy?date=${iso}`}
              aria-label={`${day.setLocale("es").toFormat("d 'de' LLLL")}${isHoliday ? ", festivo" : ""}${hasData ? "" : ", sin datos de guardia"}`}
              className={`tap-target flex min-h-16 flex-col items-center justify-start gap-0.5 rounded-lg border p-1 text-brand-blue-900 ${
                inMonth
                  ? "border-brand-blue-100 bg-white"
                  : "border-transparent bg-brand-blue-50 text-brand-blue-400"
              } ${isToday ? "ring-2 ring-brand-orange-500" : ""}`}
            >
              <span className="text-sm font-semibold">{day.day}</span>
              {isHoliday && (
                <span className="text-[10px] font-medium text-brand-orange-700">
                  Festivo
                </span>
              )}
              {inMonth && !hasData && (
                <span className="text-[10px] text-brand-blue-400">Sin datos</span>
              )}
              {dutyInfo?.day && (
                <span
                  className="h-1.5 w-1.5 rounded-full bg-status-duty"
                  aria-hidden="true"
                />
              )}
            </Link>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-brand-blue-700">
        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-status-duty" />
        Día con guardia publicada.
        {periodStart && periodEnd && (
          <>
            {" "}
            Periodo con calendario disponible: {periodStart} a {periodEnd}.
          </>
        )}
      </p>
    </div>
  );
}
