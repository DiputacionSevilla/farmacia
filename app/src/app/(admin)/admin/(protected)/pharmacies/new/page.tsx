import { PharmacyForm, type PharmacyFormValues } from "@/components/admin/PharmacyForm";

const emptyValues: PharmacyFormValues = {
  displayName: "",
  officialName: "",
  ownerName: "",
  address: "",
  postalCode: "",
  municipality: "Mairena del Alcor",
  phone: "",
  latitude: "",
  longitude: "",
  active: true,
  verificationStatus: "pending",
  rulesByWeekday: {},
};

export default function NewPharmacyPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-blue-900">
        Añadir farmacia
      </h1>
      <PharmacyForm values={emptyValues} />
    </div>
  );
}
