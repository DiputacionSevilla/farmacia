import Link from "next/link";
import type { DutyDisplay } from "@/lib/queries";
import { formatPhoneEs, mapsHref, telHref } from "@/lib/format";

export function DutyShiftCard({
  label,
  hours,
  duty,
}: {
  label: string;
  hours: string;
  duty: DutyDisplay | null;
}) {
  if (!duty) {
    return (
      <div className="rounded-xl border border-dashed border-brand-blue-200 bg-brand-blue-50 p-4 text-sm text-brand-blue-700">
        <p className="font-semibold text-brand-blue-900">
          {label} <span className="font-normal">({hours})</span>
        </p>
        <p className="mt-1">Sin datos para esta fecha.</p>
      </div>
    );
  }

  const phoneHref = telHref(duty.phone);
  const maps = mapsHref({ address: duty.address, municipality: duty.municipality });

  return (
    <div className="rounded-xl border border-brand-orange-300 bg-brand-orange-50 p-4">
      <p className="text-sm font-semibold text-brand-orange-700">
        {label} <span className="font-normal">({hours})</span>
      </p>
      <p className="mt-1 font-semibold text-brand-blue-900">
        {duty.pharmacyId ? (
          <Link href={`/farmacia/${duty.pharmacyId}`} className="hover:underline">
            {duty.name}
          </Link>
        ) : (
          duty.name
        )}
      </p>
      <p className="text-sm text-brand-blue-800">
        {duty.address}
        {duty.outOfTown ? `, ${duty.municipality}` : ""}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {phoneHref && (
          <a
            href={phoneHref}
            className="tap-target inline-flex items-center gap-1.5 rounded-lg bg-brand-blue-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-blue-800"
          >
            ☎ {formatPhoneEs(duty.phone)}
          </a>
        )}
        <a
          href={maps}
          target="_blank"
          rel="noopener noreferrer"
          className="tap-target inline-flex items-center gap-1.5 rounded-lg border border-brand-orange-500 px-3 py-1.5 text-sm font-medium text-brand-orange-700 hover:bg-white"
        >
          📍 Cómo llegar
        </a>
      </div>
    </div>
  );
}
