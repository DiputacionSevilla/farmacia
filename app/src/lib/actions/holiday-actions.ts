"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession, hasRole } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";

async function requireContentAdmin() {
  const session = await getSession();
  if (!hasRole(session, ["content_admin", "tech_admin"])) {
    throw new Error("No autorizado.");
  }
  return session!;
}

export interface HolidayFormState {
  error: string | null;
}

export async function createHolidayAction(
  _prevState: HolidayFormState,
  formData: FormData
): Promise<HolidayFormState> {
  const session = await requireContentAdmin();

  const date = String(formData.get("date") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const scope = String(formData.get("scope") ?? "");
  const officialSourceUrl = String(formData.get("officialSourceUrl") ?? "").trim();

  if (!date || !name || !["national", "regional", "local"].includes(scope)) {
    return { error: "Fecha, nombre y ámbito son obligatorios." };
  }

  const holiday = await prisma.holiday.create({
    data: {
      date: new Date(`${date}T00:00:00Z`),
      name,
      scope: scope as "national" | "regional" | "local",
      municipality: scope === "local" ? "Mairena del Alcor" : null,
      officialSourceUrl: officialSourceUrl || null,
      verifiedAt: new Date(),
    },
  });

  await recordAuditEvent({
    userId: session.sub,
    action: "holiday_created",
    entityType: "Holiday",
    entityId: holiday.id,
    result: "success",
    after: { date, name, scope },
  });

  revalidatePath("/admin/holidays");
  revalidatePath("/");
  return { error: null };
}

export async function deleteHolidayAction(holidayId: string) {
  const session = await requireContentAdmin();
  await prisma.holiday.delete({ where: { id: holidayId } });
  await recordAuditEvent({
    userId: session.sub,
    action: "holiday_deleted",
    entityType: "Holiday",
    entityId: holidayId,
    result: "success",
  });
  revalidatePath("/admin/holidays");
  revalidatePath("/");
}
