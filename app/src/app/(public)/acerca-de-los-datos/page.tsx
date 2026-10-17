import type { Metadata } from "next";
import { getPublishedCalendarVersion } from "@/lib/queries";
import { formatDateEs } from "@/lib/format";

// Datos en tiempo real: nunca prerenderizar estaticamente.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Acerca de los datos" };

export default async function AboutDataPage() {
  const version = await getPublishedCalendarVersion();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 prose-sm">
      <h1 className="text-2xl font-bold text-brand-blue-900">
        Acerca de los datos
      </h1>

      <p className="mt-4 text-brand-blue-900">
        Este es un <strong>servicio informativo municipal</strong> del
        Ayuntamiento de Mairena del Alcor, basado en las siguientes fuentes
        oficiales. No sustituye la información publicada por el Colegio
        Oficial de Farmacéuticos de Sevilla, que prevalece en caso de
        discrepancia.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-brand-blue-900">
        Fuentes de información
      </h2>
      <ul className="mt-2 list-disc space-y-2 pl-5 text-brand-blue-800">
        <li>
          <strong>Calendario de guardias:</strong> publicado por el Real e
          Ilustre Colegio Oficial de Farmacéuticos de Sevilla.{" "}
          {version && (
            <a
              href={version.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Ver PDF oficial vigente
            </a>
          )}
        </li>
        <li>
          <strong>Horarios ordinarios:</strong> directorio municipal,
          verificado por el Ayuntamiento o directamente por cada farmacia.
          Un horario pendiente de confirmar nunca se muestra como
          &quot;abierta&quot;.
        </li>
        <li>
          <strong>Festivos:</strong> Boletín Oficial del Estado (BOE),
          Boletín Oficial de la Junta de Andalucía (BOJA) y Boletín Oficial
          de la Provincia de Sevilla (BOP) para las fiestas locales de
          Mairena del Alcor.
        </li>
      </ul>

      {version && (
        <>
          <h2 className="mt-6 text-lg font-semibold text-brand-blue-900">
            Vigencia del calendario actual
          </h2>
          <p className="mt-2 text-brand-blue-800">
            Periodo cubierto: {formatDateEs(
              version.periodStart.toISOString().slice(0, 10)
            )}{" "}
            a {formatDateEs(version.periodEnd.toISOString().slice(0, 10))}.
            <br />
            Publicado el{" "}
            {version.publishedAt &&
              formatDateEs(version.publishedAt.toISOString().slice(0, 10))}
            .
          </p>
        </>
      )}

      <h2 className="mt-6 text-lg font-semibold text-brand-blue-900">
        Limitaciones
      </h2>
      <ul className="mt-2 list-disc space-y-2 pl-5 text-brand-blue-800">
        <li>
          No se muestran guardias fuera del periodo publicado en el PDF
          oficial.
        </li>
        <li>
          No se muestra como abierta una farmacia con horario no verificado.
        </li>
        <li>
          Ante cualquier discrepancia, prevalece siempre la información
          oficial del Colegio de Farmacéuticos.
        </li>
      </ul>

      <h2 className="mt-6 text-lg font-semibold text-brand-blue-900">
        ¿Has detectado un error?
      </h2>
      <p className="mt-2 text-brand-blue-800">
        Puedes comunicarlo a{" "}
        <a href="mailto:informacion@mairenadelalcor.org" className="underline">
          informacion@mairenadelalcor.org
        </a>
        .
      </p>
    </div>
  );
}
