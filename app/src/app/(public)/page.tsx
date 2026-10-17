import Link from "next/link";
import { getOpenNow } from "@/lib/queries";
import { PharmacyCard } from "@/components/PharmacyCard";
import { InstallPrompt } from "@/components/InstallPrompt";
import { formatDateTimeEs, formatDateEs } from "@/lib/format";
import { nowInAppZone } from "@/lib/temporal-engine";

// Datos en tiempo real (RF001): nunca prerenderizar estáticamente.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const result = await getOpenNow();
  const now = nowInAppZone();

  const dutyCards = result.cards.filter((c) => c.reasons.includes("duty"));
  const ordinaryOnlyCards = result.cards.filter(
    (c) => !c.reasons.includes("duty")
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <section aria-labelledby="abiertas-ahora-heading">
        <p className="text-sm text-brand-blue-700">
          {now.setLocale("es").toFormat("cccc, d 'de' LLLL 'de' yyyy — HH:mm")}{" "}
          (hora de España peninsular)
        </p>
        <h1
          id="abiertas-ahora-heading"
          className="mt-1 text-2xl font-bold text-brand-blue-900 sm:text-3xl"
        >
          Farmacias abiertas ahora
        </h1>

        {!result.dataVersion && (
          <p
            role="alert"
            className="mt-3 rounded-lg bg-status-warn-bg px-4 py-3 text-sm font-medium text-status-warn"
          >
            No hay ningún calendario de guardias publicado todavía. En
            cuanto el Ayuntamiento lo publique aparecerá aquí.
          </p>
        )}
        {result.dataVersion && result.calendarExpired && (
          <p
            role="alert"
            className="mt-3 rounded-lg bg-status-warn-bg px-4 py-3 text-sm font-medium text-status-warn"
          >
            El calendario de guardias publicado cubre hasta el{" "}
            {result.periodEnd && formatDateEs(result.periodEnd)} y ya ha
            caducado. No se muestra ninguna guardia hasta que se publique un
            nuevo periodo.
          </p>
        )}

        {result.cards.length === 0 && result.dataVersion && !result.calendarExpired && (
          <p className="mt-6 rounded-lg border border-brand-blue-100 bg-white px-4 py-6 text-center text-brand-blue-800">
            No hay farmacias con horario confirmado abierto en este momento.
            Consulta la farmacia de guardia en{" "}
            <Link href="/hoy" className="underline">
              la vista de hoy
            </Link>
            .
          </p>
        )}

        {dutyCards.length > 0 && (
          <div className="mt-5">
            <h2 className="text-lg font-semibold text-brand-blue-900">
              De guardia
            </h2>
            <ul className="mt-2 grid gap-3 sm:grid-cols-2">
              {dutyCards.map((card) => (
                <PharmacyCard key={card.pharmacyId ?? card.displayName} card={card} />
              ))}
            </ul>
          </div>
        )}

        {ordinaryOnlyCards.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-brand-blue-900">
              Resto de farmacias abiertas en Mairena del Alcor
            </h2>
            <ul className="mt-2 grid gap-3 sm:grid-cols-2">
              {ordinaryOnlyCards.map((card) => (
                <PharmacyCard key={card.pharmacyId ?? card.displayName} card={card} />
              ))}
            </ul>
          </div>
        )}
      </section>

      <nav aria-label="Accesos rápidos" className="mt-8 grid grid-cols-3 gap-3">
        <Link
          href="/hoy"
          className="tap-target flex flex-col items-center justify-center rounded-xl border border-brand-blue-100 bg-white py-4 text-center font-medium text-brand-blue-900 hover:border-brand-orange-400"
        >
          Hoy
        </Link>
        <Link
          href="/semana"
          className="tap-target flex flex-col items-center justify-center rounded-xl border border-brand-blue-100 bg-white py-4 text-center font-medium text-brand-blue-900 hover:border-brand-orange-400"
        >
          Semana
        </Link>
        <Link
          href="/mes"
          className="tap-target flex flex-col items-center justify-center rounded-xl border border-brand-blue-100 bg-white py-4 text-center font-medium text-brand-blue-900 hover:border-brand-orange-400"
        >
          Mes
        </Link>
      </nav>

      <InstallPrompt />

      <footer className="mt-8 rounded-xl bg-brand-blue-50 p-4 text-xs text-brand-blue-800">
        <p>
          Servicio informativo municipal basado en el calendario oficial del
          Real e Ilustre Colegio Oficial de Farmacéuticos de Sevilla.
          {result.periodStart && result.periodEnd && (
            <>
              {" "}
              Periodo cubierto: {formatDateEs(result.periodStart)} a{" "}
              {formatDateEs(result.periodEnd)}.
            </>
          )}
        </p>
        <p className="mt-1">
          <Link href="/acerca-de-los-datos" className="underline">
            Acerca de los datos
          </Link>
          {" · "}
          Consulta generada: {formatDateTimeEs(now.toISO()!)}
        </p>
      </footer>
    </div>
  );
}
