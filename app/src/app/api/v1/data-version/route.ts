import { NextResponse } from "next/server";
import { getPublishedCalendarVersion } from "@/lib/queries";

// Datos en tiempo real: nunca prerenderizar estaticamente.
export const dynamic = "force-dynamic";

export async function GET() {
  const version = await getPublishedCalendarVersion();
  return NextResponse.json({
    dataVersion: version?.id ?? null,
    publishedAt: version?.publishedAt ?? null,
  });
}
