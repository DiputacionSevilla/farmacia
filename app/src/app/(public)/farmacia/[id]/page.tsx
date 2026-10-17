import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPharmacyById } from "@/lib/queries";
import { formatDateEs, formatPhoneEs, mapsHref, telHref } from "@/lib/format";

// Datos en tiempo real: nunca prerenderizar estaticamente.
export const dynamic = "force-dynamic";

const WEEKDAY_NAMES = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pharmacy = await getPharmacyById(id);
  return { title: pharmacy?.displayName ?? "Farmacia" };
}

export default async function PharmacyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pharmacy = await getPharmacyById(id);
  if (!pharmacy) notFound();

  const phoneHref = telHref(pharmacy.phone);
  const maps = mapsHref({
    address: pharmacy.address,
    municipality: pharmacy.municipality,
    latitude: pharmacy.latitude,
    longitude: pharmacy.longitude,
  });

  const rulesByWeekday = new Map<number, typeof pharmacy.openingHourRules>();
  for (const rule of pharmacy.openingHourRules) {
    const list = rulesByWeekday.get(rule.weekday) ?? [];
    list.push(rule);
    rulesByWeekday.set(rule.weekday, list);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold text-brand-blue-900">
        {pharmacy.displayName}
      </h1>
      <p className="text-brand-blue-800">
        {pharmacy.address}, {pharmacy.municipality}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {phoneHref && (
          <a
            href={phoneHref}
            className="tap-target inline-flex items-center gap-1.5 rounded-lg bg-brand-blue-900 px-4 py-2 font-medium text-white hover:bg-brand-blue-800"
          >
            ☎ {formatPhoneEs(pharmacy.phone)}
          </a>
        )}
        <a
          href={maps}
          target="_blank"
          rel="noopener noreferrer"
          className="tap-target inline-flex items-center gap-1.5 rounded-lg border border-brand-orange-500 px-4 py-2 font-medium text-brand-orange-700 hover:bg-brand-orange-50"
        >
          📍 Cómo llegar
        </a>
      </div>

      <h2 className="mt-8 text-lg font-semibold text-brand-blue-900">
        Horario ordinario semanal
      </h2>
      {pharmacy.verificationStatus !== "confirmed" && (
        <p className="mt-1 rounded-lg bg-status-warn-bg px-3 py-2 text-sm text-status-warn">
          Este horario está pendiente de confirmación por una fuente
          fiable. No se muestra esta farmacia como abierta por horario
          ordinario hasta su verificación.
        </p>
      )}
      <ul className="mt-3 divide-y divide-brand-blue-100 rounded-xl border border-brand-blue-100 bg-white">
        {WEEKDAY_NAMES.map((name, idx) => {
          const weekday = idx + 1;
          const rules = rulesByWeekday.get(weekday) ?? [];
          return (
            <li key={weekday} className="flex justify-between p-3 text-sm">
              <span className="font-medium text-brand-blue-900">{name}</span>
              <span className="text-brand-blue-700">
                {rules.length === 0
                  ? "Cerrado"
                  : rules
                      .map((r) => `${r.opensAt}–${r.closesAt}`)
                      .join(" y ")}
              </span>
            </li>
          );
        })}
      </ul>

      {pharmacy.openingExceptions.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-semibold text-brand-blue-900">
            Horarios especiales conocidos
          </h2>
          <ul className="mt-3 divide-y divide-brand-blue-100 rounded-xl border border-brand-blue-100 bg-white">
            {pharmacy.openingExceptions.map((e) => (
              <li key={e.id} className="p-3 text-sm">
                <p className="font-medium text-brand-blue-900">
                  {formatDateEs(e.date.toISOString().slice(0, 10))}
                </p>
                <p className="text-brand-blue-700">
                  {e.type === "closed" && "Cerrado"}
                  {e.type === "open_all_day" && "Abierto todo el día"}
                  {e.type === "special_hours" &&
                    `${e.opensAt ?? "?"}–${e.closesAt ?? "?"}`}
                  {e.reason ? ` — ${e.reason}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      {pharmacy.verifiedAt && (
        <p className="mt-6 text-xs text-brand-blue-700">
          Última verificación del horario:{" "}
          {formatDateEs(pharmacy.verifiedAt.toISOString().slice(0, 10))}
        </p>
      )}
    </div>
  );
}
