import { NextResponse } from "next/server";
import { getPharmacyById } from "@/lib/queries";

// Datos en tiempo real: nunca prerenderizar estaticamente.
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pharmacy = await getPharmacyById(id);
  if (!pharmacy) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(pharmacy);
}
