"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

function readIntervals(formData: FormData) {
  const rules: Array<{ weekday: number; opensAt: string; closesAt: string }> = [];
  for (const weekday of WEEKDAYS) {
    for (const slot of ["1", "2"]) {
      const opensAt = String(formData.get(`opens_${weekday}_${slot}`) ?? "").trim();
      const closesAt = String(formData.get(`closes_${weekday}_${slot}`) ?? "").trim();
      if (opensAt && closesAt) {
        rules.push({ weekday, opensAt, closesAt });
      }
    }
  }
  return rules;
}

export interface PharmacyFormState {
  error: string | null;
}

export async function savePharmacyAction(
  pharmacyId: string | null,
  _prevState: PharmacyFormState,
  formData: FormData
): Promise<PharmacyFormState> {
  const session = await requireContentAdmin();

  const displayName = String(formData.get("displayName") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const municipality = String(formData.get("municipality") ?? "").trim();
  if (!displayName || !address || !municipality) {
    return { error: "Nombre, dirección y municipio son obligatorios." };
  }

  const data = {
    displayName,
    officialName: String(formData.get("officialName") ?? displayName).trim(),
    ownerName: String(formData.get("ownerName") ?? "").trim() || null,
    address,
    postalCode: String(formData.get("postalCode") ?? "").trim() || null,
    municipality,
    phone: String(formData.get("phone") ?? "").trim() || null,
    latitude: formData.get("latitude") ? Number(formData.get("latitude")) : null,
    longitude: formData.get("longitude") ? Number(formData.get("longitude")) : null,
    active: formData.get("active") === "on",
  };

  const markConfirmed = formData.get("markConfirmed") === "on";
  const confirmedExtra = markConfirmed
    ? {
        verificationStatus: "confirmed" as const,
        verifiedAt: new Date(),
        verifiedBy: session.name,
      }
    : {};

  const rules = readIntervals(formData);

  let pharmacy;
  if (pharmacyId) {
    pharmacy = await prisma.pharmacy.update({
      where: { id: pharmacyId },
      data: { ...data, ...confirmedExtra },
    });
    await prisma.openingHourRule.deleteMany({ where: { pharmacyId } });
  } else {
    pharmacy = await prisma.pharmacy.create({
      data: {
        ...data,
        sourceType: "revision_municipal",
        sourceReference: `Alta manual por ${session.name}`,
        ...confirmedExtra,
      },
    });
  }

  if (rules.length > 0) {
    await prisma.openingHourRule.createMany({
      data: rules.map((r) => ({
        pharmacyId: pharmacy.id,
        weekday: r.weekday,
        opensAt: r.opensAt,
        closesAt: r.closesAt,
        validFrom: new Date(),
        season: "all_year" as const,
      })),
    });
  }

  await recordAuditEvent({
    userId: session.sub,
    action: pharmacyId ? "pharmacy_updated" : "pharmacy_created",
    entityType: "Pharmacy",
    entityId: pharmacy.id,
    result: "success",
    after: data,
  });

  revalidatePath("/admin/pharmacies");
  revalidatePath("/");
  redirect("/admin/pharmacies");
}

export async function deactivatePharmacyAction(pharmacyId: string) {
  const session = await requireContentAdmin();
  await prisma.pharmacy.update({
    where: { id: pharmacyId },
    data: { active: false },
  });
  await recordAuditEvent({
    userId: session.sub,
    action: "pharmacy_deactivated",
    entityType: "Pharmacy",
    entityId: pharmacyId,
    result: "success",
  });
  revalidatePath("/admin/pharmacies");
  revalidatePath("/");
}
