import Link from "next/link";
import type { OpenNowCard } from "@/lib/temporal-engine";
import { formatPhoneEs, formatTimeEs, mapsHref, telHref } from "@/lib/format";

function StatusBadge({ reason }: { reason: "ordinary" | "duty" }) {
  if (reason === "duty") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-status-duty-bg px-2.5 py-1 text-xs font-semibold text-status-duty">
        <span aria-hidden="true">●</span> De guardia
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-status-open-bg px-2.5 py-1 text-xs font-semibold text-status-open">
      <span aria-hidden="true">●</span> Horario ordinario
    </span>
  );
}

export function PharmacyCard({ card }: { card: OpenNowCard }) {
  const phoneHref = telHref(card.phone);
  const maps = mapsHref({
    address: card.address,
    municipality: card.municipality,
    latitude: card.latitude,
    longitude: card.longitude,
  });

  const closingInfo = card.reasons.includes("duty")
    ? card.dutyWindow &&
      `Guardia ${card.dutyShiftType === "day" ? "diurna" : "nocturna"} hasta las ${formatTimeEs(
        card.dutyWindow.endsAt
      )}`
    : card.closesAt && card.closesAt !== "24:00"
      ? `Cierra a las ${card.closesAt}`
      : card.closesAt === "24:00"
        ? "Abierta las 24 horas"
        : null;

  const name = card.pharmacyId ? (
    <Link
      href={`/farmacia/${card.pharmacyId}`}
      className="font-semibold text-brand-blue-900 underline-offset-4 hover:underline"
    >
      {card.displayName}
    </Link>
  ) : (
    <span className="font-semibold text-brand-blue-900">
      {card.displayName}
    </span>
  );

  return (
    <li className="rounded-xl border border-brand-blue-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          {name}
          <p className="text-sm text-brand-blue-800">
            {card.address}
            {card.outOfTown ? `, ${card.municipality}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {card.reasons.map((reason) => (
            <StatusBadge key={reason} reason={reason} />
          ))}
        </div>
      </div>

      {closingInfo && (
        <p className="mt-2 text-sm text-brand-blue-700">{closingInfo}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {phoneHref && (
          <a
            href={phoneHref}
            className="tap-target inline-flex items-center gap-1.5 rounded-lg bg-brand-blue-900 px-3 py-2 text-sm font-medium text-white hover:bg-brand-blue-800"
          >
            <span aria-hidden="true">☎</span>
            Llamar{formatPhoneEs(card.phone) ? ` ${formatPhoneEs(card.phone)}` : ""}
          </a>
        )}
        <a
          href={maps}
          target="_blank"
          rel="noopener noreferrer"
          className="tap-target inline-flex items-center gap-1.5 rounded-lg border border-brand-orange-500 px-3 py-2 text-sm font-medium text-brand-orange-700 hover:bg-brand-orange-50"
        >
          <span aria-hidden="true">📍</span>
          Cómo llegar
        </a>
      </div>
    </li>
  );
}
