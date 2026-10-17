import type { Metadata } from "next";

export const metadata: Metadata = { title: "Aviso legal" };

export default function LegalNoticePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold text-brand-blue-900">Aviso legal</h1>

      <h2 className="mt-6 text-lg font-semibold text-brand-blue-900">
        Titularidad
      </h2>
      <p className="mt-2 text-brand-blue-800">
        Este sitio web es un servicio informativo del Ayuntamiento de
        Mairena del Alcor (Sevilla).
      </p>

      <h2 className="mt-6 text-lg font-semibold text-brand-blue-900">
        Naturaleza del servicio
      </h2>
      <p className="mt-2 text-brand-blue-800">
        Se trata de un <strong>servicio informativo municipal basado en la
        fuente oficial indicada</strong>, no de un dato oficial verificado
        en tiempo real por el Ayuntamiento. En caso de discrepancia,
        prevalece siempre la información publicada por el Real e Ilustre
        Colegio Oficial de Farmacéuticos de Sevilla.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-brand-blue-900">
        Responsabilidad
      </h2>
      <p className="mt-2 text-brand-blue-800">
        El Ayuntamiento revisa y actualiza periódicamente la información,
        pero no puede garantizar su exactitud absoluta en cada instante. Ante
        una urgencia, se recomienda confirmar telefónicamente o acudir
        directamente al servicio de guardia indicado.
      </p>
    </div>
  );
}
