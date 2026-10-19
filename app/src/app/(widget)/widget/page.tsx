import Image from "next/image";
import { getOpenNow } from "@/lib/queries";
import { WidgetRuntime } from "@/components/WidgetRuntime";
import {
  formatDateEs,
  formatPhoneEs,
  formatTimeEs,
  mapsHref,
  telHref,
} from "@/lib/format";
import { nowInAppZone, type OpenNowCard } from "@/lib/temporal-engine";

// Datos en tiempo real: nunca prerenderizar estáticamente.
export const dynamic = "force-dynamic";

const MAX_OTHERS = 4;

function dutyUntil(card: OpenNowCard): string | null {
  if (!card.dutyWindow) return null;
  const kind = card.dutyShiftType === "day" ? "diurna" : "nocturna";
  return `Guardia ${kind} hasta las ${formatTimeEs(card.dutyWindow.endsAt)}`;
}

function DutyCard({ card }: { card: OpenNowCard }) {
  const phone = telHref(card.phone);
  const maps = mapsHref({
    address: card.address,
    municipality: card.municipality,
    latitude: card.latitude,
    longitude: card.longitude,
  });
  return (
    <li className="rounded-xl border-2 border-brand-orange-400 bg-brand-orange-50 p-4">
      <p className="text-lg font-bold leading-tight text-brand-blue-900">
        {card.displayName}
      </p>
      <p className="mt-1 text-sm text-brand-blue-800">
        {card.address}
        {card.outOfTown ? `, ${card.municipality}` : ""}
      </p>
      {dutyUntil(card) && (
        <p className="mt-1 text-sm font-semibold text-brand-orange-700">
          {dutyUntil(card)}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {phone && (
          <a
            href={phone}
            target="_top"
            className="tap-target inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-blue-900 px-3 py-2 text-base font-semibold text-white hover:bg-brand-blue-800"
          >
            <span aria-hidden="true">☎</span>
            Llamar {formatPhoneEs(card.phone)}
          </a>
        )}
        <a
          href={maps}
          target="_blank"
          rel="noopener noreferrer"
          className="tap-target inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-brand-orange-500 bg-white px-3 py-2 text-base font-semibold text-brand-orange-700 hover:bg-brand-orange-50"
        >
          <span aria-hidden="true">📍</span>
          Cómo llegar
        </a>
      </div>
    </li>
  );
}

function OtherRow({ card }: { card: OpenNowCard }) {
  const phone = telHref(card.phone);
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-brand-blue-900">
          {card.displayName}
        </p>
        <p className="truncate text-xs text-brand-blue-700">
          {card.address}
          {card.closesAt && card.closesAt !== "24:00"
            ? ` · cierra a las ${card.closesAt}`
            : card.closesAt === "24:00"
              ? " · 24 horas"
              : ""}
        </p>
      </div>
      {phone && (
        <a
          href={phone}
          target="_top"
          aria-label={`Llamar a ${card.displayName}`}
          className="tap-target inline-flex shrink-0 items-center justify-center rounded-lg border border-brand-blue-100 px-3 text-sm font-medium text-brand-blue-900 hover:bg-brand-blue-50"
        >
          ☎ {formatPhoneEs(card.phone)}
        </a>
      )}
    </li>
  );
}

export default async function WidgetPage() {
  const result = await getOpenNow();
  const now = nowInAppZone();

  const duty = result.cards.filter((c) => c.reasons.includes("duty"));
  const others = result.cards.filter((c) => !c.reasons.includes("duty"));
  const hasCalendar = result.dataVersion && !result.calendarExpired;

  return (
    <div className="mx-auto max-w-xl p-3">
      <WidgetRuntime />
      <section
        aria-labelledby="widget-title"
        className="rounded-2xl border border-brand-blue-100 bg-white p-4 shadow-sm"
      >
        <div className="flex items-baseline justify-between gap-2">
          <h1
            id="widget-title"
            className="flex items-center gap-2 text-lg font-bold text-brand-blue-900"
          >
            <Image
              src="/escudo-mairena.webp"
              alt=""
              width={26}
              height={31}
              className="shrink-0"
            />
            Farmacia de guardia ahora
          </h1>
          <p className="shrink-0 text-xs text-brand-blue-700">
            {now.setLocale("es").toFormat("d LLL, HH:mm")}
          </p>
        </div>

        {!hasCalendar && (
          <p
            role="alert"
            className="mt-3 rounded-lg bg-status-warn-bg px-3 py-2 text-sm font-medium text-status-warn"
          >
            {result.calendarExpired
              ? `El calendario de guardias cubre hasta el ${
                  result.periodEnd ? formatDateEs(result.periodEnd) : "—"
                } y ha caducado. Consulta el calendario completo.`
              : "Calendario de guardias no disponible por el momento."}
          </p>
        )}

        {hasCalendar && duty.length === 0 && (
          <p className="mt-3 rounded-lg bg-brand-blue-50 px-3 py-2 text-sm text-brand-blue-800">
            No consta farmacia de guardia en este momento. Consulta el
            calendario completo.
          </p>
        )}

        {duty.length > 0 && (
          <ul className="mt-3 space-y-3">
            {duty.map((card) => (
              <DutyCard key={card.pharmacyId ?? card.displayName} card={card} />
            ))}
          </ul>
        )}

        {others.length > 0 && (
          <div className="mt-4">
            <h2 className="text-sm font-semibold text-brand-blue-900">
              También abiertas ahora
            </h2>
            <ul className="mt-1 divide-y divide-brand-blue-100">
              {others.slice(0, MAX_OTHERS).map((card) => (
                <OtherRow
                  key={card.pharmacyId ?? card.displayName}
                  card={card}
                />
              ))}
            </ul>
            {others.length > MAX_OTHERS && (
              <p className="mt-1 text-xs text-brand-blue-700">
                y {others.length - MAX_OTHERS} más en el calendario completo.
              </p>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-brand-blue-100 pt-3 text-sm">
          <a
            href="/"
            target="_blank"
            rel="noopener"
            className="font-semibold text-brand-blue-900 underline underline-offset-4"
          >
            Ver calendario completo
          </a>
          <p className="text-xs text-brand-blue-800">
            Urgencia vital:{" "}
            <a href="tel:112" target="_top" className="font-bold underline">
              112
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
