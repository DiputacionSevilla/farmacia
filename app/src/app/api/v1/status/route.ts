import { NextResponse } from "next/server";
import { getPublishedCalendarVersion } from "@/lib/queries";

// Datos en tiempo real: nunca prerenderizar estaticamente.
export const dynamic = "force-dynamic";

export async function GET() {
  const version = await getPublishedCalendarVersion();
  return NextResponse.json({
    status: "ok",
    calendarPublished: Boolean(version),
    periodStart: version?.periodStart ?? null,
    periodEnd: version?.periodEnd ?? null,
    publishedAt: version?.publishedAt ?? null,
  });
}
