import { NextResponse } from "next/server";
import { getDutySchedule } from "@/lib/queries";
import { nowInAppZone } from "@/lib/temporal-engine";

// Datos en tiempo real: nunca prerenderizar estaticamente.
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const today = nowInAppZone().toISODate()!;
  const fromDate = from && DATE_RE.test(from) ? from : today;
  const toDate =
    to && DATE_RE.test(to) ? to : nowInAppZone().plus({ days: 6 }).toISODate()!;

  if (fromDate > toDate) {
    return NextResponse.json(
      { error: "invalid_range", message: "'from' debe ser anterior a 'to'." },
      { status: 400 }
    );
  }

  const schedule = await getDutySchedule(fromDate, toDate);
  return NextResponse.json({ from: fromDate, to: toDate, days: schedule });
}
