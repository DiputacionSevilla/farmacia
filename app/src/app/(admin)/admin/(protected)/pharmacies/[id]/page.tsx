import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PharmacyForm, type PharmacyFormValues } from "@/components/admin/PharmacyForm";
import { DeactivatePharmacyButton } from "@/components/admin/DeactivatePharmacyButton";

export default async function EditPharmacyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id },
    include: { openingHourRules: true },
  });
  if (!pharmacy) notFound();

  const rulesByWeekday: PharmacyFormValues["rulesByWeekday"] = {};
  for (const rule of pharmacy.openingHourRules) {
    const list = rulesByWeekday[rule.weekday] ?? [];
    list.push({ opensAt: rule.opensAt, closesAt: rule.closesAt });
    rulesByWeekday[rule.weekday] = list;
  }

  const values: PharmacyFormValues = {
    id: pharmacy.id,
    displayName: pharmacy.displayName,
    officialName: pharmacy.officialName,
    ownerName: pharmacy.ownerName ?? "",
    address: pharmacy.address,
    postalCode: pharmacy.postalCode ?? "",
    municipality: pharmacy.municipality,
    phone: pharmacy.phone ?? "",
    latitude: pharmacy.latitude?.toString() ?? "",
    longitude: pharmacy.longitude?.toString() ?? "",
    active: pharmacy.active,
    verificationStatus: pharmacy.verificationStatus,
    rulesByWeekday,
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-blue-900">
          {pharmacy.displayName}
        </h1>
        {pharmacy.active && <DeactivatePharmacyButton pharmacyId={pharmacy.id} />}
      </div>
      <PharmacyForm values={values} />
    </div>
  );
}
