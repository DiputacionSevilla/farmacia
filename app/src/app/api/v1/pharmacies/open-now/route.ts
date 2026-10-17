import { NextResponse } from "next/server";
import { getOpenNow } from "@/lib/queries";
import { APP_TIMEZONE, nowInAppZone } from "@/lib/temporal-engine";

// Datos en tiempo real: nunca prerenderizar estaticamente.
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getOpenNow();
  return NextResponse.json({
    effectiveTime: nowInAppZone().toISO(),
    timezone: APP_TIMEZONE,
    dutyContext: result.dutyContext,
    dataVersion: result.dataVersion,
    periodStart: result.periodStart,
    periodEnd: result.periodEnd,
    calendarExpired: result.calendarExpired,
    pharmacies: result.cards,
  });
}
