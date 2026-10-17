import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { getDutySchedule, getHolidays } from "@/lib/queries";
import { APP_TIMEZONE } from "@/lib/temporal-engine";

// Datos en tiempo real: nunca prerenderizar estaticamente.
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ year: string; month: string }> }
) {
  const { year, month } = await params;
  const y = Number(year);
  const m = Number(month);
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }

  const start = DateTime.fromObject({ year: y, month: m, day: 1 }, { zone: APP_TIMEZONE });
  const end = start.endOf("month");

  const [schedule, holidays] = await Promise.all([
    getDutySchedule(start.toISODate()!, end.toISODate()!),
    getHolidays(),
  ]);

  const holidaySet = new Set(
    holidays
      .filter((h) => h.date >= start.toISODate()! && h.date <= end.toISODate()!)
      .map((h) => h.date)
  );

  return NextResponse.json({
    year: y,
    month: m,
    days: schedule.map((d) => ({ ...d, isHoliday: holidaySet.has(d.date) })),
  });
}
